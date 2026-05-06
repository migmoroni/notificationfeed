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

	it('keeps imageUrl when provided by parser', () => {
		const entry: AtomEntry = {
			id: 'entry-2',
			title: 'Atom with image',
			link: 'https://example.com/entry-2',
			summary: 'Summary',
			content: 'Content',
			updated: '2026-04-01T12:00:00Z',
			imageUrl: 'https://cdn.example.com/media/cover.jpg'
		};

		const post = normalizeAtomEntry(entry, NODE_ID);
		expect(post.imageUrl).toBe('https://cdn.example.com/media/cover.jpg');
	});

	it('extracts imageUrl from content html when parser did not provide one', () => {
		const entry: AtomEntry = {
			id: 'entry-3',
			title: 'Atom content image',
			link: 'https://example.com/entry-3',
			summary: '<p>Summary</p>',
			content: '<p><img src="https://images.example.com/pic.webp" alt="" /></p>',
			updated: '2026-04-01T12:00:00Z'
		};

		const post = normalizeAtomEntry(entry, NODE_ID);
		expect(post.imageUrl).toBe('https://images.example.com/pic.webp');
	});

	it('keeps videoUrl when provided by parser', () => {
		const entry: AtomEntry = {
			id: 'entry-4',
			title: 'Atom with video',
			link: 'https://example.com/entry-4',
			summary: 'Summary',
			content: 'Content',
			updated: '2026-04-01T12:00:00Z',
			videoUrl: 'https://cdn.example.com/media/clip.mp4'
		};

		const post = normalizeAtomEntry(entry, NODE_ID);
		expect(post.videoUrl).toBe('https://cdn.example.com/media/clip.mp4');
	});
});
