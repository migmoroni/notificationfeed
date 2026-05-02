import { describe, expect, it } from 'vitest';
import { normalizeAtomEntry, type AtomEntry } from './atom.normalizer.js';

const NODE_ID = 'tree-1:font-1';

describe('normalizeAtomEntry', () => {
	it('converts HTML content to plain text', () => {
		const entry: AtomEntry = {
			id: 'entry-1',
			title: 'Atom &amp; Markup',
			link: 'https://example.com/entry-1',
			summary: '<p>Summary fallback</p>',
			content: '<div>Full <em>content</em>&nbsp;wins.</div>',
			updated: '2026-04-01T12:00:00Z',
			authorName: '<span>Alice</span>'
		};

		const post = normalizeAtomEntry(entry, NODE_ID);

		expect(post.title).toBe('Atom & Markup');
		expect(post.content).toBe('Full content wins.');
		expect(post.author).toBe('Alice');
	});
});
