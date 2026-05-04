/**
 * PostManager — central ingestion orchestrator.
 *
 * See `docs/ingestion-pipeline.md` for the full state machine, mode
 * descriptions, and config table. See `docs/notification-system.md`
 * for how this module's `PipelineEvent` output is consumed.
 *
 * Isomorphic: must NOT import any `*.svelte.ts` store. Receives all
 * runtime state via injected accessors so the same module can run
 * inside the foreground page and inside the service worker.
 *
 * Responsibilities:
 *  - Compute "which fonts are activated by which users" by reading the
 *    consumer users directly from the StorageBackend.
 *  - Resolve each font node by looking up its tree (the embedded
 *    `nodes` map of `ContentTree`).
 *  - Pick the right protocol client (RSS / Atom / Nostr).
 *  - Honor `FetcherState` per-node (cache headers, since cursor,
 *    backoff, scheduling).
 *  - On success, broadcast the produced posts to every user-box that
 *    activates the font (`savePostsForUser` per userId).
 *
 * Scheduling rules:
 *  - For each font, every interested user contributes a candidate
 *    interval derived from *their own* state — `activeFontIntervalMs`
 *    if they are the foreground active user, otherwise an idle-tier
 *    interval (under 24h / under 72h / over 72h since `interactedAt`).
 *  - The smallest candidate wins, so an eager user's settings never
 *    slow other users down and a lazy user's settings only impact
 *    themselves.
 *  - On error: exponential backoff (system-level, see
 *    `back-settings.ts`):
 *    `min(interval * multiplier^min(failures, maxSteps), maxMs)` with
 *    jitter. Disabled there → next try at the regular interval.
 */

import type { TreeNode, FontBody, FontProtocolEntry, FontRssConfig, FontAtomConfig, FontNostrConfig, FontJsonfeedConfig } from '$lib/domain/content-tree/content-tree.js';
import { isFontNode, getProtocolEntriesByPriority, getPrimaryProtocolEntry } from '$lib/domain/content-tree/content-tree.js';
import type { UserConsumer } from '$lib/domain/user/user-consumer.js';
import type { FetcherState, ProtocolFetcherState, PipelineState } from '$lib/domain/ingestion/fetcher-state.js';
import { emptyFetcherState, getOrCreateProtoState, transition } from '$lib/domain/ingestion/fetcher-state.js';
import type { PipelineEvent, PipelineEventType } from '$lib/domain/ingestion/pipeline-event.js';
import { defaultSeverityFor } from '$lib/domain/ingestion/pipeline-event.js';
import type {
	IngestionSettings,
	ProxyConfig,
	IpfsGatewayConfig,
	FeedTransportByKind,
	IpfsFeedTransportByKind
} from '$lib/domain/ingestion/ingestion-settings.js';
import { createIngestionSettings } from '$lib/domain/ingestion/ingestion-settings.js';
import {
	INGESTION_BACKOFF,
	INGESTION_FETCH,
	INGESTION_SCHEDULER,
	INGESTION_PROTOCOL_SCORING,
	INGESTION_INSTABILITY,
	INGESTION_CIRCUIT_BREAKER,
	INGESTION_CONFIDENCE
} from '$lib/config/back-settings.js';
import { savePostsForUser, type IngestedPost } from '$lib/persistence/post.store.js';
import { getFetcherState, putFetcherState } from '$lib/persistence/fetcher-state.store.js';
import { appendPipelineEvent } from '$lib/persistence/pipeline-events.store.js';
import { getStorageBackend } from '$lib/persistence/db.js';
import { getHttpAdapter, type HttpAdapter } from '$lib/ingestion/net/index.js';
import { fetchRssFeed } from '$lib/ingestion/rss/rss.client.js';
import { fetchAtomFeed } from '$lib/ingestion/atom/atom.client.js';
import { fetchNostrFeed } from '$lib/ingestion/nostr/nostr.client.js';
import { fetchJsonfeedFeed } from '$lib/ingestion/jsonfeed/jsonfeed.client.js';
import { runRetention } from './retention.js';
import { runNotificationPipeline } from '$lib/notifications/notification-engine.js';

export interface PostManagerDeps {
	/** Returns the userId currently focused in the UI (if any). */
	getActiveUserId: () => string | null;
}

export interface TickResult {
	fetched: number;
	skipped: number;
	failed: number;
	postsInserted: number;
}

