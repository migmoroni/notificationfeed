import { describe, expect, it } from 'vitest';
import {
	createProxyTargets,
	createGatewayProxyFallbackTargets,
	createGatewayProxyFallbackTargetsByPhase
} from './http-utils.js';

describe('createProxyTargets', () => {
	const base = ['https://example.com/feed.json'];
	const proxies = [
		{ url: 'https://corsproxy.io/?{url}', label: 'corsproxy.io' },
		{ url: 'https://api.rss2json.com/v1/api.json?rss_url={url}', label: 'rss2json' }
	];
	const transport = {
		rss: { directEnabled: false, proxyFallbackEnabled: true },
		atom: { directEnabled: false, proxyFallbackEnabled: true },
		jsonfeed: { directEnabled: true, proxyFallbackEnabled: true }
	};

	it('defaults RSS to proxy-only', () => {
		const targets = createProxyTargets(base, proxies, 'rss', transport);
		expect(targets).toEqual([
			'https://corsproxy.io/?https%3A%2F%2Fexample.com%2Ffeed.json',
			'https://api.rss2json.com/v1/api.json?rss_url=https%3A%2F%2Fexample.com%2Ffeed.json'
		]);
	});

	it('defaults Atom to proxy-only', () => {
		const targets = createProxyTargets(base, proxies, 'atom', transport);
		expect(targets).toEqual([
			'https://corsproxy.io/?https%3A%2F%2Fexample.com%2Ffeed.json',
			'https://api.rss2json.com/v1/api.json?rss_url=https%3A%2F%2Fexample.com%2Ffeed.json'
		]);
	});

	it('keeps JSON Feed direct-first with proxy fallback by default', () => {
		const targets = createProxyTargets(base, proxies, 'jsonfeed', transport);
		expect(targets).toEqual([
			'https://example.com/feed.json',
			'https://corsproxy.io/?https%3A%2F%2Fexample.com%2Ffeed.json',
			'https://api.rss2json.com/v1/api.json?rss_url=https%3A%2F%2Fexample.com%2Ffeed.json'
		]);
	});

	it('allows enabling direct mode for RSS via settings', () => {
		const targets = createProxyTargets(base, proxies, 'rss', {
			...transport,
			rss: { directEnabled: true, proxyFallbackEnabled: true }
		});
		expect(targets).toEqual([
			'https://example.com/feed.json',
			'https://corsproxy.io/?https%3A%2F%2Fexample.com%2Ffeed.json',
			'https://api.rss2json.com/v1/api.json?rss_url=https%3A%2F%2Fexample.com%2Ffeed.json'
		]);
	});

	it('returns direct-only targets when proxy fallback is disabled', () => {
		const targets = createProxyTargets(base, proxies, 'jsonfeed', {
			...transport,
			jsonfeed: { directEnabled: true, proxyFallbackEnabled: false }
		});
		expect(targets).toEqual(['https://example.com/feed.json']);
	});

	it('returns no targets when both direct and proxy fallback are disabled', () => {
		const targets = createProxyTargets(base, proxies, 'rss', {
			...transport,
			rss: { directEnabled: false, proxyFallbackEnabled: false }
		});
		expect(targets).toEqual([]);
	});

	it('returns no proxy targets when list is empty', () => {
		const targets = createProxyTargets(base, [], 'rss', transport);
		expect(targets).toEqual([]);
	});
});

describe('createGatewayProxyFallbackTargets', () => {
	it('keeps gateway direct target first, then proxy-wrapped fallbacks', () => {
		const targets = createGatewayProxyFallbackTargets(
			['https://w3s.link/ipfs/bafy/feed.xml'],
			[
				{ url: 'https://corsproxy.io/?{url}', label: 'corsproxy' },
				{ url: 'https://example-proxy.invalid/?url={url}', label: 'alt' }
			]
		);

		expect(targets).toEqual([
			'https://w3s.link/ipfs/bafy/feed.xml',
			'https://corsproxy.io/?https%3A%2F%2Fw3s.link%2Fipfs%2Fbafy%2Ffeed.xml',
			'https://example-proxy.invalid/?url=https%3A%2F%2Fw3s.link%2Fipfs%2Fbafy%2Ffeed.xml'
		]);
	});
});

describe('createGatewayProxyFallbackTargetsByPhase', () => {
	const base = ['https://w3s.link/ipfs/bafy/feed.xml'];
	const proxies = [
		{ url: 'https://corsproxy.io/?{url}', label: 'corsproxy' },
		{ url: 'https://example-proxy.invalid/?url={url}', label: 'alt' }
	];

	it('returns gateway-only targets when only gateway phase is enabled', () => {
		const targets = createGatewayProxyFallbackTargetsByPhase(base, proxies, {
			gatewayEnabled: true,
			proxyEnabled: false
		});

		expect(targets).toEqual(['https://w3s.link/ipfs/bafy/feed.xml']);
	});

	it('returns proxy-only targets when only proxy phase is enabled', () => {
		const targets = createGatewayProxyFallbackTargetsByPhase(base, proxies, {
			gatewayEnabled: false,
			proxyEnabled: true
		});

		expect(targets).toEqual([
			'https://corsproxy.io/?https%3A%2F%2Fw3s.link%2Fipfs%2Fbafy%2Ffeed.xml',
			'https://example-proxy.invalid/?url=https%3A%2F%2Fw3s.link%2Fipfs%2Fbafy%2Ffeed.xml'
		]);
	});

	it('returns no targets when gateway and proxy phases are both disabled', () => {
		const targets = createGatewayProxyFallbackTargetsByPhase(base, proxies, {
			gatewayEnabled: false,
			proxyEnabled: false
		});

		expect(targets).toEqual([]);
	});
});
