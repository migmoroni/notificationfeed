/**
 * RSS normalizer.
 *
 * Transforms a parsed RSS item into a CanonicalPost.
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

export function normalizeRssItem(item: RssItem, fontId: string): CanonicalPost {
	return {
		id: item.guid ?? item.link,
		fontId,
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