const JITTER_PCT = INGESTION_FETCH.jitterPct;
const RETENTION_INTERVAL_MS = INGESTION_SCHEDULER.retentionCheckIntervalMs;

/**
 * Build a PostManager bound to the given dependency accessors.
 *
 * The returned object is safe to keep around — it serializes concurrent
 * `tick()` calls (the second `tick()` while one is in-flight just
 * awaits the same promise) and runs `runRetention()` opportunistically
 * at most once per `RETENTION_INTERVAL_MS`.
 */
export function createPostManager(deps: PostManagerDeps) {
	let inFlight: Promise<TickResult> | null = null;
	let lastRetentionAt = 0;

	/**
	 * Run one full ingestion sweep across every activated font.
	 * Concurrent calls are coalesced into a single in-flight pass.
	 * Triggers `runRetention()` lazily once `RETENTION_INTERVAL_MS`
	 * has elapsed since the previous retention run.
	 */
	async function tick(): Promise<TickResult> {
		if (inFlight) return inFlight;
		inFlight = runTick(deps).finally(() => {
			inFlight = null;
		});
		const result = await inFlight;

		const now = Date.now();
		if (now - lastRetentionAt > RETENTION_INTERVAL_MS) {
			lastRetentionAt = now;
			try {
				await runRetention(now);
			} catch (err) {
				console.warn('[post-manager] retention failed', err);
			}
		}

		return result;
	}

	/**
	 * Force-fetch a single font right now, ignoring its scheduled
	 * `nextScheduledAt` window. No-op if `nodeId` is not currently
	 * activated by any user.
	 */
	async function refreshFont(nodeId: string): Promise<void> {
		const ctx = await loadContext();
		const fontEntry = ctx.fontByNodeId.get(nodeId);
		if (!fontEntry) return;
		await processFont(ctx, fontEntry, /*forceNow*/ true);
	}

	return { tick, refreshFont };
}

// ── Internals ──────────────────────────────────────────────────────────

interface FontEntry {
	node: TreeNode;
	userIds: string[]; // users that activated AND enabled this font
	settingsByUser: Map<string, IngestionSettings>;
	interactedAtByUser: Map<string, number>;
	langByUser: Map<string, string>;
}

interface TickContext {
	now: number;
	activeUserId: string | null;
	fontByNodeId: Map<string, FontEntry>;
	httpAdapter: HttpAdapter;
}

/**
 * Build a fresh `TickContext` from the database: which fonts are
 * activated by which consumers (and with what per-user settings), the
 * `interactedAt` timestamps used for idle-tier scheduling, plus the
 * HTTP adapter for this run. Always returns a self-consistent
 * snapshot — callers should not mutate it.
 */
async function loadContext(): Promise<TickContext> {
	const db = await getStorageBackend();
	const allUsers = await db.users.getAll<UserConsumer>();
	const consumers = allUsers.filter((u) => u.role === 'consumer' && !u.removedAt);

	// Resolve enabled font nodeIds per consumer by walking each user's
	// activateNodes and looking up the corresponding TreeNode in the trees DB.
	const trees = await db.contentTrees.getAll<{ metadata: { id: string }; nodes: Record<string, TreeNode> }>();
	const nodeById = new Map<string, TreeNode>();
	for (const t of trees) {
		for (const [nid, node] of Object.entries(t.nodes)) {
			nodeById.set(nid, node);
		}
	}

	const fontByNodeId = new Map<string, FontEntry>();
	for (const user of consumers) {
		const settings = user.settingsUser?.ingestion;
		if (!settings) continue;
		const interactedAt = user.interactedAt ? new Date(user.interactedAt).getTime() : 0;
		for (const act of user.activateNodes) {
			if (act.enabled === false) continue;
			const node = nodeById.get(act.nodeId);
			if (!node || !isFontNode(node)) continue;
			let entry = fontByNodeId.get(act.nodeId);
			if (!entry) {
				entry = {
					node,
					userIds: [],
					settingsByUser: new Map(),
					interactedAtByUser: new Map(),
					langByUser: new Map()
				};
				fontByNodeId.set(act.nodeId, entry);
			}
			entry.userIds.push(user.id);
			entry.settingsByUser.set(user.id, settings);
			entry.interactedAtByUser.set(user.id, interactedAt);
			entry.langByUser.set(user.id, user.settingsUser?.language ?? '');
		}
	}

	// Pick HTTP adapter — uses the active user's proxies if present,
	// otherwise the first consumer's, otherwise an empty list.
	const activeUserId = readActiveUserIdFromStorage();
	const ctxUser =
		consumers.find((u) => u.id === activeUserId) ?? consumers[0] ?? null;
	const ingest = ctxUser?.settingsUser?.ingestion ?? createIngestionSettings();
	const proxies: ProxyConfig[] = ingest.proxyServices;
	const ipfsGateways: IpfsGatewayConfig[] = ingest.ipfsGatewayServices;
	const httpFeedTransportByKind: FeedTransportByKind = ingest.httpFeedTransportByKind;
	const ipfsFeedTransportByKind: IpfsFeedTransportByKind = ingest.ipfsFeedTransportByKind;
	const httpAdapter = await getHttpAdapter({
		proxies,
		ipfsGateways,
		httpFeedTransportByKind,
		ipfsFeedTransportByKind
	});

	return {
		now: Date.now(),
		activeUserId,
		fontByNodeId,
		httpAdapter
	};
}

