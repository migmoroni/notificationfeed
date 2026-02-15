/**
 * Atom normalizer.
 *
 * Transforms a parsed Atom entry into a CanonicalPost.
 */

import type { CanonicalPost } from './canonical-post.js';

export interface AtomEntry {
	id: string;
	title: string;
	link: string;
	summary: string;
	content: string;
	updated: string;
	authorName?: string;
}

export function normalizeAtomEntry(entry: AtomEntry, fontId: string): CanonicalPost {
	return {
		id: entry.id,
		fontId,
		protocol: 'atom',
		title: entry.title,
		content: entry.content || entry.summary,
		url: entry.link,
		author: entry.authorName ?? '',
		publishedAt: entry.updated ? new Date(entry.updated) : new Date(),
		ingestedAt: new Date(),
		read: false
	};
}
