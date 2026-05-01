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

import type { TreeNode, FontBody, FontRssConfig, FontAtomConfig, FontNostrConfig, FontJsonfeedConfig } from '$lib/domain/content-tree/content-tree.js';
import { isFontNode } from '$lib/domain/content-tree/content-tree.js';
import type { UserConsumer } from '$lib/domain/user/user-consumer.js';
import type { FetcherState } from '$lib/domain/ingestion/fetcher-state.js';
import { emptyFetcherState } from '$lib/domain/ingestion/fetcher-state.js';
import type { IngestionSettings, ProxyConfig } from '$lib/domain/ingestion/ingestion-settings.js';
import { INGESTION_BACKOFF, INGESTION_FETCH, INGESTION_SCHEDULER } from '$lib/config/back-settings.js';
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
				entry = { node, userIds: [], settingsByUser: new Map(), interactedAtByUser: new Map() };
				fontByNodeId.set(act.nodeId, entry);
			}
			entry.userIds.push(user.id);
			entry.settingsByUser.set(user.id, settings);
			entry.interactedAtByUser.set(user.id, interactedAt);
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
 * Process a single font: skip if not yet due (unless `forceNow`),
 * otherwise call the protocol client, broadcast the produced posts to
 * every interested user box, and persist the next `FetcherState`
 * (cache headers, since cursor, scheduling). On failure, applies the
 * configured backoff and reschedules accordingly.
 *
 * @returns `'skipped'` when the font is not due yet,
 *  `'failed'` on fetch error, or the number of posts inserted across
 *  all interested user boxes on success.
 */
async function processFont(
	ctx: TickContext,
	entry: FontEntry,
	forceNow: boolean
): Promise<ProcessResult> {
	const nodeId = entry.node.metadata.id;
	const prev = (await getFetcherState(nodeId)) ?? emptyFetcherState(nodeId);

	if (!forceNow && prev.nextScheduledAt > ctx.now) return 'skipped';

	const interval = pickInterval(ctx, entry);

	try {
		const { posts, etag, lastModified, nostrSince } = await runClient(ctx.httpAdapter, entry.node, prev);

		// Broadcast to every interested user box.
		let totalInserted = 0;
		const usersWithNew = new Set<string>();
		for (const userId of entry.userIds) {
			if (posts.length === 0) continue;
			const result = await savePostsForUser(userId, posts as IngestedPost[]);
			totalInserted += result.inserted;
			if (result.inserted > 0) usersWithNew.add(userId);
		}

		// Run the notification pipeline once per user that received
		// fresh posts. Errors are isolated — a failing pipeline must
		// never break ingestion.
		for (const userId of usersWithNew) {
			try {
				await runNotificationPipeline(userId, ctx.now);
			} catch (err) {
				console.warn('[post-manager] notification pipeline failed', userId, err);
			}
		}

		const next: FetcherState = {
			...prev,
			etag: etag ?? prev.etag,
			lastModified: lastModified ?? prev.lastModified,
			nostrSince: nostrSince ?? prev.nostrSince,
			lastFetchedAt: ctx.now,
			lastSuccessAt: ctx.now,
			consecutiveFailures: 0,
			nextScheduledAt: ctx.now + jitter(interval)
		};
		await putFetcherState(next);
		return totalInserted;
	} catch {
		const failures = prev.consecutiveFailures + 1;
		const cfg = INGESTION_BACKOFF;
		let backoff: number;
		if (!cfg.enabled || cfg.multiplier <= 1) {
			backoff = interval;
		} else {
			const exponent = Math.min(failures, cfg.maxSteps);
			backoff = Math.min(interval * Math.pow(cfg.multiplier, exponent), cfg.maxMs);
		}
		const next: FetcherState = {
			...prev,
			lastFetchedAt: ctx.now,
			consecutiveFailures: failures,
			nextScheduledAt: ctx.now + jitter(backoff)
		};
		await putFetcherState(next);
		return 'failed';
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

interface ClientResult {
	posts: IngestedPost[];
	etag: string | null;
	lastModified: string | null;
	nostrSince: number | null;
}

/**
 * Dispatch to the right protocol client based on the font's `body.protocol`.
 * Returns a normalized `ClientResult` with the produced posts plus the
 * fields that should be merged into the next `FetcherState`.
 */
async function runClient(
	http: HttpAdapter,
	node: TreeNode,
	prev: FetcherState
): Promise<ClientResult> {
	const body = node.data.body as FontBody;
	const nodeId = node.metadata.id;

	switch (body.protocol) {
		case 'rss': {
			const r = await fetchRssFeed(http, body.config as FontRssConfig, nodeId, prev);
			return {
				posts: r.posts,
				etag: r.nextState.etag,
				lastModified: r.nextState.lastModified,
				nostrSince: null
			};
		}
		case 'atom': {
			const r = await fetchAtomFeed(http, body.config as FontAtomConfig, nodeId, prev);
			return {
				posts: r.posts,
				etag: r.nextState.etag,
				lastModified: r.nextState.lastModified,
				nostrSince: null
			};
		}
		case 'nostr': {
			const r = await fetchNostrFeed(body.config as FontNostrConfig, nodeId, prev);
			return {
				posts: r.posts,
				etag: null,
				lastModified: null,
				nostrSince: r.nextState.nostrSince ?? null
			};
		}
		case 'jsonfeed': {
			const r = await fetchJsonfeedFeed(http, body.config as FontJsonfeedConfig, nodeId, prev);
			return {
				posts: r.posts,
				etag: r.nextState.etag,
				lastModified: r.nextState.lastModified,
				nostrSince: null
			};
		}
	}
}