/**
 * Read the active user id from `localStorage` without going through
 * the Svelte store. The PostManager runs both in the page and in the
 * service worker, where the reactive store is unavailable; this fallback
 * keeps the cached active-user identity in sync via `localStorage`.
 */
function readActiveUserIdFromStorage(): string | null {
	try {
		if (typeof localStorage === 'undefined') return null;
		return localStorage.getItem('notfeed:activeUserId');
	} catch {
		return null;
	}
}

/**
 * Inner tick implementation. Walks every activated font, processes it,
 * and aggregates per-result counters. Caller `tick()` is responsible
 * for in-flight coalescing and retention scheduling.
 */
async function runTick(deps: PostManagerDeps): Promise<TickResult> {
	const ctx = await loadContext();
	// Override active user with the foreground deps if available (more accurate).
	const fgActive = deps.getActiveUserId();
	if (fgActive) ctx.activeUserId = fgActive;

	let fetched = 0;
	let skipped = 0;
	let failed = 0;
	let postsInserted = 0;

	for (const entry of ctx.fontByNodeId.values()) {
		const result = await processFont(ctx, entry, false);
		if (result === 'skipped') skipped++;
		else if (result === 'failed') failed++;
		else {
			fetched++;
			postsInserted += result;
		}
	}

	return { fetched, skipped, failed, postsInserted };
}

type ProcessResult = 'skipped' | 'failed' | number;

/**
 * Process a single font with the explicit pipeline state machine and
 * three execution modes. See `docs/ingestion-pipeline.md` for the full
 * picture; the short version:
 *
 *  - Mode 1 (Adaptive Fallback) — the normal path. Sources whose
 *    circuit is `CLOSED` and `backoffUntil <= now` are eligible. The
 *    declared (or runtime-promoted) primary is tried first, then
 *    fallbacks ranked by score. The first success ends the tick.
 *
 *  - Mode 2 (Exponential Backoff per-source) — implicit. Each failed
 *    source gets its own `backoffUntil = now + base * 2^failureCount`
 *    (capped at 24h). Eligibility checks naturally skip sources still
 *    serving their backoff. The font itself transitions to UNSTABLE
 *    and is re-scheduled at `unstableSparseIntervalMs`.
 *
 *  - Mode 3 (Circuit Breaker) — once a source's `failureCount` reaches
 *    `openAfterFailures` or its backoff hits the cap, it flips to OPEN
 *    and only one probe (HALF_OPEN) is allowed every 6h–24h. When all
 *    sources are OPEN the font transitions to OFFLINE.
 *
 * On any successful tick the affected source is brought back to
 * CLOSED and the font enters RECOVERING; after `recoveringHoldTicks`
 * of continued health it transitions to HEALTHY. Every legal pipeline
 * transition appends a `PipelineEvent` for the consumer to deliver.
 */
