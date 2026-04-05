/**
 * Atom ingestion client.
 *
 * Fetches and parses Atom feeds. Uses nodeId instead of fontId.
 */

import type { FontAtomConfig } from '$lib/domain/content-tree/content-tree.js';
import type { CanonicalPost } from '$lib/normalization/canonical-post.js';
import { normalizeAtomEntry, type AtomEntry } from '$lib/normalization/atom.normalizer.js';

export async function fetchAtomFeed(config: FontAtomConfig, nodeId: string): Promise<CanonicalPost[]> {
	const response = await fetch(config.url);
	const text = await response.text();
	const entries = parseAtomXml(text);

	return entries.map((entry) => normalizeAtomEntry(entry, nodeId));
}

function parseAtomXml(xml: string): AtomEntry[] {
	const parser = new DOMParser();
	const doc = parser.parseFromString(xml, 'text/xml');
	const entries = doc.querySelectorAll('entry');

	return Array.from(entries).map((entry) => ({
		id: entry.querySelector('id')?.textContent ?? '',
		title: entry.querySelector('title')?.textContent ?? '',
		link: entry.querySelector('link')?.getAttribute('href') ?? '',
		summary: entry.querySelector('summary')?.textContent ?? '',
		content: entry.querySelector('content')?.textContent ?? '',
		updated: entry.querySelector('updated')?.textContent ?? '',
		authorName: entry.querySelector('author > name')?.textContent ?? undefined
	}));
}
