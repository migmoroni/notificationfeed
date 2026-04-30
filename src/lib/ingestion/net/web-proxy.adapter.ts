/**
 * Web/PWA HTTP adapter — fetches feeds through user-configured CORS proxies.
 *
 * Tries each proxy in order; first 2xx (or 304) response wins. Supports the
 * `{url}` template token in the proxy URL. Some proxies (rss2json) pre-parse
 * RSS into JSON — those carry `parsesRss: true` in their config and the
 * resulting response is flagged with `parsedAs: 'rss-json'`.
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
 * Proxies marked with `parsesRss: true` (e.g. rss2json) will have their
 * responses tagged with `parsedAs: 'rss-json'` so the RSS client knows
 * to skip the XML parser.
 */
export function createWebProxyAdapter(opts: WebProxyOptions): HttpAdapter {
	return {
		async fetchText(url: string, reqOpts: HttpRequestOpts = {}): Promise<HttpResponse> {
			const candidates = opts.enabled && opts.proxies.length > 0
				? opts.proxies.map((p) => ({ proxy: p, target: applyTemplate(p.url, url) }))
				: [{ proxy: null, target: url }];

			let lastError: unknown = null;

			for (const { proxy, target } of candidates) {
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
							parsedAs: proxy?.parsesRss ? 'rss-json' : 'raw'
						};
					}

					if (!response.ok) {
						lastError = new Error(`HTTP ${response.status} from ${target}`);
						continue;
					}

					const body = await response.text();
					return {
						status: response.status,
						body,
						etag: response.headers.get('etag'),
						lastModified: response.headers.get('last-modified'),
						parsedAs: proxy?.parsesRss ? 'rss-json' : 'raw'
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