async function processFont(
	ctx: TickContext,
	entry: FontEntry,
	forceNow: boolean
): Promise<ProcessResult> {
	const nodeId = entry.node.metadata.id;
	const body = entry.node.data.body as FontBody;
	if (body.protocols.length === 0) return 'skipped';

	const prev = (await getFetcherState(nodeId)) ?? emptyFetcherState(nodeId);

	if (!forceNow && prev.nextScheduledAt > ctx.now) return 'skipped';

	const interval = pickInterval(ctx, entry);

	// Build trial order using current scores + effective primary.
	const scores: Record<string, number> = {};
	for (const e of body.protocols) {
		scores[e.id] = prev.protocols[e.id]?.score ?? 0;
	}
	const trialOrder = getProtocolEntriesByPriority(body, scores, prev.effectivePrimaryEntryId);

	// Mutable copy of state we'll persist at the end.
	let next: FetcherState = {
		...prev,
		protocols: { ...prev.protocols }
	};
	const events: PipelineEvent[] = [];

	let success = false;
	let postsResult: { posts: IngestedPost[]; usedEntry: FontProtocolEntry } | null = null;
	let attemptedAny = false;

	for (let i = 0; i < trialOrder.length; i++) {
		const candidate = trialOrder[i];
		const protoState = { ...getOrCreateProtoState(next, candidate.id) };
		next.protocols[candidate.id] = protoState;

		// Source-level eligibility: respect per-source backoff regardless
		// of mode. OPEN sources stay locked until their probe window
		// elapses; HALF_OPEN means a probe is in flight from a previous
		// tick and we should attempt it.
		if (!forceNow && protoState.backoffUntil != null && protoState.backoffUntil > ctx.now) {
			continue;
		}

		// Skip fallbacks until the active source has crossed the
		// failover threshold this tick. Active = first eligible source
		// in trial order.
		if (i > 0) {
			const active = trialOrder[0];
			const activeFailures = next.protocols[active.id]?.consecutiveFailures ?? 0;
			if (activeFailures < INGESTION_PROTOCOL_SCORING.failoverThreshold) break;
		}

		// HALF_OPEN promotion: an OPEN source that came due is moved
		// to HALF_OPEN before the probe.
		if (protoState.circuitState === 'OPEN') {
			protoState.circuitState = 'HALF_OPEN';
		}

		attemptedAny = true;
		protoState.lastAttemptAt = ctx.now;
		const startedAt = ctx.now;

		try {
			const r = await runClient(ctx.httpAdapter, entry.node, candidate, protoState);
			const latency = Math.max(0, Date.now() - startedAt);
			applySuccessMetrics(protoState, latency);
			protoState.etag = r.etag ?? protoState.etag;
			protoState.lastModified = r.lastModified ?? protoState.lastModified;
			protoState.nostrSince = r.nostrSince ?? protoState.nostrSince;
			postsResult = { posts: r.posts, usedEntry: candidate };
			success = true;
			break;
		} catch (err) {
			const latency = Math.max(0, Date.now() - startedAt);
			applyFailureMetrics(protoState, latency, ctx.now);
			void err;
			if (protoState.consecutiveFailures < INGESTION_PROTOCOL_SCORING.failoverThreshold) break;
		}
	}

	// Per-tick decay applied to all entries (untouched ones still age).
	for (const e of body.protocols) {
		const s = next.protocols[e.id];
		if (!s) continue;
		s.score = clampScore(s.score * INGESTION_PROTOCOL_SCORING.decayFactor);
	}

	// Update effective-primary election; emits SOURCE_SWITCHED when it changes.
	const switchEvent = updateEffectivePrimary(next, body, ctx.now);
	if (switchEvent) events.push(switchEvent);

	// Broadcast on success.
	if (success && postsResult) {
		let totalInserted = 0;
		const usersWithNew = new Set<string>();
		for (const userId of entry.userIds) {
			if (postsResult.posts.length === 0) continue;
			const result = await savePostsForUser(userId, postsResult.posts);
			totalInserted += result.inserted;
			if (result.inserted > 0) usersWithNew.add(userId);
		}

		for (const userId of usersWithNew) {
			try {
				await runNotificationPipeline(userId, ctx.now);
			} catch (err) {
				console.warn('[post-manager] notification pipeline failed', userId, err);
			}
		}

		// Even on success, surface pipeline events (e.g. RECOVERED,
		// SOURCE_SWITCHED) to every interested user — not only those
		// that received new posts.
		if (events.length > 0) {
			for (const userId of entry.userIds) {
				if (usersWithNew.has(userId)) continue;
				try {
					await runNotificationPipeline(userId, ctx.now);
				} catch (err) {
					console.warn('[post-manager] notification pipeline failed', userId, err);
				}
			}
		}

		next.lastFetchedAt = ctx.now;
		next.lastSuccessAt = ctx.now;

		// Pipeline state transition on success.
		const wasUnhealthy = prev.pipelineState !== 'HEALTHY';
		if (wasUnhealthy && prev.pipelineState !== 'RECOVERING') {
			const r = transition(next, 'RECOVERING', ctx.now, confidenceFor);
			if (r.changed) {
				next = r.state;
				next.recoveringTicksRemaining = INGESTION_INSTABILITY.recoveringHoldTicks;
				events.push(makeEvent(nodeId, 'PIPELINE_RECOVERED', ctx.now));
			}
		} else if (prev.pipelineState === 'RECOVERING') {
			next.recoveringTicksRemaining = Math.max(0, prev.recoveringTicksRemaining - 1);
			if (next.recoveringTicksRemaining <= 0) {
				const r = transition(next, 'HEALTHY', ctx.now, confidenceFor);
				if (r.changed) next = r.state;
			}
		}

		next.nextScheduledAt = ctx.now + jitter(interval);
		await persistAll(next, events);
		return totalInserted;
	}

	// No success this tick. If we didn't even attempt a source (every
	// source was on backoff), just reschedule conservatively without
	// touching state-machine.
	next.lastFetchedAt = ctx.now;
	if (!attemptedAny) {
		next.nextScheduledAt = ctx.now + jitter(earliestSourceDue(next, ctx.now, interval));
		await persistAll(next, events);
		return 'failed';
	}

	// Failure-path scheduling and pipeline-state evaluation.
	const allOpen = body.protocols.every((e) => next.protocols[e.id]?.circuitState === 'OPEN');

	if (allOpen) {
		// Every source has tripped its breaker. The font is OFFLINE.
		const r = transition(next, 'OFFLINE', ctx.now, confidenceFor);
		if (r.changed) {
			next = r.state;
			events.push(makeEvent(nodeId, 'PIPELINE_OFFLINE', ctx.now));
		}
		// Sleep until the earliest probe is due.
		next.nextScheduledAt = ctx.now + jitter(earliestSourceDue(next, ctx.now, interval));
	} else {
		// At least one source still tries; treat as instability.
		const r = transition(next, 'UNSTABLE', ctx.now, confidenceFor);
		if (r.changed) {
			next = r.state;
			events.push(makeEvent(nodeId, 'PIPELINE_UNSTABLE', ctx.now));
		}
		// Sparse retry — but never sooner than the earliest source's
		// own backoff, which may already be longer.
		const sparse = INGESTION_INSTABILITY.unstableSparseIntervalMs;
		next.nextScheduledAt = ctx.now + jitter(Math.max(sparse, earliestSourceDue(next, ctx.now, sparse)));
	}

	await persistAll(next, events);

	// Failure path: still need to surface pipeline events
	// (UNSTABLE / OFFLINE / SOURCE_SWITCHED) to interested users.
	if (events.length > 0) {
		for (const userId of entry.userIds) {
			try {
				await runNotificationPipeline(userId, ctx.now);
			} catch (err) {
				console.warn('[post-manager] notification pipeline failed', userId, err);
			}
		}
	}

	return 'failed';
}

