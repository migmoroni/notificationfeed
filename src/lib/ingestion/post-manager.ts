/**
 * PostManager — central ingestion orchestrator.
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
import type { FetcherState, ProtocolFetcherState } from '$lib/domain/ingestion/fetcher-state.js';
import { emptyFetcherState, getOrCreateProtoState } from '$lib/domain/ingestion/fetcher-state.js';
import type { IngestionSettings, ProxyConfig } from '$lib/domain/ingestion/ingestion-settings.js';
import { INGESTION_BACKOFF, INGESTION_FETCH, INGESTION_SCHEDULER, INGESTION_PROTOCOL_SCORING, INGESTION_UNREACHABLE_NOTIF_COOLDOWN_MS, INGESTION_INSTABILITY } from '$lib/config/back-settings.js';
import { savePostsForUser, type IngestedPost } from '$lib/persistence/post.store.js';
import { getFetcherState, putFetcherState } from '$lib/persistence/fetcher-state.store.js';
import { getStorageBackend } from '$lib/persistence/db.js';
import { getHttpAdapter, type HttpAdapter } from '$lib/ingestion/net/index.js';
import { fetchRssFeed } from '$lib/ingestion/rss/rss.client.js';
import { fetchAtomFeed } from '$lib/ingestion/atom/atom.client.js';
import { fetchNostrFeed } from '$lib/ingestion/nostr/nostr.client.js';
import { fetchJsonfeedFeed } from '$lib/ingestion/jsonfeed/jsonfeed.client.js';
import { runRetention } from './retention.js';
import { runNotificationPipeline } from '$lib/notifications/notification-engine.js';
import { appendInboxEntries } from '$lib/persistence/notification-inbox.store.js';
import { notifyOs } from '$lib/notifications/os-notifier.js';
import { tFor } from '$lib/i18n/t-static.js';

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
	const proxies: ProxyConfig[] = ctxUser?.settingsUser?.ingestion?.proxyServices ?? [];
	const proxyEnabled: boolean = ctxUser?.settingsUser?.ingestion?.proxyEnabled ?? true;
	const httpAdapter = await getHttpAdapter({ proxies, proxyEnabled });

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
 * Process a single font with multi-protocol failover.
 *
 * Behaviour per tick:
 *  1. Skip if not yet due (unless `forceNow`).
 *  2. Build the trial order: declared primary (or runtime effective
 *     primary, when promoted) first, then fallbacks ranked by score.
 *  3. Try each protocol in order. The first one to succeed produces
 *     the posts; remaining protocols are not tried this tick. On per-
 *     protocol success, score++. On per-protocol failure, score-- and
 *     `consecutiveFailures++` for that entry. We move to the next
 *     entry only when the active one has reached `failoverThreshold`
 *     consecutive failures (so a single transient blip does NOT cause
 *     a thrash to fallback in the same tick).
 *  4. Apply per-tick decay to all entry scores.
 *  5. Update `effectivePrimaryEntryId` / `promotionStreakTicks` based
 *     on the current scores.
 *  6. On success → broadcast posts, schedule next tick at `interval`,
 *     reset `lastUnreachableNotifiedAt`. On total failure → schedule
 *     with backoff and emit the rate-limited unreachable notification.
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
	const next: FetcherState = {
		...prev,
		protocols: { ...prev.protocols }
	};

	let success = false;
	let postsResult: { posts: IngestedPost[]; usedEntry: FontProtocolEntry } | null = null;
	let totalFailuresThisTick = 0;

	for (const candidate of trialOrder) {
		const protoState = { ...getOrCreateProtoState(next, candidate.id) };
		next.protocols[candidate.id] = protoState;

		// Skip candidates after the active one unless they crossed the
		// threshold. The "active" candidate is whichever is first in
		// `trialOrder` — fallbacks only run when it has accumulated
		// `failoverThreshold` consecutive failures (this tick included).
		if (candidate !== trialOrder[0]) {
			const active = trialOrder[0];
			const activeFailures = next.protocols[active.id]?.consecutiveFailures ?? 0;
			if (activeFailures < INGESTION_PROTOCOL_SCORING.failoverThreshold) break;
		}

		try {
			const r = await runClient(ctx.httpAdapter, entry.node, candidate, protoState);
			protoState.etag = r.etag ?? protoState.etag;
			protoState.lastModified = r.lastModified ?? protoState.lastModified;
			protoState.nostrSince = r.nostrSince ?? protoState.nostrSince;
			protoState.lastFetchedAt = ctx.now;
			protoState.lastSuccessAt = ctx.now;
			protoState.consecutiveFailures = 0;
			protoState.score = clampScore(protoState.score + INGESTION_PROTOCOL_SCORING.successDelta);
			postsResult = { posts: r.posts, usedEntry: candidate };
			success = true;
			break;
		} catch (err) {
			protoState.lastFetchedAt = ctx.now;
			protoState.consecutiveFailures += 1;
			protoState.score = clampScore(protoState.score + INGESTION_PROTOCOL_SCORING.failureDelta);
			totalFailuresThisTick++;
			console.info('[post-manager] font protocol failed', {
				nodeId,
				entryId: candidate.id,
				protocol: candidate.protocol,
				consecutiveFailures: protoState.consecutiveFailures,
				err: err instanceof Error ? err.message : String(err)
			});
			// Continue to next candidate only when threshold reached.
			if (protoState.consecutiveFailures < INGESTION_PROTOCOL_SCORING.failoverThreshold) break;
		}
	}

	// Per-tick decay applied to all entries (untouched ones still age).
	for (const e of body.protocols) {
		const s = next.protocols[e.id];
		if (!s) continue;
		s.score = clampScore(s.score * INGESTION_PROTOCOL_SCORING.decayFactor);
	}

	// Update effective-primary election.
	updateEffectivePrimary(next, body);

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

		next.lastFetchedAt = ctx.now;
		next.lastSuccessAt = ctx.now;
		next.lastUnreachableNotifiedAt = 0; // reset cooldown on success
		next.lastInstabilityNotifiedAt = 0; // reset instability cooldown on success
		next.nextScheduledAt = ctx.now + jitter(interval);
		await putFetcherState(next);
		return totalInserted;
	}

	// Total failure path: classify into either *instability* (the font
	// has succeeded before and is still inside the grace window) or
	// full *unreachable* (never succeeded, or grace window expired).
	const cfg = INGESTION_BACKOFF;
	let backoff: number;
	if (!cfg.enabled || cfg.multiplier <= 1) {
		backoff = interval;
	} else {
		const exponent = Math.min(totalFailuresThisTick, cfg.maxSteps);
		backoff = Math.min(interval * Math.pow(cfg.multiplier, exponent), cfg.maxMs);
	}

	const hasHistory = next.lastSuccessAt != null && next.lastSuccessAt > 0;
	const inGrace =
		hasHistory &&
		ctx.now - (next.lastSuccessAt ?? 0) < INGESTION_INSTABILITY.graceMs;

	next.lastFetchedAt = ctx.now;

	if (inGrace) {
		// Stretch retries during the grace window. We deliberately use
		// a sparser interval than the user's configured cadence so an
		// already-wobbly source isn't hammered while it recovers.
		const graceWait = Math.max(backoff, INGESTION_INSTABILITY.graceIntervalMs);
		next.nextScheduledAt = ctx.now + jitter(graceWait);

		const sinceLastUnstable = ctx.now - next.lastInstabilityNotifiedAt;
		if (
			next.lastInstabilityNotifiedAt === 0 ||
			sinceLastUnstable >= INGESTION_INSTABILITY.notifCooldownMs
		) {
			next.lastInstabilityNotifiedAt = ctx.now;
			await emitInstabilityNotifications(entry, ctx.now);
		}
	} else {
		next.nextScheduledAt = ctx.now + jitter(backoff);

		const sinceLast = ctx.now - next.lastUnreachableNotifiedAt;
		if (
			next.lastUnreachableNotifiedAt === 0 ||
			sinceLast >= INGESTION_UNREACHABLE_NOTIF_COOLDOWN_MS
		) {
			next.lastUnreachableNotifiedAt = ctx.now;
			await emitUnreachableNotifications(entry, ctx.now);
		}
	}

	await putFetcherState(next);
	return 'failed';
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
 */
