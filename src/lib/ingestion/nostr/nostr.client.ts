/**
 * Nostr ingestion client (Plano B).
 *
 * Pure-client subscription model: opens REQ to each relay with
 * `since` (last `created_at` from `FetcherState`) + `limit`, collects
 * events until EOSE (or timeout), then closes. Live streaming is
 * deferred — Plan B uses polling like RSS/Atom for consistency.
 *
 * Default kinds when font omits them: `[1, 30023]` (notes + NIP-23 long-form).
 * No AUTH, no outbound EVENT, only REQ + CLOSE.
 */

import type { FontNostrConfig } from '$lib/domain/content-tree/content-tree.js';
import type { ProtocolFetcherState } from '$lib/domain/ingestion/fetcher-state.js';
import type { IngestedPost } from '$lib/persistence/post.store.js';
import { normalizeNostrEvent } from '$lib/normalization/nostr.normalizer.js';
import { INGESTION_FETCH } from '$lib/config/back-settings.js';
import { npubToHex } from './bech32.js';
import { uuidv7 } from '$lib/domain/shared/uuidv7.js';

export interface NostrEvent {
	id: string;
	pubkey: string;
	created_at: number;
	kind: number;
	tags: string[][];
	content: string;
	sig: string;
}

const DEFAULT_KINDS = INGESTION_FETCH.nostrDefaultKinds;
const DEFAULT_LIMIT = INGESTION_FETCH.nostrPostsPerFetch;
const INITIAL_BACKLOG = INGESTION_FETCH.nostrInitialBacklog;
const DEFAULT_TIMEOUT_MS = INGESTION_FETCH.nostrEoseTimeoutMs;

export interface FetchResult {
	posts: IngestedPost[];
	nextState: Pick<ProtocolFetcherState, 'lastFetchedAt' | 'lastSuccessAt' | 'nostrSince'>;
}

export interface FetchNostrOpts {
	timeoutMs?: number;
	limit?: number;
}

/**
 * Fetch a Nostr feed by opening short-lived REQ subscriptions to every
 * configured relay in parallel.
 *
 * Behaviour:
 *  - Filter is `{ authors: [pubkey], kinds, limit }` plus `since` taken
 *    from the previous `FetcherState.nostrSince` when available.
 *  - Each relay is queried in parallel; events from all relays are
 *    merged and de-duplicated by `id`.
 *  - The returned `nextState.nostrSince` is the maximum `created_at`
 *    seen on this run (so the next call only asks for newer events),
 *    falling back to the previous cursor when no events came back.
 */
export async function fetchNostrFeed(
	config: FontNostrConfig,
	nodeId: string,
	prev: ProtocolFetcherState | null,
	opts: FetchNostrOpts = {}
): Promise<FetchResult> {
	const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
	const kinds = config.kinds && config.kinds.length > 0 ? config.kinds : DEFAULT_KINDS;
	const since = prev?.nostrSince ?? null;
	// First fetch (no cursor yet) → cap to a small backlog so newly
	// activated fonts surface a manageable history. Later polls use the
	// regular per-fetch limit because the `since` cursor protects against
	// missing events between two runs.
	const limit = opts.limit ?? (since === null ? INITIAL_BACKLOG : DEFAULT_LIMIT);

	// Relays speak hex pubkeys, but users paste bech32 `npub1...`. Decode
	// once here so the filter is always valid; reject obviously bad input
	// up front instead of silently sending an unmatchable filter.
	const authorHex = npubToHex(config.pubkey);
	if (!authorHex) {
		throw new Error(`nostr: invalid pubkey (expected npub1... or 64-char hex): ${config.pubkey}`);
	}

	const filter: Record<string, unknown> = {
		authors: [authorHex],
		kinds,
		limit
	};
	if (since !== null) filter.since = since;

	console.info('[nostr] fetch start', {
		nodeId,
		pubkey: authorHex.slice(0, 12) + '…',
		relays: config.relays,
		kinds,
		limit,
		since
	});

	const { events, allFailed, perRelay } = await collectFromRelays(
		config.relays,
		filter,
		timeoutMs
	);
	console.info('[nostr] fetch result', {
		nodeId,
		totalEvents: events.length,
		allFailed,
		perRelay
	});
	if (allFailed && config.relays.length > 0) {
		throw new Error(`nostr: all ${config.relays.length} relay(s) failed to connect`);
	}

	// Dedup by event id
	const seen = new Set<string>();
	const unique: NostrEvent[] = [];
	let maxCreatedAt = since ?? 0;
	for (const ev of events) {
		if (seen.has(ev.id)) continue;
		seen.add(ev.id);
		unique.push(ev);
		if (ev.created_at > maxCreatedAt) maxCreatedAt = ev.created_at;
	}

	const posts = unique.map((ev) => normalizeNostrEvent(ev, nodeId));
	const now = Date.now();

	return {
		posts,
		nextState: {
			lastFetchedAt: now,
			lastSuccessAt: now,
			nostrSince: maxCreatedAt > 0 ? maxCreatedAt : prev?.nostrSince ?? null
		}
	};
}