/** Persist state + every emitted event in sequence. */
async function persistAll(state: FetcherState, events: PipelineEvent[]): Promise<void> {
	await putFetcherState(state);
	for (const ev of events) {
		try {
			await appendPipelineEvent({
				fontId: ev.fontId,
				type: ev.type,
				severity: ev.severity,
				timestamp: ev.timestamp,
				metadata: ev.metadata
			});
		} catch (err) {
			console.warn('[post-manager] failed to append pipeline event', err);
		}
	}
}

/** Build a fresh `PipelineEvent` shell (id/consumedBy filled by the store). */
function makeEvent(
	fontId: string,
	type: PipelineEventType,
	now: number,
	metadata?: Record<string, unknown>
): PipelineEvent {
	return {
		id: '', // filled by appendPipelineEvent
		fontId,
		type,
		severity: defaultSeverityFor(type),
		timestamp: now,
		metadata,
		consumedBy: []
	};
}

/** Map pipeline state to confidence via config. */
function confidenceFor(s: PipelineState): number {
	return INGESTION_CONFIDENCE[s];
}

/**
 * Update success metrics on a per-source state. Closes a HALF_OPEN
 * circuit and resets the absolute failure counters.
 */
function applySuccessMetrics(s: ProtocolFetcherState, latencyMs: number): void {
	const a = INGESTION_PROTOCOL_SCORING.ewmaAlpha;
	s.successRate = clamp01(s.successRate * (1 - a) + 1 * a);
	s.avgLatencyMs = s.avgLatencyMs === 0 ? latencyMs : s.avgLatencyMs * (1 - a) + latencyMs * a;
	s.lastLatencyMs = latencyMs;
	s.lastFetchedAt = Date.now();
	s.lastSuccessAt = Date.now();
	s.consecutiveFailures = 0;
	s.failureCount = 0;
	s.score = clampScore(s.score + INGESTION_PROTOCOL_SCORING.successDelta);
	s.circuitState = 'CLOSED';
	s.backoffUntil = null;
}

