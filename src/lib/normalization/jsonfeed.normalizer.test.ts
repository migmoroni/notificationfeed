/**
 * Unit tests for the JSON Feed normalizer.
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { normalizeJsonfeedItem, type JsonfeedItem } from './jsonfeed.normalizer.js';

const NODE_ID = 'tree-1:font-1';

describe('normalizeJsonfeedItem', () => {
	afterEach(() => {
		vi.useRealTimers();
	});

	it('uses item.id as identity and emits protocol "jsonfeed"', () => {
		const item: JsonfeedItem = {
			id: 'https://example.com/posts/1',
			url: 'https://example.com/posts/1',
			title: 'Hello',
			content_html: '<p>Hello</p>',
			date_published: '2026-04-01T12:00:00Z'
		};

		const post = normalizeJsonfeedItem(item, NODE_ID);

		expect(post.id).toBe('https://example.com/posts/1');
		expect(post.nodeId).toBe(NODE_ID);
		expect(post.protocol).toBe('jsonfeed');
		expect(post.title).toBe('Hello');
		expect(post.content).toBe('<p>Hello</p>');
	});

	it('falls back to item.url when item.id is missing', () => {
		const item: JsonfeedItem = {
			url: 'https://example.com/posts/2',
			title: 'No Id'
		};

		const post = normalizeJsonfeedItem(item, NODE_ID);

		expect(post.id).toBe('https://example.com/posts/2');
		expect(post.url).toBe('https://example.com/posts/2');
	});

	it('prefers content_html over content_text and summary', () => {
		const item: JsonfeedItem = {
			id: 'a',
			content_html: '<b>html</b>',
			content_text: 'plain',
			summary: 'sum'
		};

		expect(normalizeJsonfeedItem(item, NODE_ID).content).toBe('<b>html</b>');
	});

	it('falls back to content_text when content_html missing', () => {
		const item: JsonfeedItem = { id: 'a', content_text: 'plain', summary: 'sum' };
		expect(normalizeJsonfeedItem(item, NODE_ID).content).toBe('plain');
	});

	it('falls back to summary when both content fields missing', () => {
		const item: JsonfeedItem = { id: 'a', summary: 'sum' };
		expect(normalizeJsonfeedItem(item, NODE_ID).content).toBe('sum');
	});

	it('uses external_url when url missing', () => {
		const item: JsonfeedItem = { id: 'a', external_url: 'https://other.example/x' };
		expect(normalizeJsonfeedItem(item, NODE_ID).url).toBe('https://other.example/x');
	});

	it('reads v1.1 authors[0].name', () => {
		const item: JsonfeedItem = {
			id: 'a',
			authors: [{ name: 'Alice' }, { name: 'Bob' }]
		};
		expect(normalizeJsonfeedItem(item, NODE_ID).author).toBe('Alice');
	});

	it('falls back to v1 author.name when authors missing', () => {
		const item: JsonfeedItem = { id: 'a', author: { name: 'Legacy' } };
		expect(normalizeJsonfeedItem(item, NODE_ID).author).toBe('Legacy');
	});

	it('emits empty author when neither field present', () => {
		const item: JsonfeedItem = { id: 'a' };
		expect(normalizeJsonfeedItem(item, NODE_ID).author).toBe('');
	});

	it('falls back to date_modified when date_published missing', () => {
		const item: JsonfeedItem = { id: 'a', date_modified: '2026-04-01T12:00:00Z' };
		const post = normalizeJsonfeedItem(item, NODE_ID);
		expect(post.publishedAt).toBe(Date.parse('2026-04-01T12:00:00Z'));
	});

	it('falls back to "now" when no date is present', () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date('2026-04-01T00:00:00Z'));
		const item: JsonfeedItem = { id: 'a' };
		const post = normalizeJsonfeedItem(item, NODE_ID);
		expect(post.publishedAt).toBe(Date.parse('2026-04-01T00:00:00Z'));
	});

	it('falls back to "now" when date string is malformed', () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date('2026-04-01T00:00:00Z'));
		const item: JsonfeedItem = { id: 'a', date_published: 'not-a-date' };
		const post = normalizeJsonfeedItem(item, NODE_ID);
		expect(post.publishedAt).toBe(Date.parse('2026-04-01T00:00:00Z'));
	});
});
