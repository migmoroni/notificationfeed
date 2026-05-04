/**
 * Tauri HTTP adapter — Helia-first for IPFS/IPNS, with plugin-http gateway
 * fallback and plain HTTP support.
 *
 * Only loaded inside Tauri runtime; web/PWA/TWA imports a stub that throws.
 */

import { fetch as tauriFetch } from '@tauri-apps/plugin-http';
import type {
	ProxyConfig,
	IpfsGatewayConfig,
	FeedTransportByKind,
	IpfsFeedTransportByKind,
	FeedKind
} from '$lib/domain/ingestion/ingestion-settings.js';
import type { HttpAdapter, HttpRequestOpts, HttpResponse } from './http-adapter.js';
import { parseFeedTransportUrl, resolveFeedHttpTargets } from './feed-url.js';
import {
	buildConditionalHeaders,
	createProxyTargets,
	createGatewayProxyFallbackTargetsByPhase,
	detectParsedAs
} from './http-utils.js';
import { resolveTransportWithHelia } from './helia-resolver.js';

interface TauriHttpOptions {
	proxies: ProxyConfig[];
	ipfsGateways: IpfsGatewayConfig[];
	httpFeedTransportByKind: FeedTransportByKind;
	ipfsFeedTransportByKind: IpfsFeedTransportByKind;
}

/**
 * Build the Tauri-native HTTP adapter and wrap it in the shared
 * `HttpAdapter` interface.
 */
export function createTauriHttpAdapter(opts: TauriHttpOptions): HttpAdapter {
	return {
		async fetchText(url: string, reqOpts: HttpRequestOpts = {}): Promise<HttpResponse> {
			const transport = parseFeedTransportUrl(url);
			if (transport && transport.kind !== 'http') {
				return await fetchIpfsTransport(tauriFetch, url, reqOpts, transport, opts);
			}

			const targets = createProxyTargets(
				resolveFeedHttpTargets(url, opts.ipfsGateways),
				opts.proxies,
				reqOpts.feedKind,
				opts.httpFeedTransportByKind
			);
			if (targets.length === 0) {
				throw new Error(`No HTTP/proxy targets available for ${url}`);
			}

			return fetchFromTargets(tauriFetch, targets, reqOpts);
		}
	};
}

async function fetchIpfsTransport(
	tauriFetch: (input: string, init?: RequestInit) => Promise<Response>,
	url: string,
	reqOpts: HttpRequestOpts,
	transport: Exclude<ReturnType<typeof parseFeedTransportUrl>, null | { kind: 'http' }>,
	opts: TauriHttpOptions
): Promise<HttpResponse> {
	const ipfsRule = resolveIpfsFeedRule(reqOpts.feedKind, opts.ipfsFeedTransportByKind);
	let heliaError: unknown = null;

	if (ipfsRule.directEnabled) {
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

	if (!ipfsRule.gatewayEnabled && !ipfsRule.proxyEnabled) {
		if (ipfsRule.directEnabled) {
			throw new Error(`IPFS/IPNS direct fetch failed and gateway/proxy fallback is disabled: ${errorToString(heliaError)}`);
		}
		throw new Error('IPFS/IPNS direct, gateway and proxy phases are disabled by settings');
	}

	const baseTargets = resolveFeedHttpTargets(url, opts.ipfsGateways);
	if (baseTargets.length === 0) {
		throw new Error(`No gateway targets available for ${url}`);
	}

	const targets = createGatewayProxyFallbackTargetsByPhase(baseTargets, opts.proxies, {
		gatewayEnabled: ipfsRule.gatewayEnabled,
		proxyEnabled: ipfsRule.proxyEnabled
	});
	if (targets.length === 0) {
		if (ipfsRule.proxyEnabled && !ipfsRule.gatewayEnabled && opts.proxies.length === 0) {
			throw new Error('IPFS proxy phase is enabled but no proxy services are configured');
		}
		throw new Error(`No gateway/proxy fallback targets available for ${url}`);
	}

	try {
		return await fetchFromTargets(tauriFetch, targets, reqOpts);
	} catch (fallbackError) {
		if (ipfsRule.directEnabled) {
			throw new Error(
				`IPFS/IPNS fetch failed via Helia and gateway/proxy fallback: ${errorToString(heliaError)} | ${errorToString(fallbackError)}`
			);
		}
		throw fallbackError;
	}
}

function resolveIpfsFeedRule(feedKind: HttpRequestOpts['feedKind'] | undefined, byKind: IpfsFeedTransportByKind) {
	const key: FeedKind = feedKind ?? 'rss';
	return byKind[key];
}

async function fetchDirect(
	tauriFetch: (input: string, init?: RequestInit) => Promise<Response>,
	url: string,
	reqOpts: HttpRequestOpts
): Promise<HttpResponse> {
	const response = await tauriFetch(url, {
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

	const body = await response.text();
	return {
		status: response.status,
		body,
		etag: response.headers.get('etag'),
		lastModified: response.headers.get('last-modified'),
		parsedAs: 'raw'
	};
}

async function fetchFromTargets(
	tauriFetch: (input: string, init?: RequestInit) => Promise<Response>,
	targets: string[],
	reqOpts: HttpRequestOpts
): Promise<HttpResponse> {
	if (targets.length === 0) {
		throw new Error('No gateway targets configured for IPFS/IPNS fallback');
	}

	let lastError: unknown = null;
	for (const target of targets) {
		try {
			const response = await tauriFetch(target, {
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
			return {
				status: response.status,
				body,
				etag: response.headers.get('etag'),
				lastModified: response.headers.get('last-modified'),
				parsedAs: detectParsedAs(response.headers.get('content-type'), body)
			};
		} catch (err) {
			lastError = err;
		}
	}

	throw lastError ?? new Error('All IPFS/IPNS fallback targets failed');
}

function errorToString(err: unknown): string {
	if (err instanceof Error) return err.message;
	return String(err);
}
