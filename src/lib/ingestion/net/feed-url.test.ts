import { describe, expect, it } from 'vitest';
import {
	buildGatewayUrl,
	getFeedUrlHeuristicHint,
	isSupportedFeedUrl,
	joinFeedPath,
	parseFeedTransportUrl,
	resolveFeedHttpTargets
} from './feed-url.js';
import type { IpfsGatewayConfig } from '$lib/domain/ingestion/ingestion-settings.js';

const GATEWAYS: IpfsGatewayConfig[] = [
	{ url: 'https://w3s.link', label: 'w3s' },
	{ url: 'https://dweb.link/base', label: 'dweb' }
];

describe('parseFeedTransportUrl', () => {
	it('parses regular http URL as http transport', () => {
		const result = parseFeedTransportUrl('https://example.com/feed.xml');
		expect(result).toEqual({
			kind: 'http',
			url: 'https://example.com/feed.xml',
			originalUrl: 'https://example.com/feed.xml'
		});
	});

	it('parses ipfs:// URLs', () => {
		const result = parseFeedTransportUrl('ipfs://bafybeigdyrzt/feed.xml');
		expect(result).toEqual({
			kind: 'ipfs',
			cid: 'bafybeigdyrzt',
			path: 'feed.xml',
			gatewaySourceUrl: null,
			originalUrl: 'ipfs://bafybeigdyrzt/feed.xml'
		});
	});

	it('parses ipns:// URLs and detects DNSLink names', () => {
		const result = parseFeedTransportUrl('ipns://example.com/feeds/atom.xml');
		expect(result).toEqual({
			kind: 'ipns',
			name: 'example.com',
			path: 'feeds/atom.xml',
			dnsLink: true,
			gatewaySourceUrl: null,
			originalUrl: 'ipns://example.com/feeds/atom.xml'
		});
	});

	it('normalizes gateway HTTP paths into ipfs/ipns transports', () => {
		const ipfs = parseFeedTransportUrl('https://gateway.example/ipfs/bafyabc/rss.xml');
		expect(ipfs).toEqual({
			kind: 'ipfs',
			cid: 'bafyabc',
			path: 'rss.xml',
			gatewaySourceUrl: 'https://gateway.example/ipfs/bafyabc/rss.xml',
			originalUrl: 'https://gateway.example/ipfs/bafyabc/rss.xml'
		});

		const ipns = parseFeedTransportUrl('https://gateway.example/ipns/k51abc/feed.json');
		expect(ipns).toEqual({
			kind: 'ipns',
			name: 'k51abc',
			path: 'feed.json',
			dnsLink: false,
			gatewaySourceUrl: 'https://gateway.example/ipns/k51abc/feed.json',
			originalUrl: 'https://gateway.example/ipns/k51abc/feed.json'
		});
	});
});

describe('resolveFeedHttpTargets', () => {
	it('resolves ipfs:// URL to gateway targets', () => {
		const targets = resolveFeedHttpTargets('ipfs://bafycid/feed.xml', GATEWAYS, true);
		expect(targets).toEqual([
			'https://w3s.link/ipfs/bafycid/feed.xml',
			'https://dweb.link/base/ipfs/bafycid/feed.xml'
		]);
	});

	it('keeps original gateway URL as first fallback target', () => {
		const targets = resolveFeedHttpTargets('https://g.example/ipns/k51/feed.xml', GATEWAYS, true);
		expect(targets[0]).toBe('https://g.example/ipns/k51/feed.xml');
		expect(targets[1]).toBe('https://w3s.link/ipns/k51/feed.xml');
	});

	it('returns no targets for ipfs:// when gateways are disabled', () => {
		const targets = resolveFeedHttpTargets('ipfs://bafycid/feed.xml', GATEWAYS, false);
		expect(targets).toEqual([]);
	});
});

describe('helpers', () => {
	it('builds gateway URLs from normalized transport', () => {
		const parsed = parseFeedTransportUrl('ipns://example.com/path/feed.xml');
		if (!parsed || parsed.kind !== 'ipns') {
			throw new Error('unexpected parse result');
		}
		const url = buildGatewayUrl('https://gateway.example/root', parsed);
		expect(url).toBe('https://gateway.example/root/ipns/example.com/path/feed.xml');
	});

	it('joins feed paths safely', () => {
		expect(joinFeedPath('/foo', 'bar', '/baz')).toBe('foo/bar/baz');
		expect(joinFeedPath('', null, undefined, 'a')).toBe('a');
	});

	it('provides a heuristic hint and supports scheme validation', () => {
		expect(getFeedUrlHeuristicHint('ipfs://bafy/feed.json')).toBe('feed.json');
		expect(isSupportedFeedUrl('ipns://k51aaa/feed.xml')).toBe(true);
		expect(isSupportedFeedUrl('ftp://example.com/feed.xml')).toBe(false);
	});
});
