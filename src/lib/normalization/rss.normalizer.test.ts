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
});
