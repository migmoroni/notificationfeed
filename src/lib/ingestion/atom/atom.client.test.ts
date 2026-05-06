import { describe, expect, it } from 'vitest';
import { fetchAtomFeed } from './atom.client.js';
import type { HttpAdapter, HttpRequestOpts, HttpResponse } from '$lib/ingestion/net/index.js';
import type { ProtocolFetcherState } from '$lib/domain/ingestion/fetcher-state.js';

const NODE_ID = 'tree-1:font-1';
const URL = 'https://example.com/feed.atom';

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

describe('fetchAtomFeed', () => {
	it('captures image from media:thumbnail', async () => {
		const body = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom" xmlns:media="http://search.yahoo.com/mrss/">
	<entry>
		<id>urn:post:1</id>
		<title>Post 1</title>
		<link rel="alternate" href="https://example.com/posts/1" />
		<updated>2026-05-05T10:00:00Z</updated>
		<summary>summary</summary>
		<media:thumbnail url="https://cdn.example.com/thumbs/p1.jpg" width="240" height="135" />
	</entry>
</feed>`;

		const adapter = makeAdapter({
			status: 200,
			body,
			etag: '"atom-etag"',
			lastModified: 'Tue, 05 May 2026 10:00:00 GMT',
			parsedAs: 'raw'
		});

		const result = await fetchAtomFeed(adapter, { url: URL }, NODE_ID, null);
		expect(result.posts).toHaveLength(1);
		expect(result.posts[0].imageUrl).toBe('https://cdn.example.com/thumbs/p1.jpg');
	});

	it('captures video from media:content', async () => {
		const body = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom" xmlns:media="http://search.yahoo.com/mrss/">
	<entry>
		<id>urn:post:v1</id>
		<title>Video Post 1</title>
		<link rel="alternate" href="https://example.com/posts/v1" />
		<updated>2026-05-05T10:30:00Z</updated>
		<summary>summary</summary>
		<media:content url="https://cdn.example.com/video/p1.mp4" medium="video" />
	</entry>
</feed>`;

		const adapter = makeAdapter({
			status: 200,
			body,
			etag: null,
			lastModified: null,
			parsedAs: 'raw'
		});

		const result = await fetchAtomFeed(adapter, { url: URL }, NODE_ID, null);
		expect(result.posts).toHaveLength(1);
		expect(result.posts[0].videoUrl).toBe('https://cdn.example.com/video/p1.mp4');
	});

	it('treats untyped media:content .mp4 as video, not image', async () => {
		const body = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom" xmlns:media="http://search.yahoo.com/mrss/">
	<entry>
		<id>urn:post:v1b</id>
		<title>Video Post 1b</title>
		<link rel="alternate" href="https://example.com/posts/v1b" />
		<updated>2026-05-05T10:35:00Z</updated>
		<summary>summary</summary>
		<media:content url="https://cdn.example.com/video/p1b.mp4" />
	</entry>
</feed>`;

		const adapter = makeAdapter({
			status: 200,
			body,
			etag: null,
			lastModified: null,
			parsedAs: 'raw'
		});

		const result = await fetchAtomFeed(adapter, { url: URL }, NODE_ID, null);
		expect(result.posts).toHaveLength(1);
		expect(result.posts[0].imageUrl).toBeUndefined();
		expect(result.posts[0].videoUrl).toBe('https://cdn.example.com/video/p1b.mp4');
	});

	it('captures image from enclosure image link when media tags are absent', async () => {
		const body = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
	<entry>
		<id>urn:post:2</id>
		<title>Post 2</title>
		<link rel="alternate" href="https://example.com/posts/2" />
		<link rel="enclosure" type="image/png" href="https://cdn.example.com/enclosure/p2.png" />
		<updated>2026-05-05T11:00:00Z</updated>
		<summary>summary</summary>
	</entry>
</feed>`;

		const adapter = makeAdapter({
			status: 200,
			body,
			etag: null,
			lastModified: null,
			parsedAs: 'raw'
		});

		const result = await fetchAtomFeed(adapter, { url: URL }, NODE_ID, null);
		expect(result.posts).toHaveLength(1);
		expect(result.posts[0].imageUrl).toBe('https://cdn.example.com/enclosure/p2.png');
	});

	it('captures video from enclosure video link when media tags are absent', async () => {
		const body = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
	<entry>
		<id>urn:post:v2</id>
		<title>Video Post 2</title>
		<link rel="alternate" href="https://example.com/posts/v2" />
		<link rel="enclosure" type="video/mp4" href="https://cdn.example.com/enclosure/v2.mp4" />
		<updated>2026-05-05T11:00:00Z</updated>
		<summary>summary</summary>
	</entry>
</feed>`;

		const adapter = makeAdapter({
			status: 200,
			body,
			etag: null,
			lastModified: null,
			parsedAs: 'raw'
		});

		const result = await fetchAtomFeed(adapter, { url: URL }, NODE_ID, null);
		expect(result.posts).toHaveLength(1);
		expect(result.posts[0].videoUrl).toBe('https://cdn.example.com/enclosure/v2.mp4');
	});

	it('passes previous cache headers to conditional request', async () => {
		const captured: { opts?: HttpRequestOpts } = {};
		const adapter = makeAdapter(
			{ status: 200, body: '<feed/>', etag: null, lastModified: null, parsedAs: 'raw' },
			captured
		);

		const prev: ProtocolFetcherState = {
			...emptyState(),
			etag: '"old"',
			lastModified: 'Mon, 04 May 2026 10:00:00 GMT'
		};

		await fetchAtomFeed(adapter, { url: URL }, NODE_ID, prev);

		expect(captured.opts?.feedKind).toBe('atom');
		expect(captured.opts?.etag).toBe('"old"');
		expect(captured.opts?.lastModified).toBe('Mon, 04 May 2026 10:00:00 GMT');
	});
});
