import { describe, expect, it } from 'vitest';
import { createProxyTargets } from './http-utils.js';

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
