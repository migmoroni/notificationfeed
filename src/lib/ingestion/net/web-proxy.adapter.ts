/**
 * Web/PWA HTTP adapter — fetches feeds through user-configured CORS proxies.
 *
 * Tries each proxy in order; first 2xx (or 304) response wins. Supports the
 * `{url}` template token in the proxy URL. The response format (raw XML vs.
 * pre-parsed JSON à la rss2json) is auto-detected from the response
 * `Content-Type` header and a body sniff — the user never has to declare it.
 */

import type { ProxyConfig } from '$lib/domain/ingestion/ingestion-settings.js';
import type { HttpAdapter, HttpRequestOpts, HttpResponse } from './http-adapter.js';

interface WebProxyOptions {
	proxies: ProxyConfig[];
	/** When false, requests go direct (used as last-resort or for already-CORS-friendly URLs). */
	enabled: boolean;
}

/**
 * Build a web/PWA HTTP adapter that walks the user's CORS proxy chain.
 *
 * The first proxy that returns a 2xx (or 304) response wins. When
 * `enabled` is false (or the user has no proxies configured), the
 * adapter falls back to a direct `fetch` — useful in the rare cases
 * where the target already exposes permissive CORS headers.
 *
 * The response shape is sniffed automatically: a JSON `Content-Type`
 * (or a body that parses as JSON) is tagged `parsedAs: 'rss-json'`,
 * everything else stays `'raw'`. No per-proxy declaration required.
 */
export function createWebProxyAdapter(opts: WebProxyOptions): HttpAdapter {
	return {
		async fetchText(url: string, reqOpts: HttpRequestOpts = {}): Promise<HttpResponse> {
			const candidates = opts.enabled && opts.proxies.length > 0
				? opts.proxies.map((p) => ({ proxy: p, target: applyTemplate(p.url, url) }))
				: [{ proxy: null, target: url }];

			let lastError: unknown = null;

			for (const { target } of candidates) {
				try {
					const headers: Record<string, string> = {};
					if (reqOpts.etag) headers['If-None-Match'] = reqOpts.etag;
					if (reqOpts.lastModified) headers['If-Modified-Since'] = reqOpts.lastModified;

					const response = await fetch(target, {
						method: 'GET',
						headers,
						signal: reqOpts.signal
					});

					if (response.status === 304) {
						return {
							status: 304,
							body: '',
							etag: response.headers.get('etag'),
							lastModified: response.headers.get('last-modified'),
							parsedAs: 'raw'
						};
					}

					if (!response.ok) {
						lastError = new Error(`HTTP ${response.status} from ${target}`);
						continue;
					}

					const body = await response.text();
					const contentType = response.headers.get('content-type');
					return {
						status: response.status,
						body,
						etag: response.headers.get('etag'),
						lastModified: response.headers.get('last-modified'),
						parsedAs: detectParsedAs(contentType, body)
					};
				} catch (err) {
					lastError = err;
					continue;
				}
			}

			throw lastError ?? new Error(`All proxies failed for ${url}`);
		}
	};
}

/**
 * Decide whether a proxy response is raw XML or a pre-parsed RSS JSON
 * envelope (rss2json-style). Trusts the `Content-Type` first; falls
 * back to a one-character body sniff (`{` or `[`) when the header is
 * missing/ambiguous — enough to distinguish XML feeds (`<rss>`/`<feed>`/`<?xml`)
 * from JSON without a full parse.
 */
function detectParsedAs(contentType: string | null, body: string): 'raw' | 'rss-json' {
	const ct = (contentType ?? '').toLowerCase();
	if (ct.includes('json')) return 'rss-json';
	if (ct.includes('xml')) return 'raw';
	const trimmed = body.trimStart();
	if (trimmed.startsWith('{') || trimmed.startsWith('[')) return 'rss-json';
	return 'raw';
}

/**
 * Substitute the target URL into a proxy template. The supported form
 * is `https://proxy.example/?{url}`; legacy proxies that simply
 * prepend the URL (no `{url}` token) are still accepted.
 */
function applyTemplate(template: string, url: string): string {
	if (template.includes('{url}')) {
		return template.replace('{url}', encodeURIComponent(url));
	}
	// Legacy: prepend if no template token.
	return template + encodeURIComponent(url);
}
