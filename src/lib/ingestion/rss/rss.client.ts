/**
 * RSS ingestion client.
 *
 * Fetches and parses RSS 2.0 feeds from a given URL.
 */

import type { FontRssConfig } from '$lib/domain/font/font.js';
import type { CanonicalPost } from '$lib/normalization/canonical-post.js';
import { normalizeRssItem, type RssItem } from '$lib/normalization/rss.normalizer.js';

export async function fetchRssFeed(config: FontRssConfig, fontId: string): Promise<CanonicalPost[]> {
	const response = await fetch(config.url);
	const text = await response.text();
	const items = parseRssXml(text);

	return items.map((item) => normalizeRssItem(item, fontId));
}

function parseRssXml(xml: string): RssItem[] {
	const parser = new DOMParser();
	const doc = parser.parseFromString(xml, 'text/xml');
	const items = doc.querySelectorAll('item');

	return Array.from(items).map((item) => ({
		title: item.querySelector('title')?.textContent ?? '',
		link: item.querySelector('link')?.textContent ?? '',
		description: item.querySelector('description')?.textContent ?? '',
		pubDate: item.querySelector('pubDate')?.textContent ?? '',
		guid: item.querySelector('guid')?.textContent ?? undefined,
		author: item.querySelector('author')?.textContent ?? undefined
	}));
}
