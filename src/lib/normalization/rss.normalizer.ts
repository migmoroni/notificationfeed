/**
 * RSS normalizer (Plano B).
 *
 * Transforms a parsed RSS item into an IngestedPost (no userId — the
 * PostManager assigns it per box).
 */

import type { IngestedPost } from '$lib/persistence/post.store.js';
import { htmlToPlainText } from './content-text.js';

export interface RssItem {
	title: string;
	link: string;
	description: string;
	pubDate: string;
	guid?: string;
	author?: string;
}

/**
 * Convert a parsed RSS item into an `IngestedPost`.
 *
 * The result is intentionally `userId`-less — the PostManager fans the
 * post out to every interested user box, assigning the owning userId
 * at insert time.
 *
 * Identity rules:
 *  - Prefer the feed's `<guid>`; fall back to `<link>` when missing,
 *    so reruns of the same item across fetches stay deduplicated.
 *  - `<pubDate>` is parsed via `Date.parse`; on invalid/empty values
 *    we fall back to "now" so the post still surfaces in the feed in
 *    a sane order.
 *  - HTML in `description` / `content:encoded` is converted to plain
 *    text so feed cards and notifications never display markup.
 */
export function normalizeRssItem(item: RssItem, nodeId: string): IngestedPost {
	const now = Date.now();
	const published = item.pubDate ? Date.parse(item.pubDate) : NaN;
	return {
		id: item.guid ?? item.link,
		nodeId,
		protocol: 'rss',
		title: htmlToPlainText(item.title),
		content: htmlToPlainText(item.description),
		url: item.link,
		author: htmlToPlainText(item.author ?? ''),
		publishedAt: Number.isFinite(published) ? published : now,
		ingestedAt: now
	};
}