/**
 * Update failure metrics on a per-source state. Computes the next
 * `backoffUntil` from `failureCount` and trips the breaker to OPEN
 * once thresholds are crossed (or back to OPEN if HALF_OPEN failed).
 */
function applyFailureMetrics(s: ProtocolFetcherState, latencyMs: number, now: number): void {
	const a = INGESTION_PROTOCOL_SCORING.ewmaAlpha;
	s.successRate = clamp01(s.successRate * (1 - a));
	s.avgLatencyMs = s.avgLatencyMs === 0 ? latencyMs : s.avgLatencyMs * (1 - a) + latencyMs * a;
	s.lastLatencyMs = latencyMs;
	s.lastFetchedAt = now;
	s.consecutiveFailures += 1;
	s.failureCount += 1;
	s.score = clampScore(s.score + INGESTION_PROTOCOL_SCORING.failureDelta);

	const cfg = INGESTION_BACKOFF;
	const baseInterval = INGESTION_SCHEDULER.defaultTickIntervalMs;
	let backoffMs: number;
	if (!cfg.enabled || cfg.multiplier <= 1) {
		backoffMs = baseInterval;
	} else {
		const exp = Math.min(s.failureCount, cfg.maxSteps);
		backoffMs = Math.min(baseInterval * Math.pow(cfg.multiplier, exp), cfg.maxMs);
	}

	const cb = INGESTION_CIRCUIT_BREAKER;
	const shouldOpen =
		s.failureCount >= cb.openAfterFailures || backoffMs >= cb.openAfterBackoffMs;

	if (shouldOpen) {
		// Open the breaker. If we just failed a HALF_OPEN probe, push
		// the next probe further out (use the upper bound of the probe
		// window) to avoid hammering a clearly-down source.
		const probeMs = randBetween(cb.probeIntervalMin, cb.probeIntervalMax);
		s.circuitState = 'OPEN';
		s.backoffUntil = now + probeMs;
	} else {
		s.backoffUntil = now + backoffMs;
	}
}

/**
 * Earliest epoch ms at which any source becomes due. Used to schedule
 * the font's next tick when the pipeline is failing, so we don't
 * wake before any source is ready.
 */
function earliestSourceDue(state: FetcherState, now: number, fallback: number): number {
	let min = Infinity;
	for (const s of Object.values(state.protocols)) {
		const due = s.backoffUntil ?? now;
		const wait = Math.max(0, due - now);
		if (wait < min) min = wait;
	}
	if (!Number.isFinite(min)) return fallback;
	return Math.max(min, 1000); // never schedule in the past
}

function clamp01(v: number): number {
	if (v < 0) return 0;
	if (v > 1) return 1;
	return v;
}

function randBetween(min: number, max: number): number {
	if (max <= min) return min;
	return Math.floor(min + Math.random() * (max - min));
}

function clampScore(value: number): number {
	if (value < INGESTION_PROTOCOL_SCORING.scoreMin) return INGESTION_PROTOCOL_SCORING.scoreMin;
	if (value > INGESTION_PROTOCOL_SCORING.scoreMax) return INGESTION_PROTOCOL_SCORING.scoreMax;
	return value;
}

/**
 * Promote a fallback to effective primary when its score exceeds the
 * declared primary's by `promotionMargin` for
 * `promotionWindowTicks` consecutive ticks. Reverts (clears
 * `effectivePrimaryEntryId`) the first tick the lead disappears.
 *
 * Returns a `SOURCE_SWITCHED` event when the runtime primary changes
 * (in either direction); otherwise `null`.
 */
