/**
 * RSS ingestion client (Plano B).
 *
 * Supports RSS 2.0 (root <rss>) and RSS 1.0 (root <rdf:RDF>). Honors
 * Dublin Core (`dc:date`, `dc:creator`) and `content:encoded` extensions.
 * Goes through the `HttpAdapter` (Tauri direct or web-proxy chain).
 *
 * Conditional GET: passes `etag` / `lastModified` from the previous
 * `FetcherState`; on 304 returns an empty post list with the previous
 * cache headers preserved.
 *
 * Some proxies (e.g. rss2json) pre-parse RSS into JSON. The web adapter
 * auto-detects this from the response `Content-Type` / body shape and
 * flags such responses with `parsedAs: 'rss-json'` so we skip the
 * XML parser and map the JSON shape directly.
 */

import type { FontRssConfig } from '$lib/domain/content-tree/content-tree.js';
import type { ProtocolFetcherState } from '$lib/domain/ingestion/fetcher-state.js';
import type { IngestedPost } from '$lib/persistence/post.store.js';
import { normalizeRssItem, type RssItem } from '$lib/normalization/rss.normalizer.js';
import type { HttpAdapter } from '$lib/ingestion/net/index.js';

export interface FetchResult {
	posts: IngestedPost[];
	nextState: Pick<ProtocolFetcherState, 'etag' | 'lastModified' | 'lastFetchedAt' | 'lastSuccessAt'>;
}

/**
 * Fetch a single RSS feed and return the normalized posts.
 *
 * Honors conditional GET via the previous `FetcherState`: a `304 Not
 * Modified` short-circuits the parser and returns `posts: []` while
 * preserving the cache headers. On 2xx, picks between XML parsing and
 * the rss2json JSON shape based on `response.parsedAs`.
 */
export async function fetchRssFeed(
	http: HttpAdapter,
	config: FontRssConfig,
	nodeId: string,
	prev: ProtocolFetcherState | null
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

	const items =
		response.parsedAs === 'rss-json'
			? parseRss2JsonResponse(response.body)
			: parseRssXml(response.body);

	const posts = items.map((item) => normalizeRssItem(item, nodeId));

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

// ── XML parsing (RSS 2.0 + RSS 1.0/RDF) ────────────────────────────────

// XML namespace identifiers — opaque strings used only for local
// `getElementsByTagNameNS` matching against the `xmlns:*` declarations
// embedded in each feed. These URLs are NEVER fetched at runtime; they
// are part of the RSS / Dublin Core specifications and would still work
// even if the hosting domains went offline forever.
const NS_DC = 'http://purl.org/dc/elements/1.1/';
const NS_CONTENT = 'http://purl.org/rss/1.0/modules/content/';

/**
 * Parse an RSS XML document into raw `RssItem`s. Tolerates RSS 2.0
 * (`<rss><channel>`) and RSS 1.0 / RDF (`<rdf:RDF>`) since both wrap
 * `<item>` elements at some depth. Returns `[]` on parse error.
 */
function parseRssXml(xml: string): RssItem[] {
	const parser = new DOMParser();
	const doc = parser.parseFromString(xml, 'text/xml');
	if (doc.querySelector('parsererror')) return [];

	// Both <rss><channel><item> and <rdf:RDF><item> use the same <item> tag.
	const itemNodes = Array.from(doc.getElementsByTagName('item'));
	return itemNodes.map((item) => extractRssItem(item));
}

/**
 * Pull all interesting fields out of a single `<item>` element,
 * preferring the richer `content:encoded` body (when present) over
 * `<description>`, and synthesising a stable `guid` when the feed
 * itself doesn't provide one.
 */
function extractRssItem(item: Element): RssItem {
	const title = textOf(item, 'title');
	const link = linkOf(item);
	const description = textOf(item, 'description');
	const contentEncoded = nsTextOf(item, NS_CONTENT, 'encoded');
	const pubDate = textOf(item, 'pubDate') || nsTextOf(item, NS_DC, 'date');
	const guid = textOf(item, 'guid') || link || `${title}|${pubDate}`;
	const author =
		textOf(item, 'author') ||
		nsTextOf(item, NS_DC, 'creator') ||
		undefined;

	return {
		title,
		link,
		description: contentEncoded || description,
		pubDate,
		guid,
		author
	};
}

/**
 * Resolve the post URL from an `<item>`. RSS 2.0 uses `<link>` text;
 * RSS 1.0/RDF tends to use the element attribute `rdf:about`.
 */
function linkOf(item: Element): string {
	const linkText = textOf(item, 'link');
	if (linkText) return linkText;
	return item.getAttribute('rdf:about') ?? '';
}

/** Return the trimmed text of the first `<tag>` child, or `''`. */
function textOf(parent: Element, tag: string): string {
	return parent.getElementsByTagName(tag)[0]?.textContent?.trim() ?? '';
}

/**
 * Same as `textOf` but namespace-aware. Used for Dublin Core
 * (`dc:date`, `dc:creator`) and `content:encoded` fields, which
 * `getElementsByTagName` would miss in strict-XML mode.
 */
function nsTextOf(parent: Element, ns: string, local: string): string {
	return parent.getElementsByTagNameNS(ns, local)[0]?.textContent?.trim() ?? '';
}

// ── rss2json JSON shape ────────────────────────────────────────────────

interface Rss2JsonItem {
	title?: string;
	link?: string;
	guid?: string;
	pubDate?: string;
	author?: string;
	description?: string;
	content?: string;
}

interface Rss2JsonEnvelope {
	status?: string;
	items?: Rss2JsonItem[];
}

/**
 * Map an rss2json envelope (`{ status, items: [...] }`) to the same
 * `RssItem` shape produced by the XML parser, so downstream code
 * doesn't care how the proxy delivered the feed.
 */
function parseRss2JsonResponse(body: string): RssItem[] {
	let parsed: Rss2JsonEnvelope;
	try {
		parsed = JSON.parse(body);
	} catch {
		return [];
	}
	if (parsed.status && parsed.status !== 'ok') return [];
	return (parsed.items ?? []).map((it) => ({
		title: it.title ?? '',
		link: it.link ?? '',
		description: it.content || it.description || '',
		pubDate: it.pubDate ?? '',
		guid: it.guid ?? it.link ?? undefined,
		author: it.author ?? undefined
	}));
}
