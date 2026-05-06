import { describe, expect, it } from 'vitest';
import { normalizeRssItem, type RssItem } from './rss.normalizer.js';

const NODE_ID = 'tree-1:font-1';

describe('normalizeRssItem', () => {
	it('converts HTML descriptions to plain text', () => {
		const item: RssItem = {
			title: '<b>Patch Tuesday</b>',
			link: 'https://example.com/post',
			description: '<p><strong>Microsoft</strong> fixed 167 issues&nbsp;today.</p>',
			pubDate: '2026-04-01T12:00:00Z',
			author: 'Security&nbsp;Team'
		};

		const post = normalizeRssItem(item, NODE_ID);

		expect(post.title).toBe('Patch Tuesday');
		expect(post.content).toBe('Microsoft fixed 167 issues today.');
		expect(post.author).toBe('Security Team');
	});

	it('keeps imageUrl when present in parsed item', () => {
		const item: RssItem = {
			title: 'Post with image',
			link: 'https://example.com/post-with-image',
			description: 'Body',
			pubDate: '2026-04-01T12:00:00Z',
			imageUrl: 'https://cdn.example.com/post-with-image.jpg'
		};

		const post = normalizeRssItem(item, NODE_ID);
		expect(post.imageUrl).toBe('https://cdn.example.com/post-with-image.jpg');
	});

	it('extracts imageUrl from description html when parser hint is absent', () => {
		const item: RssItem = {
			title: 'Post with inline image',
			link: 'https://example.com/post-inline-image',
			description: '<p><img src="https://images.example.com/post-inline-image.avif" /></p>',
			pubDate: '2026-04-01T12:00:00Z'
		};

		const post = normalizeRssItem(item, NODE_ID);
		expect(post.imageUrl).toBe('https://images.example.com/post-inline-image.avif');
	});

	it('keeps videoUrl when present in parsed item', () => {
		const item: RssItem = {
			title: 'Post with video',
			link: 'https://example.com/post-with-video',
			description: 'Body',
			pubDate: '2026-04-01T12:00:00Z',
			videoUrl: 'https://cdn.example.com/post-with-video.mp4'
		};

		const post = normalizeRssItem(item, NODE_ID);
		expect(post.videoUrl).toBe('https://cdn.example.com/post-with-video.mp4');
	});

	it('normalizes youtube videoUrl to canonical watch URL', () => {
		const item: RssItem = {
			title: 'Post with youtube video',
			link: 'https://example.com/post-with-youtube',
			description: 'Body',
			pubDate: '2026-04-01T12:00:00Z',
			videoUrl: 'https://youtu.be/dQw4w9WgXcQ'
		};

		const post = normalizeRssItem(item, NODE_ID);
		expect(post.videoUrl).toBe('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
	});

	it('keeps audioUrl when present in parsed item', () => {
		const item: RssItem = {
			title: 'Post with audio',
			link: 'https://example.com/post-with-audio',
			description: 'Body',
			pubDate: '2026-04-01T12:00:00Z',
			audioUrl: 'https://cdn.example.com/post-with-audio.mp3'
		};

		const post = normalizeRssItem(item, NODE_ID);
		expect(post.audioUrl).toBe('https://cdn.example.com/post-with-audio.mp3');
	});

	it('normalizes spotify audioUrl to canonical open.spotify URL', () => {
		const item: RssItem = {
			title: 'Post with spotify audio',
			link: 'https://example.com/post-with-spotify',
			description: 'Body',
			pubDate: '2026-04-01T12:00:00Z',
			audioUrl: 'https://open.spotify.com/embed/track/4uLU6hMCjMI75M1A2tKUQC'
		};

		const post = normalizeRssItem(item, NODE_ID);
		expect(post.audioUrl).toBe('https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC');
	});
});
