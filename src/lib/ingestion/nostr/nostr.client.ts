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
import type { FetcherState } from '$lib/domain/ingestion/fetcher-state.js';
import type { IngestedPost } from '$lib/persistence/post.store.js';
import { normalizeNostrEvent } from '$lib/normalization/nostr.normalizer.js';
import { INGESTION_FETCH } from '$lib/config/back-settings.js';

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
const DEFAULT_TIMEOUT_MS = INGESTION_FETCH.nostrEoseTimeoutMs;

export interface FetchResult {
	posts: IngestedPost[];
	nextState: Pick<FetcherState, 'lastFetchedAt' | 'lastSuccessAt' | 'nostrSince'>;
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
	prev: FetcherState | null,
	opts: FetchNostrOpts = {}
): Promise<FetchResult> {
	const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
	const limit = opts.limit ?? DEFAULT_LIMIT;
	const kinds = config.kinds && config.kinds.length > 0 ? config.kinds : DEFAULT_KINDS;
	const since = prev?.nostrSince ?? null;

	const filter: Record<string, unknown> = {
		authors: [config.pubkey],
		kinds,
		limit
	};
	if (since !== null) filter.since = since;

	const events = await collectFromRelays(config.relays, nodeId, filter, timeoutMs);

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
 */
async function collectFromRelays(
	relays: string[],
	nodeId: string,
	filter: Record<string, unknown>,
	timeoutMs: number
): Promise<NostrEvent[]> {
	const results = await Promise.allSettled(
		relays.map((relay) => collectFromRelay(relay, nodeId, filter, timeoutMs))
	);
	const all: NostrEvent[] = [];
	for (const r of results) {
		if (r.status === 'fulfilled') all.push(...r.value);
	}
	return all;
}

/**
 * Open a single WebSocket REQ subscription on `relay`, collect EVENT
 * messages until EOSE (or `timeoutMs`), then send CLOSE and resolve
 * with whatever was gathered. Always resolves — never rejects — so a
 * relay-level failure can't take down the parent `Promise.allSettled`.
 */
function collectFromRelay(
	relay: string,
	nodeId: string,
	filter: Record<string, unknown>,
	timeoutMs: number
): Promise<NostrEvent[]> {
	return new Promise((resolve) => {
		const subId = `notfeed:${nodeId}:${Math.random().toString(36).slice(2, 10)}`;
		const collected: NostrEvent[] = [];
		let settled = false;
		let ws: WebSocket;

		const finish = () => {
			if (settled) return;
			settled = true;
			try {
				if (ws && ws.readyState === WebSocket.OPEN) {
					ws.send(JSON.stringify(['CLOSE', subId]));
					ws.close();
				}
			} catch {
				/* ignore */
			}
			resolve(collected);
		};

		const timer = setTimeout(finish, timeoutMs);

		try {
			ws = new WebSocket(relay);
		} catch {
			clearTimeout(timer);
			resolve([]);
			return;
		}

		ws.onopen = () => {
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
					finish();
				}
			} catch {
				// skip malformed
			}
		};

		ws.onerror = () => {
			clearTimeout(timer);
			finish();
		};

		ws.onclose = () => {
			clearTimeout(timer);
			finish();
		};
	});
}
