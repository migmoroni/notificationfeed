/**
 * Atom normalizer (Plano B).
 */

import type { IngestedPost } from '$lib/persistence/post.store.js';
import { htmlToPlainText } from './content-text.js';

export interface AtomEntry {
	id: string;
	title: string;
	link: string;
	summary: string;
	content: string;
	updated: string;
	authorName?: string;
}

/**
 * Convert a parsed Atom 1.0 `<entry>` into an `IngestedPost`.
 *
 * Like the RSS normalizer, the post is `userId`-less — the PostManager
 * later inserts it into each interested user's box.
 *
 * Field choices:
 *  - `entry.id` is required by the Atom spec and is used as the post
 *    identity directly (already globally unique per feed).
 *  - Body prefers the richer `<content>` and falls back to `<summary>`.
 *  - `entry.updated` doubles as the publication timestamp (Atom
 *    distinguishes `<updated>` from `<published>`, but consumers care
 *    about "when did this post change" more than original creation).
 *  - Bad/missing dates fall back to "now" instead of NaN.
 */
export function normalizeAtomEntry(entry: AtomEntry, nodeId: string): IngestedPost {
	const now = Date.now();
	const published = entry.updated ? Date.parse(entry.updated) : NaN;
	return {
		id: entry.id,
		nodeId,
		protocol: 'atom',
		title: htmlToPlainText(entry.title),
		content: htmlToPlainText(entry.content || entry.summary),
		url: entry.link,
		author: htmlToPlainText(entry.authorName ?? ''),
		publishedAt: Number.isFinite(published) ? published : now,
		ingestedAt: now
	};
}
