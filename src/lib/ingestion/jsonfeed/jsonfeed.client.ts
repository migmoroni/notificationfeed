/**
 * JSON Feed ingestion client.
 *
 * Goes through the `HttpAdapter` (Tauri direct or web-proxy chain) to
 * fetch the feed document and `JSON.parse` it. Honors conditional GET
 * via the previous `FetcherState` (`If-None-Match`, `If-Modified-Since`):
 * a `304 Not Modified` short-circuits the parser and returns `posts: []`
 * while preserving the cache headers.
 *
 * Lenient parsing: malformed JSON or a missing `items` array yields
 * `posts: []` (and still updates cache headers) rather than throwing,
 * matching the RSS client's handling of XML parse errors.
 */

import type { FontJsonfeedConfig } from '$lib/domain/content-tree/content-tree.js';
import type { FetcherState } from '$lib/domain/ingestion/fetcher-state.js';
import type { IngestedPost } from '$lib/persistence/post.store.js';
import {
	normalizeJsonfeedItem,
	type JsonfeedDocument,
	type JsonfeedItem
} from '$lib/normalization/jsonfeed.normalizer.js';
import type { HttpAdapter } from '$lib/ingestion/net/index.js';

export interface FetchResult {
	posts: IngestedPost[];
	nextState: Pick<FetcherState, 'etag' | 'lastModified' | 'lastFetchedAt' | 'lastSuccessAt'>;
}

/**
 * Fetch a single JSON Feed and return the normalized posts.
 */
export async function fetchJsonfeedFeed(
	http: HttpAdapter,
	config: FontJsonfeedConfig,
	nodeId: string,
	prev: FetcherState | null
): Promise<FetchResult> {
	const now = Date.now();
	const response = await http.fetchText(config.url, {
		etag: prev?.etag ?? null,
		lastModified: prev?.lastModified ?? null
	});

	if (response.status === 304) {
		return {
			posts: [],
			nextState: {
				etag: response.etag ?? prev?.etag ?? null,
				lastModified: response.lastModified ?? prev?.lastModified ?? null,
				lastFetchedAt: now,
				lastSuccessAt: now
			}
		};
	}

	const items = parseJsonfeedBody(response.body);
	const posts = items.map((item) => normalizeJsonfeedItem(item, nodeId));

	return {
		posts,
		nextState: {
			etag: response.etag,
			lastModified: response.lastModified,
			lastFetchedAt: now,
			lastSuccessAt: now
		}
	};
}

/**
 * Parse a JSON Feed document body. Returns `[]` on JSON syntax errors,
 * non-object roots, or a missing/non-array `items` field.
 */
function parseJsonfeedBody(body: string): JsonfeedItem[] {
	let doc: unknown;
	try {
		doc = JSON.parse(body);
	} catch {
		return [];
	}
	if (!doc || typeof doc !== 'object') return [];
	const items = (doc as JsonfeedDocument).items;
	if (!Array.isArray(items)) return [];
	return items;
}
