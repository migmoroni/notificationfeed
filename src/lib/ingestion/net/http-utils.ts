import type { ProxyConfig } from '$lib/domain/ingestion/ingestion-settings.js';
import type { HttpRequestOpts } from './http-adapter.js';

export function buildConditionalHeaders(reqOpts: HttpRequestOpts = {}): Record<string, string> {
	const headers: Record<string, string> = {};
	if (reqOpts.etag) headers['If-None-Match'] = reqOpts.etag;
	if (reqOpts.lastModified) headers['If-Modified-Since'] = reqOpts.lastModified;
	return headers;
}

export function detectParsedAs(contentType: string | null, body: string): 'raw' | 'rss-json' {
	const ct = (contentType ?? '').toLowerCase();
	if (ct.includes('json')) return 'rss-json';
	if (ct.includes('xml')) return 'raw';
	const trimmed = body.trimStart();
	if (trimmed.startsWith('{') || trimmed.startsWith('[')) return 'rss-json';
	return 'raw';
}

export function applyProxyTemplate(template: string, url: string): string {
	if (template.includes('{url}')) {
		return template.replace('{url}', encodeURIComponent(url));
	}
	return template + encodeURIComponent(url);
}

export function createProxyTargets(baseTargets: string[], proxies: ProxyConfig[], enabled: boolean): string[] {
	if (!enabled || proxies.length === 0) return [...baseTargets];

	const out: string[] = [];
	for (const base of baseTargets) {
		for (const proxy of proxies) {
			out.push(applyProxyTemplate(proxy.url, base));
		}
	}
	return out;
}