function updateEffectivePrimary(state: FetcherState, body: FontBody): void {
	const declared = getPrimaryProtocolEntry(body);
	if (!declared || body.protocols.length < 2) {
		state.effectivePrimaryEntryId = null;
		state.promotionStreakTicks = 0;
		return;
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
		return;
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
}

/**
 * Push a "could not fetch this font" entry into the notification
 * inbox of every interested user. Rate-limiting (max 1 per 24h per
 * font) is enforced by the caller via
 * `FetcherState.lastUnreachableNotifiedAt`.
 */
async function emitUnreachableNotifications(entry: FontEntry, now: number): Promise<void> {
	const fontTitle = entry.node.data.header?.title ?? 'font';
	for (const userId of entry.userIds) {
		try {
			const lang = entry.langByUser.get(userId);
			await enqueueUnreachableNotification(userId, entry.node.metadata.id, fontTitle, now, lang);
		} catch (err) {
			console.warn('[post-manager] failed to emit unreachable notification', userId, err);
		}
	}
}

/**
 * Push a "this font is wobbly" entry into every interested user's
 * inbox. Counterpart to `emitUnreachableNotifications` for the
 * softer instability stage; rate-limited via
 * `FetcherState.lastInstabilityNotifiedAt`.
 */
async function emitInstabilityNotifications(entry: FontEntry, now: number): Promise<void> {
	const fontTitle = entry.node.data.header?.title ?? 'font';
	for (const userId of entry.userIds) {
		try {
			const lang = entry.langByUser.get(userId);
			await enqueueInstabilityNotification(userId, entry.node.metadata.id, fontTitle, now, lang);
		} catch (err) {
			console.warn('[post-manager] failed to emit instability notification', userId, err);
		}
	}
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

/**
 * Push a "could not fetch" inbox entry for a single user and best-effort
 * fire an OS notification. Errors are swallowed by the caller — failure
 * to notify must never break ingestion.
 */
async function enqueueUnreachableNotification(
	userId: string,
	nodeId: string,
	fontTitle: string,
	now: number,
	lang: string | undefined
): Promise<void> {
	const id = `font-unreachable-${nodeId}-${now}`;
	// Non-reactive translation: the post-manager runs in the service
	// worker and on the page, where the reactive i18n store may not be
	// available. `tFor` reads JSON dictionaries directly using the
	// user's persisted language preference.
	const title = tFor(lang, 'notifications.font_unreachable_title');
	const body = tFor(lang, 'notifications.font_unreachable_body', { font: fontTitle });
	await appendInboxEntries(userId, [
		{
			id,
			kind: 'font_unreachable',
			stepId: 'font_unreachable',
			title,
			body,
			createdAt: now,
			read: false,
			target: { kind: 'node', nodeId }
		}
	]);
	try {
		await notifyOs({ title, body, tag: `font-unreachable-${nodeId}` });
	} catch {
		// best-effort
	}
}

/**
 * Inbox + OS notification for the softer instability stage. Same
 * shape as `enqueueUnreachableNotification`, different copy and a
 * separate OS tag so a later escalation to "unreachable" can stack
 * without colliding with this entry.
 */
async function enqueueInstabilityNotification(
	userId: string,
	nodeId: string,
	fontTitle: string,
	now: number,
	lang: string | undefined
): Promise<void> {
	const id = `font-unstable-${nodeId}-${now}`;
	const title = tFor(lang, 'notifications.font_unstable_title');
	const body = tFor(lang, 'notifications.font_unstable_body', { font: fontTitle });
	await appendInboxEntries(userId, [
		{
			id,
			kind: 'font_unstable',
			stepId: 'font_unstable',
			title,
			body,
			createdAt: now,
			read: false,
			target: { kind: 'node', nodeId }
		}
	]);
	try {
		await notifyOs({ title, body, tag: `font-unstable-${nodeId}` });
	} catch {
		// best-effort
	}
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
 * Reset per-protocol scoring on every font. Wipes scores,
 * `consecutiveFailures`, `effectivePrimaryEntryId`,
 * `promotionStreakTicks`, and `lastUnreachableNotifiedAt`. Cache
 * headers (etag/lastModified/nostrSince) and schedules are preserved.
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
		const next: FetcherState = {
			...fs,
			protocols: Object.fromEntries(
				Object.entries(fs.protocols ?? {}).map(([id, ps]) => [
					id,
					{ ...ps, score: 0, consecutiveFailures: 0 }
				])
			),
			effectivePrimaryEntryId: null,
			promotionStreakTicks: 0,
			lastUnreachableNotifiedAt: 0
		};
		await putFetcherState(next);
		count++;
	}
	return count;
}
