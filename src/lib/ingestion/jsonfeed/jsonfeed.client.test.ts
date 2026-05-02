/**
 * Unit tests for the JSON Feed ingestion client.
 */

import { describe, it, expect } from 'vitest';
import { fetchJsonfeedFeed } from './jsonfeed.client.js';
import type { HttpAdapter, HttpRequestOpts, HttpResponse } from '$lib/ingestion/net/index.js';
import type { ProtocolFetcherState } from '$lib/domain/ingestion/fetcher-state.js';

const NODE_ID = 'tree-1:font-1';
const URL = 'https://example.com/feed.json';

function makeAdapter(response: HttpResponse, captured?: { opts?: HttpRequestOpts }): HttpAdapter {
	return {
		async fetchText(_url: string, opts?: HttpRequestOpts): Promise<HttpResponse> {
			if (captured) captured.opts = opts;
			return response;
		}
	};
}

function emptyState(): ProtocolFetcherState {
	return {
		entryId: 'entry-1',
		etag: null,
		lastModified: null,
		nostrSince: null,
		consecutiveFailures: 0,
		failureCount: 0,
		lastFetchedAt: 0,
		lastAttemptAt: 0,
		lastSuccessAt: null,
		score: 0,
		successRate: 1,
		lastLatencyMs: 0,
		avgLatencyMs: 0,
		circuitState: 'CLOSED',
		backoffUntil: null
	};
}

describe('fetchJsonfeedFeed', () => {
	it('parses a valid JSON Feed document into posts', async () => {
		const body = JSON.stringify({
			version: 'https://jsonfeed.org/version/1.1',
			items: [
				{
					id: 'p1',
					url: 'https://example.com/p1',
					title: 'First',
					content_html: '<p>1</p>',
					date_published: '2026-04-01T00:00:00Z'
				},
				{
					id: 'p2',
					url: 'https://example.com/p2',
					title: 'Second',
					content_text: '2'
				}
			]
		});

		const adapter = makeAdapter({
			status: 200,
			body,
			etag: '"abc"',
			lastModified: 'Wed, 01 Apr 2026 00:00:00 GMT',
			parsedAs: 'raw'
		});

		const result = await fetchJsonfeedFeed(adapter, { url: URL }, NODE_ID, null);

		expect(result.posts).toHaveLength(2);
		expect(result.posts[0].id).toBe('p1');
		expect(result.posts[0].protocol).toBe('jsonfeed');
		expect(result.posts[0].nodeId).toBe(NODE_ID);
		expect(result.nextState.etag).toBe('"abc"');
		expect(result.nextState.lastModified).toBe('Wed, 01 Apr 2026 00:00:00 GMT');
	});

	it('passes prior etag/lastModified for conditional GET', async () => {
		const captured: { opts?: HttpRequestOpts } = {};
		const adapter = makeAdapter(
			{ status: 200, body: '{"items":[]}', etag: null, lastModified: null, parsedAs: 'raw' },
			captured
		);

		const prev: ProtocolFetcherState = {
			...emptyState(),
			etag: '"old"',
			lastModified: 'Tue, 31 Mar 2026 00:00:00 GMT'
		};

		await fetchJsonfeedFeed(adapter, { url: URL }, NODE_ID, prev);

		expect(captured.opts?.etag).toBe('"old"');
		expect(captured.opts?.lastModified).toBe('Tue, 31 Mar 2026 00:00:00 GMT');
	});

	it('short-circuits on 304 and preserves prior cache headers', async () => {
		const adapter = makeAdapter({
			status: 304,
			body: '',
			etag: null,
			lastModified: null,
			parsedAs: 'raw'
		});

		const prev: ProtocolFetcherState = { ...emptyState(), etag: '"old"', lastModified: 'X' };
		const result = await fetchJsonfeedFeed(adapter, { url: URL }, NODE_ID, prev);

		expect(result.posts).toEqual([]);
		expect(result.nextState.etag).toBe('"old"');
		expect(result.nextState.lastModified).toBe('X');
	});

	it('returns empty posts on malformed JSON', async () => {
		const adapter = makeAdapter({
			status: 200,
			body: 'not json{',
			etag: null,
			lastModified: null,
			parsedAs: 'raw'
		});

		const result = await fetchJsonfeedFeed(adapter, { url: URL }, NODE_ID, null);
		expect(result.posts).toEqual([]);
	});

	it('returns empty posts when items is missing or not an array', async () => {
		const adapter = makeAdapter({
			status: 200,
			body: JSON.stringify({ version: '1', items: 'oops' }),
			etag: null,
			lastModified: null,
			parsedAs: 'raw'
		});

		const result = await fetchJsonfeedFeed(adapter, { url: URL }, NODE_ID, null);
		expect(result.posts).toEqual([]);
	});

	it('returns empty posts when document is not an object', async () => {
		const adapter = makeAdapter({
			status: 200,
			body: 'null',
			etag: null,
			lastModified: null,
			parsedAs: 'raw'
		});

		const result = await fetchJsonfeedFeed(adapter, { url: URL }, NODE_ID, null);
		expect(result.posts).toEqual([]);
	});
});