function updateEffectivePrimary(
	state: FetcherState,
	body: FontBody,
	now: number
): PipelineEvent | null {
	const before = state.effectivePrimaryEntryId;
	const declared = getPrimaryProtocolEntry(body);
	if (!declared || body.protocols.length < 2) {
		state.effectivePrimaryEntryId = null;
		state.promotionStreakTicks = 0;
		return null;
	}
	const declaredScore = state.protocols[declared.id]?.score ?? 0;

	let topFallback: FontProtocolEntry | null = null;
	let topScore = -Infinity;
	for (const e of body.protocols) {
		if (e === declared) continue;
		const s = state.protocols[e.id]?.score ?? 0;
		if (s > topScore) {
			topScore = s;
			topFallback = e;
		}
	}
	if (!topFallback) {
		state.effectivePrimaryEntryId = null;
		state.promotionStreakTicks = 0;
		return null;
	}

	const lead = topScore - declaredScore;
	if (lead >= INGESTION_PROTOCOL_SCORING.promotionMargin) {
		state.promotionStreakTicks += 1;
		if (state.promotionStreakTicks >= INGESTION_PROTOCOL_SCORING.promotionWindowTicks) {
			if (state.effectivePrimaryEntryId !== topFallback.id) {
				console.info('[post-manager] promoting fallback to effective primary', {
					nodeId: state.nodeId,
					from: declared.id,
					to: topFallback.id,
					lead
				});
			}
			state.effectivePrimaryEntryId = topFallback.id;
		}
	} else {
		// Lead disappeared — revert immediately.
		if (state.effectivePrimaryEntryId !== null) {
			console.info('[post-manager] reverting effective primary to declared', {
				nodeId: state.nodeId,
				declared: declared.id
			});
		}
		state.effectivePrimaryEntryId = null;
		state.promotionStreakTicks = 0;
	}

	const after = state.effectivePrimaryEntryId;
	if (before !== after) {
		return makeEvent(state.nodeId, 'SOURCE_SWITCHED', now, {
			from: before ?? declared.id,
			to: after ?? declared.id
		});
	}
	return null;
}

/**
 * Compute the polling interval for a font.
 *
 * Each interested user contributes a candidate interval based on their
 * own state ("active foreground user" or one of three idle tiers
 * derived from `interactedAt`). The smallest candidate wins — i.e. the
 * most-eager user's setting drives the cadence, so a lazy user can
 * never starve another.
 */
function pickInterval(ctx: TickContext, entry: FontEntry): number {
	let min = Infinity;
	for (const userId of entry.userIds) {
		const s = entry.settingsByUser.get(userId);
		if (!s) continue;
		const candidate = pickIntervalForUser(ctx, userId, s, entry.interactedAtByUser.get(userId) ?? 0);
		if (candidate < min) min = candidate;
	}
	return Number.isFinite(min) ? min : 24 * 60 * 60 * 1000;
}

/**
 * One-tier idle-aware interval picker for a single user. Foreground
 * → active interval; otherwise pick the tier whose upper bound is
 * still ahead of the user's current idle time.
 */
function pickIntervalForUser(
	ctx: TickContext,
	userId: string,
	s: IngestionSettings,
	interactedAt: number
): number {
	if (ctx.activeUserId === userId) return s.activeFontIntervalMs;
	const idleMs = Math.max(0, ctx.now - interactedAt);
	if (idleMs < s.idleTier1MaxIdleMs) return s.idleTier1IntervalMs;
	if (idleMs < s.idleTier2MaxIdleMs) return s.idleTier2IntervalMs;
	return s.idleTier3IntervalMs;
}

/**
 * Apply ±`JITTER_PCT` random jitter to a duration, to avoid
 * synchronizing multiple clients onto the exact same fetch instant.
 */
function jitter(ms: number): number {
	const delta = ms * JITTER_PCT;
	return Math.floor(ms + (Math.random() * 2 - 1) * delta);
}

interface ClientResult {
	posts: IngestedPost[];
	etag: string | null;
	lastModified: string | null;
	nostrSince: number | null;
}

/**
 * Dispatch to the right protocol client for a single
 * `FontProtocolEntry`. Returns a normalized `ClientResult` with the
 * produced posts plus the fields that should be merged into that
 * entry's `ProtocolFetcherState`.
 *
 * Throws on network/parse error — the caller (`processFont`) catches
 * and updates per-entry failure counters.
 */
