/**
 * Atom ingestion client (Plano B).
 *
 * Atom 1.0 — prefers `<content>` over `<summary>`, picks the first
 * `<link rel="alternate">` (or first link without rel) for the URL,
 * uses `<updated>` (with `<published>` fallback) for `publishedAt`.
 * Conditional GET via the shared `HttpAdapter`.
 */

import type { FontAtomConfig } from '$lib/domain/content-tree/content-tree.js';
import type { ProtocolFetcherState } from '$lib/domain/ingestion/fetcher-state.js';
import type { IngestedPost } from '$lib/persistence/post.store.js';
import { normalizeAtomEntry, type AtomEntry } from '$lib/normalization/atom.normalizer.js';
import type { HttpAdapter } from '$lib/ingestion/net/index.js';

export interface FetchResult {
	posts: IngestedPost[];
	nextState: Pick<ProtocolFetcherState, 'etag' | 'lastModified' | 'lastFetchedAt' | 'lastSuccessAt'>;
}

/**
 * Fetch a single Atom 1.0 feed and return the normalized posts.
 * Honors conditional GET (`If-None-Match` + `If-Modified-Since`); a
 * `304 Not Modified` short-circuits parsing and returns an empty
 * post list with cache headers preserved.
 */
export async function fetchAtomFeed(
	http: HttpAdapter,
	config: FontAtomConfig,
	nodeId: string,
	prev: ProtocolFetcherState | null
): Promise<FetchResult> {
	const now = Date.now();
	const response = await http.fetchText(config.url, {
		feedKind: 'atom',
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

	const entries = parseAtomXml(response.body);
	const posts = entries.map((entry) => normalizeAtomEntry(entry, nodeId));

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
 * Parse an Atom XML document into raw `AtomEntry`s. Returns `[]` on
 * parse error so a single broken response can never crash the tick.
 */
function parseAtomXml(xml: string): AtomEntry[] {
	// Sniff before DOMParser: the browser logs "XML Parsing Error" to
	// the console synchronously on malformed input, which is noisy when
	// upstream feeds answer with HTML error pages through the proxy.
	if (!looksLikeXml(xml)) return [];
	const parser = new DOMParser();
	const doc = parser.parseFromString(xml, 'text/xml');
	if (doc.querySelector('parsererror')) return [];

	return Array.from(doc.getElementsByTagName('entry')).map((entry) => ({
		id: textOf(entry, 'id'),
		title: textOf(entry, 'title'),
		link: pickAlternateLink(entry),
		summary: textOf(entry, 'summary'),
		content: textOf(entry, 'content'),
		updated: textOf(entry, 'updated') || textOf(entry, 'published'),
		authorName: textOfPath(entry, 'author', 'name') || undefined
	}));
}

/**
 * Resolve the entry URL from an Atom `<entry>`. Atom may emit
 * multiple `<link>` elements with different `rel` values; we prefer
 * the explicit `rel="alternate"` (or links without a `rel` attribute,
 * which default to alternate per spec) and fall back to the first
 * link otherwise.
 */
function pickAlternateLink(entry: Element): string {
	const links = Array.from(entry.getElementsByTagName('link'));
	const alt = links.find((l) => (l.getAttribute('rel') ?? 'alternate') === 'alternate');
	return alt?.getAttribute('href') ?? links[0]?.getAttribute('href') ?? '';
}

/** Return the trimmed text of the first `<tag>` child, or `''`. */
function textOf(parent: Element, tag: string): string {
	return parent.getElementsByTagName(tag)[0]?.textContent?.trim() ?? '';
}

/**
 * Walk a chain of nested tag names (e.g. `author > name`) and return
 * the text of the leaf, or `''` if any link in the chain is missing.
 */
function textOfPath(parent: Element, ...path: string[]): string {
	let cur: Element | undefined = parent;
	for (const tag of path) {
		cur = cur?.getElementsByTagName(tag)[0];
		if (!cur) return '';
	}
	return cur?.textContent?.trim() ?? '';
}

/**
 * Cheap sniff to decide whether the body is worth handing to
 * `DOMParser`. Avoids the synchronous "XML Parsing Error" console
 * noise that the browser writes for HTML / plain-text / empty bodies.
 */
function looksLikeXml(text: string): boolean {
	const trimmed = text.trimStart();
	if (!trimmed.startsWith('<')) return false;
	const head = trimmed.slice(0, 256).toLowerCase();
	if (head.startsWith('<!doctype html') || head.startsWith('<html')) return false;
	return true;
}