/**
 * Open one REQ per relay in parallel (`Promise.allSettled`) and merge
 * the resulting event lists. A relay that fails or times out simply
 * contributes zero events — it never breaks the overall fetch.
 *
 * Returns `allFailed: true` only when every relay failed to even open
 * its WebSocket (e.g. all DNS or TLS errors). The caller throws on
 * that condition so the post-manager scores the protocol as failed.
 */
async function collectFromRelays(
	relays: string[],
	filter: Record<string, unknown>,
	timeoutMs: number
): Promise<{
	events: NostrEvent[];
	allFailed: boolean;
	perRelay: Array<{ relay: string; connected: boolean; events: number; reason?: string }>;
}> {
	const results = await Promise.allSettled(
		relays.map((relay) => collectFromRelay(relay, filter, timeoutMs))
	);
	const all: NostrEvent[] = [];
	let anyConnected = false;
	const perRelay: Array<{
		relay: string;
		connected: boolean;
		events: number;
		reason?: string;
	}> = [];
	results.forEach((r, i) => {
		const relay = relays[i];
		if (r.status === 'fulfilled') {
			if (r.value.connected) anyConnected = true;
			all.push(...r.value.events);
			perRelay.push({
				relay,
				connected: r.value.connected,
				events: r.value.events.length,
				reason: r.value.reason
			});
		} else {
			perRelay.push({ relay, connected: false, events: 0, reason: 'rejected' });
		}
	});
	return { events: all, allFailed: !anyConnected, perRelay };
}

/**
 * Open a single WebSocket REQ subscription on `relay`, collect EVENT
 * messages until EOSE (or `timeoutMs`), then send CLOSE and resolve
 * with whatever was gathered. Always resolves — never rejects — so a
 * relay-level failure can't take down the parent `Promise.allSettled`.
 *
 * `connected` is true when the WebSocket reached the OPEN state at
 * least once. The caller uses this to detect the all-relays-down case.
 */
function collectFromRelay(
	relay: string,
	filter: Record<string, unknown>,
	timeoutMs: number
): Promise<{ events: NostrEvent[]; connected: boolean; reason?: string }> {
	return new Promise((resolve) => {
		// NIP-01 caps subscription IDs at 64 chars. UUIDv7 (36 chars)
		// + the "nf:" prefix = 39 chars: comfortably under the limit,
		// time-ordered, and globally unique without per-connection
		// bookkeeping.
		const subId = 'nf:' + uuidv7();
		const collected: NostrEvent[] = [];
		let settled = false;
		let connected = false;
		let reason: string | undefined;
		let ws: WebSocket;

		const finish = (why?: string) => {
			if (settled) return;
			settled = true;
			if (why && !reason) reason = why;
			try {
				if (ws && ws.readyState === WebSocket.OPEN) {
					ws.send(JSON.stringify(['CLOSE', subId]));
					ws.close();
				}
			} catch {
				/* ignore */
			}
			resolve({ events: collected, connected, reason });
		};

		const timer = setTimeout(() => finish('timeout'), timeoutMs);

		try {
			ws = new WebSocket(relay);
		} catch (err) {
			clearTimeout(timer);
			resolve({
				events: [],
				connected: false,
				reason: 'ctor:' + (err instanceof Error ? err.message : String(err))
			});
			return;
		}

		ws.onopen = () => {
			connected = true;
			ws.send(JSON.stringify(['REQ', subId, filter]));
		};

		ws.onmessage = (msg) => {
			try {
				const data = JSON.parse(msg.data) as unknown[];
				if (!Array.isArray(data) || data.length < 2) return;
				const tag = data[0];
				if (tag === 'EVENT' && data[1] === subId && data[2]) {
					collected.push(data[2] as NostrEvent);
				} else if (tag === 'EOSE' && data[1] === subId) {
					clearTimeout(timer);
					finish('eose');
				} else if (tag === 'NOTICE') {
					reason = 'notice:' + String(data[1]).slice(0, 80);
				} else if (tag === 'CLOSED' && data[1] === subId) {
					clearTimeout(timer);
					finish('closed:' + String(data[2] ?? '').slice(0, 80));
				}
			} catch {
				// skip malformed
			}
		};

		ws.onerror = () => {
			clearTimeout(timer);
			finish('error');
		};

		ws.onclose = (ev) => {
			clearTimeout(timer);
			finish('close:' + ev.code);
		};
	});
}
