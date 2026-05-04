/**
 * Web/PWA HTTP adapter — resolves feed URLs and fetches through user-configured
 * gateway/proxy chains.
 *
 * Tries each resolved target in order; first 2xx (or 304) response wins.
 * Supports the `{url}` template token in the proxy URL. The response format (raw XML vs.
 * pre-parsed JSON à la rss2json) is auto-detected from the response
 * `Content-Type` header and a body sniff — the user never has to declare it.
 */

import type { ProxyConfig, IpfsGatewayConfig } from '$lib/domain/ingestion/ingestion-settings.js';
import type { HttpAdapter, HttpRequestOpts, HttpResponse } from './http-adapter.js';
import { resolveFeedHttpTargets } from './feed-url.js';
import { buildConditionalHeaders, createProxyTargets, detectParsedAs } from './http-utils.js';

interface WebProxyOptions {
	proxies: ProxyConfig[];
	/** When false, requests go direct (used as last-resort or for already-CORS-friendly URLs). */
	enabled: boolean;
	ipfsGateways: IpfsGatewayConfig[];
	ipfsGatewayEnabled: boolean;
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
			const baseTargets = resolveFeedHttpTargets(url, opts.ipfsGateways, opts.ipfsGatewayEnabled);
			if (baseTargets.length === 0) {
				throw new Error(`No HTTP targets available for ${url}`);
			}

			const candidates = createProxyTargets(baseTargets, opts.proxies, opts.enabled);
			if (candidates.length === 0) {
				throw new Error(`No proxy targets available for ${url}`);
			}

			let lastError: unknown = null;

			for (const target of candidates) {
				try {
					const response = await fetch(target, {
						method: 'GET',
						headers: buildConditionalHeaders(reqOpts),
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
