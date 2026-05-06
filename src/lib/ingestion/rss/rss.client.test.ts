import { describe, expect, it } from 'vitest';
import { fetchRssFeed } from './rss.client.js';
import type { HttpAdapter, HttpRequestOpts, HttpResponse } from '$lib/ingestion/net/index.js';
import type { ProtocolFetcherState } from '$lib/domain/ingestion/fetcher-state.js';

const NODE_ID = 'tree-1:font-1';
const URL = 'https://example.com/feed.rss';

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

describe('fetchRssFeed', () => {
	it('captures image from media:content in RSS XML', async () => {
		const body = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:media="http://search.yahoo.com/mrss/">
	<channel>
		<item>
			<title>Post 1</title>
			<link>https://example.com/posts/1</link>
			<pubDate>Tue, 05 May 2026 10:00:00 GMT</pubDate>
			<media:content url="https://cdn.example.com/media/post-1.jpg" medium="image" />
		</item>
	</channel>
</rss>`;

		const adapter = makeAdapter({
			status: 200,
			body,
			etag: '"rss-etag"',
			lastModified: 'Tue, 05 May 2026 10:00:00 GMT',
			parsedAs: 'raw'
		});

		const result = await fetchRssFeed(adapter, { url: URL }, NODE_ID, null);
		expect(result.posts).toHaveLength(1);
		expect(result.posts[0].imageUrl).toBe('https://cdn.example.com/media/post-1.jpg');
	});

	it('captures video from media:content in RSS XML', async () => {
		const body = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:media="http://search.yahoo.com/mrss/">
	<channel>
		<item>
			<title>Video Post 1</title>
			<link>https://example.com/posts/v1</link>
			<pubDate>Tue, 05 May 2026 10:30:00 GMT</pubDate>
			<media:content url="https://cdn.example.com/media/post-v1.mp4" medium="video" />
		</item>
	</channel>
</rss>`;

		const adapter = makeAdapter({
			status: 200,
			body,
			etag: null,
			lastModified: null,
			parsedAs: 'raw'
		});

		const result = await fetchRssFeed(adapter, { url: URL }, NODE_ID, null);
		expect(result.posts).toHaveLength(1);
		expect(result.posts[0].videoUrl).toBe('https://cdn.example.com/media/post-v1.mp4');
	});

	it('treats untyped media:content .mp4 as video, not image', async () => {
		const body = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:media="http://search.yahoo.com/mrss/">
	<channel>
		<item>
			<title>Video Post 1b</title>
			<link>https://example.com/posts/v1b</link>
			<pubDate>Tue, 05 May 2026 10:35:00 GMT</pubDate>
			<media:content url="https://cdn.example.com/media/post-v1b.mp4" />
		</item>
	</channel>
</rss>`;

		const adapter = makeAdapter({
			status: 200,
			body,
			etag: null,
			lastModified: null,
			parsedAs: 'raw'
		});

		const result = await fetchRssFeed(adapter, { url: URL }, NODE_ID, null);
		expect(result.posts).toHaveLength(1);
		expect(result.posts[0].imageUrl).toBeUndefined();
		expect(result.posts[0].videoUrl).toBe('https://cdn.example.com/media/post-v1b.mp4');
	});

	it('captures image from enclosure when media tags are absent', async () => {
		const body = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
	<channel>
		<item>
			<title>Post 2</title>
			<link>https://example.com/posts/2</link>
			<pubDate>Tue, 05 May 2026 11:00:00 GMT</pubDate>
			<enclosure url="https://cdn.example.com/enclosure/post-2.png" type="image/png" />
		</item>
	</channel>
</rss>`;

		const adapter = makeAdapter({
			status: 200,
			body,
			etag: null,
			lastModified: null,
			parsedAs: 'raw'
		});

		const result = await fetchRssFeed(adapter, { url: URL }, NODE_ID, null);
		expect(result.posts).toHaveLength(1);
		expect(result.posts[0].imageUrl).toBe('https://cdn.example.com/enclosure/post-2.png');
	});

	it('treats article links under /videos as page URLs and keeps media:thumbnail as image', async () => {
		const body = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:media="http://search.yahoo.com/mrss/">
	<channel>
		<item>
			<title>Do viruses spread more easily on cruise ships?</title>
			<description>The BBC explains what experts have to say.</description>
			<link>https://www.bbc.com/news/videos/cdxpn5r2nlgo?at_medium=RSS&amp;at_campaign=rss</link>
			<guid isPermaLink="false">https://www.bbc.com/news/videos/cdxpn5r2nlgo#3</guid>
			<pubDate>Tue, 05 May 2026 06:38:26 GMT</pubDate>
			<media:thumbnail width="240" height="135" url="https://ichef.bbci.co.uk/ace/standard/240/cpsprodpb/5418/live/5e343470-484c-11f1-b55d-0f258dce1735.jpg"/>
		</item>
	</channel>
</rss>`;

		const adapter = makeAdapter({
			status: 200,
			body,
			etag: null,
			lastModified: null,
			parsedAs: 'raw'
		});

		const result = await fetchRssFeed(adapter, { url: URL }, NODE_ID, null);
		expect(result.posts).toHaveLength(1);
		expect(result.posts[0].url).toBe(
			'https://www.bbc.com/news/videos/cdxpn5r2nlgo?at_medium=RSS&at_campaign=rss'
		);
		expect(result.posts[0].imageUrl).toContain(
			'5e343470-484c-11f1-b55d-0f258dce1735.jpg'
		);
		expect(result.posts[0].videoUrl).toBeUndefined();
	});

	it('captures image from rss-json content html when thumbnail is missing', async () => {
		const body = JSON.stringify({
			status: 'ok',
			items: [
				{
					title: 'Post 3',
					link: 'https://example.com/posts/3',
					content: '<p><img src="https://images.example.com/story-3.webp" /></p>'
				}
			]
		});

		const adapter = makeAdapter({
			status: 200,
			body,
			etag: null,
			lastModified: null,
			parsedAs: 'rss-json'
		});

		const result = await fetchRssFeed(adapter, { url: URL }, NODE_ID, null);
		expect(result.posts).toHaveLength(1);
		expect(result.posts[0].imageUrl).toBe('https://images.example.com/story-3.webp');
	});

	it('captures video from rss-json content html when explicit video field is missing', async () => {
		const body = JSON.stringify({
			status: 'ok',
			items: [
				{
					title: 'Post 4',
					link: 'https://example.com/posts/4',
					content: '<video src="https://videos.example.com/story-4.mp4"></video>'
				}
			]
		});

		const adapter = makeAdapter({
			status: 200,
			body,
			etag: null,
			lastModified: null,
			parsedAs: 'rss-json'
		});

		const result = await fetchRssFeed(adapter, { url: URL }, NODE_ID, null);
		expect(result.posts).toHaveLength(1);
		expect(result.posts[0].videoUrl).toBe('https://videos.example.com/story-4.mp4');
	});

	it('passes previous cache headers to conditional request', async () => {
		const captured: { opts?: HttpRequestOpts } = {};
		const adapter = makeAdapter(
			{ status: 200, body: '<rss/>', etag: null, lastModified: null, parsedAs: 'raw' },
			captured
		);

		const prev: ProtocolFetcherState = {
			...emptyState(),
			etag: '"old"',
			lastModified: 'Mon, 04 May 2026 10:00:00 GMT'
		};

		await fetchRssFeed(adapter, { url: URL }, NODE_ID, prev);

		expect(captured.opts?.feedKind).toBe('rss');
		expect(captured.opts?.etag).toBe('"old"');
		expect(captured.opts?.lastModified).toBe('Mon, 04 May 2026 10:00:00 GMT');
	});
});
