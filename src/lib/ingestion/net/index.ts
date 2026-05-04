/**
 * HTTP adapter factory.
 *
 * Picks the right adapter at runtime:
 * - Tauri desktop (window.__TAURI_INTERNALS__): Helia-first for ipfs/ipns,
 *   then gateway/proxy fallback over plugin-http.
 * - Web/PWA/TWA/SW: Helia-first for ipfs/ipns, then gateway/proxy fallback.
 */

import type {
	ProxyConfig,
	IpfsGatewayConfig,
	FeedTransportByKind,
	IpfsFeedTransportByKind
} from '$lib/domain/ingestion/ingestion-settings.js';
import type { HttpAdapter } from './http-adapter.js';
import { createTauriHttpAdapter } from './tauri-http.adapter.js';
import { createWebProxyAdapter } from './web-proxy.adapter.js';

export type { HttpAdapter, HttpRequestOpts, HttpResponse } from './http-adapter.js';

interface AdapterContext {
	proxies: ProxyConfig[];
	ipfsGateways: IpfsGatewayConfig[];
	httpFeedTransportByKind: FeedTransportByKind;
	ipfsFeedTransportByKind: IpfsFeedTransportByKind;
}

let cached: { ctx: AdapterContext; adapter: HttpAdapter } | null = null;

/** Returns true when running inside the Tauri runtime. */
function isTauri(): boolean {
	const g = globalThis as unknown as { __TAURI_INTERNALS__?: unknown };
	return typeof g.__TAURI_INTERNALS__ !== 'undefined';
}

/**
 * Returns the active HTTP adapter for the current runtime.
 * Cached per-context (so settings changes invalidate the cache).
 */
export async function getHttpAdapter(ctx: AdapterContext): Promise<HttpAdapter> {
	if (cached && sameCtx(cached.ctx, ctx)) return cached.adapter;

	let adapter: HttpAdapter;
	if (isTauri()) {
		adapter = createTauriHttpAdapter({
			proxies: ctx.proxies,
			ipfsGateways: ctx.ipfsGateways,
			httpFeedTransportByKind: ctx.httpFeedTransportByKind,
			ipfsFeedTransportByKind: ctx.ipfsFeedTransportByKind
		});
	} else {
		adapter = createWebProxyAdapter({
			proxies: ctx.proxies,
			ipfsGateways: ctx.ipfsGateways,
			httpFeedTransportByKind: ctx.httpFeedTransportByKind,
			ipfsFeedTransportByKind: ctx.ipfsFeedTransportByKind
		});
	}

	cached = {
		ctx: {
			...ctx,
			proxies: [...ctx.proxies],
			ipfsGateways: [...ctx.ipfsGateways],
			httpFeedTransportByKind: {
				rss: { ...ctx.httpFeedTransportByKind.rss },
				atom: { ...ctx.httpFeedTransportByKind.atom },
				jsonfeed: { ...ctx.httpFeedTransportByKind.jsonfeed }
			},
			ipfsFeedTransportByKind: {
				rss: { ...ctx.ipfsFeedTransportByKind.rss },
				atom: { ...ctx.ipfsFeedTransportByKind.atom },
				jsonfeed: { ...ctx.ipfsFeedTransportByKind.jsonfeed }
			}
		},
		adapter
	};
	return adapter;
}

/** For tests / settings change. */
/**
 * Drop the cached adapter so the next `getHttpAdapter` call rebuilds
 * one. Call this whenever the user changes proxy settings or toggles
 * transport settings, and from tests that need a clean slate.
 */
export function resetHttpAdapter(): void {
	cached = null;
}

/**
 * Cheap deep-equality check on `AdapterContext` to decide whether the
 * cached adapter is still valid for an incoming request.
 */
function sameCtx(a: AdapterContext, b: AdapterContext): boolean {
	if (a.proxies.length !== b.proxies.length) return false;
	if (a.ipfsGateways.length !== b.ipfsGateways.length) return false;
	for (let i = 0; i < a.proxies.length; i++) {
		if (a.proxies[i].url !== b.proxies[i].url) return false;
	}
	for (let i = 0; i < a.ipfsGateways.length; i++) {
		if (a.ipfsGateways[i].url !== b.ipfsGateways[i].url) return false;
	}
	if (a.httpFeedTransportByKind.rss.directEnabled !== b.httpFeedTransportByKind.rss.directEnabled) return false;
	if (a.httpFeedTransportByKind.rss.proxyFallbackEnabled !== b.httpFeedTransportByKind.rss.proxyFallbackEnabled) return false;
	if (a.httpFeedTransportByKind.atom.directEnabled !== b.httpFeedTransportByKind.atom.directEnabled) return false;
	if (a.httpFeedTransportByKind.atom.proxyFallbackEnabled !== b.httpFeedTransportByKind.atom.proxyFallbackEnabled) return false;
	if (a.httpFeedTransportByKind.jsonfeed.directEnabled !== b.httpFeedTransportByKind.jsonfeed.directEnabled) return false;
	if (a.httpFeedTransportByKind.jsonfeed.proxyFallbackEnabled !== b.httpFeedTransportByKind.jsonfeed.proxyFallbackEnabled) return false;

	if (a.ipfsFeedTransportByKind.rss.directEnabled !== b.ipfsFeedTransportByKind.rss.directEnabled) return false;
	if (a.ipfsFeedTransportByKind.rss.gatewayEnabled !== b.ipfsFeedTransportByKind.rss.gatewayEnabled) return false;
	if (a.ipfsFeedTransportByKind.rss.proxyEnabled !== b.ipfsFeedTransportByKind.rss.proxyEnabled) return false;
	if (a.ipfsFeedTransportByKind.atom.directEnabled !== b.ipfsFeedTransportByKind.atom.directEnabled) return false;
	if (a.ipfsFeedTransportByKind.atom.gatewayEnabled !== b.ipfsFeedTransportByKind.atom.gatewayEnabled) return false;
	if (a.ipfsFeedTransportByKind.atom.proxyEnabled !== b.ipfsFeedTransportByKind.atom.proxyEnabled) return false;
	if (a.ipfsFeedTransportByKind.jsonfeed.directEnabled !== b.ipfsFeedTransportByKind.jsonfeed.directEnabled) return false;
	if (a.ipfsFeedTransportByKind.jsonfeed.gatewayEnabled !== b.ipfsFeedTransportByKind.jsonfeed.gatewayEnabled) return false;
	if (a.ipfsFeedTransportByKind.jsonfeed.proxyEnabled !== b.ipfsFeedTransportByKind.jsonfeed.proxyEnabled) return false;
	return true;
}
