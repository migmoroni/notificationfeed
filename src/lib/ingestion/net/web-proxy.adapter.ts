/**
 * Web/PWA/TWA HTTP adapter — Helia-first for IPFS/IPNS, with gateway+proxy
 * fallback and plain HTTP support.
 */

import type { ProxyConfig, IpfsGatewayConfig } from '$lib/domain/ingestion/ingestion-settings.js';
import type { HttpAdapter, HttpRequestOpts, HttpResponse } from './http-adapter.js';
import { parseFeedTransportUrl, resolveFeedHttpTargets } from './feed-url.js';
import { buildConditionalHeaders, createProxyTargets, detectParsedAs } from './http-utils.js';
import { resolveTransportWithHelia } from './helia-resolver.js';

interface WebProxyOptions {
	proxies: ProxyConfig[];
	/** When false, requests go direct (used as last-resort or for already-CORS-friendly URLs). */
	enabled: boolean;
	ipfsGateways: IpfsGatewayConfig[];
	ipfsGatewayEnabled: boolean;
}

/**
 * Build a web/PWA HTTP adapter with a two-stage strategy:
 * 1) Helia-first for ipfs/ipns transports.
 * 2) Gateway + CORS proxy fallback for every HTTP target.
 *
 * In the fallback stage, the first target that returns a 2xx (or 304)
 * response wins. When
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
			const transport = parseFeedTransportUrl(url);
			let heliaError: unknown = null;

			if (transport && transport.kind !== 'http') {
				try {
					const body = await resolveTransportWithHelia(transport, reqOpts.signal);
					return {
						status: 200,
						body,
						etag: null,
						lastModified: null,
						parsedAs: detectParsedAs(null, body)
					};
				} catch (err) {
					heliaError = err;
				}
			}

			const baseTargets = resolveFeedHttpTargets(url, opts.ipfsGateways, opts.ipfsGatewayEnabled);
			if (baseTargets.length === 0) {
				throw new Error(`No HTTP targets available for ${url}`);
			}

			const candidates = createProxyTargets(baseTargets, opts.proxies, opts.enabled);
			if (candidates.length === 0) {
				throw new Error(`No proxy targets available for ${url}`);
			}

			try {
				return await fetchFromCandidates(candidates, reqOpts);
			} catch (fallbackError) {
				if (transport && transport.kind !== 'http') {
					throw new Error(
						`IPFS/IPNS fetch failed via Helia and gateway/proxy fallback: ${errorToString(heliaError)} | ${errorToString(fallbackError)}`
					);
				}
				throw fallbackError;
			}
		}
	};
}

async function fetchFromCandidates(candidates: string[], reqOpts: HttpRequestOpts): Promise<HttpResponse> {
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
		}
	}

	throw lastError ?? new Error('All HTTP targets failed');
}

function errorToString(err: unknown): string {
	if (err instanceof Error) return err.message;
	return String(err);
}
