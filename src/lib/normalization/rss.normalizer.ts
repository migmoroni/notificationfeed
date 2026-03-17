/**
 * RSS normalizer v2.
 *
 * Transforms a parsed RSS item into a CanonicalPost (v2: nodeId instead of fontId).
 */

import type { CanonicalPost } from './canonical-post.js';

export interface RssItem {
	title: string;
	link: string;
	description: string;
	pubDate: string;
	guid?: string;
	author?: string;
}

export function normalizeRssItem(item: RssItem, nodeId: string): CanonicalPost {
	return {
		id: item.guid ?? item.link,
		nodeId,
		protocol: 'rss',
		title: item.title,
		content: item.description,
		url: item.link,
		author: item.author ?? '',
		publishedAt: item.pubDate ? new Date(item.pubDate) : new Date(),
		ingestedAt: new Date(),
		read: false
	};
}