async function runClient(
	http: HttpAdapter,
	node: TreeNode,
	entry: FontProtocolEntry,
	prev: ProtocolFetcherState
): Promise<ClientResult> {
	const nodeId = node.metadata.id;

	switch (entry.protocol) {
		case 'rss': {
			const r = await fetchRssFeed(http, entry.config as FontRssConfig, nodeId, prev);
			return {
				posts: r.posts,
				etag: r.nextState.etag,
				lastModified: r.nextState.lastModified,
				nostrSince: null
			};
		}
		case 'atom': {
			const r = await fetchAtomFeed(http, entry.config as FontAtomConfig, nodeId, prev);
			return {
				posts: r.posts,
				etag: r.nextState.etag,
				lastModified: r.nextState.lastModified,
				nostrSince: null
			};
		}
		case 'nostr': {
			const r = await fetchNostrFeed(entry.config as FontNostrConfig, nodeId, prev);
			return {
				posts: r.posts,
				etag: null,
				lastModified: null,
				nostrSince: r.nextState.nostrSince ?? null
			};
		}
		case 'jsonfeed': {
			const r = await fetchJsonfeedFeed(http, entry.config as FontJsonfeedConfig, nodeId, prev);
			return {
				posts: r.posts,
				etag: r.nextState.etag,
				lastModified: r.nextState.lastModified,
				nostrSince: null
			};
		}
	}
}

/**
 * Reset all judgement state on every font. Returns each per-source
 * record to a pristine CLOSED-circuit, zero-failure state and brings
 * the font's pipeline back to HEALTHY with full confidence. Cache
 * headers (etag/lastModified/nostrSince) are preserved, and the font
 * is marked due now so a verification can run immediately.
 *
 * Exposed via app settings → Ingestion → "Reset protocol scoring" so
 * the user can clear stale judgments after fixing a config or
 * relocating a feed.
 */
export async function resetAllProtocolScoring(): Promise<number> {
	const db = await getStorageBackend();
	const all = await db.fetcherStates.getAll<FetcherState>();
	let count = 0;
	for (const fs of all) {
		const next = resetFetcherJudgement(fs);
		await putFetcherState(next);
		count++;
	}
	return count;
}

/**
 * Reset judgement state for a single font node. Returns true when an
 * existing persisted state was found and reset.
 */
export async function resetProtocolScoringForFont(nodeId: string): Promise<boolean> {
	const db = await getStorageBackend();
	const existing = await db.fetcherStates.getById<FetcherState>(nodeId);
	if (!existing) return false;

	await putFetcherState(resetFetcherJudgement(existing));
	return true;
}

export interface ProtocolScoringStateRow {
	nodeId: string;
	title: string;
	pipelineState: PipelineState;
	confidence: number;
	protocolCount: number;
}

/**
 * Snapshot used by settings UI to show the current pipeline state for
 * every font that already has a persisted `FetcherState`.
 */
export async function listProtocolScoringStateRows(): Promise<ProtocolScoringStateRow[]> {
	const db = await getStorageBackend();
	const states = await db.fetcherStates.getAll<FetcherState>();
	if (states.length === 0) return [];

	const trees = await db.contentTrees.getAll<{ nodes: Record<string, TreeNode> }>();
	const titleByNodeId = new Map<string, string>();
	for (const tree of trees) {
		for (const [nodeId, node] of Object.entries(tree.nodes)) {
			if (!isFontNode(node)) continue;
			if (titleByNodeId.has(nodeId)) continue;
			const title = node.data.header?.title?.trim() || nodeId;
			titleByNodeId.set(nodeId, title);
		}
	}

	return states
		.map((state) => ({
			nodeId: state.nodeId,
			title: titleByNodeId.get(state.nodeId) ?? state.nodeId,
			pipelineState: state.pipelineState ?? 'HEALTHY',
			confidence: typeof state.confidence === 'number' ? state.confidence : 1,
			protocolCount: Object.keys(state.protocols ?? {}).length
		}))
		.sort(
			(a, b) =>
				a.title.localeCompare(b.title, undefined, { sensitivity: 'base' }) ||
				a.nodeId.localeCompare(b.nodeId)
		);
}

function resetFetcherJudgement(state: FetcherState): FetcherState {
	return {
		...state,
		protocols: Object.fromEntries(
			Object.entries(state.protocols ?? {}).map(([id, protocol]) => [
				id,
				{
					...protocol,
					score: 0,
					consecutiveFailures: 0,
					failureCount: 0,
					successRate: 1,
					avgLatencyMs: 0,
					lastLatencyMs: 0,
					lastAttemptAt: 0,
					circuitState: 'CLOSED' as const,
					backoffUntil: null
				}
			])
		),
		effectivePrimaryEntryId: null,
		promotionStreakTicks: 0,
		pipelineState: 'HEALTHY' as const,
		lastTransitionAt: 0,
		recoveringTicksRemaining: 0,
		confidence: 1,
		nextScheduledAt: 0
	};
}
