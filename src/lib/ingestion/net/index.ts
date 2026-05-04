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
	FeedTransportByKind
} from '$lib/domain/ingestion/ingestion-settings.js';
import type { HttpAdapter } from './http-adapter.js';
import { createTauriHttpAdapter } from './tauri-http.adapter.js';
import { createWebProxyAdapter } from './web-proxy.adapter.js';

export type { HttpAdapter, HttpRequestOpts, HttpResponse } from './http-adapter.js';

interface AdapterContext {
	proxies: ProxyConfig[];
	ipfsGateways: IpfsGatewayConfig[];
	ipfsGatewayEnabled: boolean;
	feedTransportByKind: FeedTransportByKind;
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
			ipfsGatewayEnabled: ctx.ipfsGatewayEnabled,
			feedTransportByKind: ctx.feedTransportByKind
		});
	} else {
		adapter = createWebProxyAdapter({
			proxies: ctx.proxies,
			ipfsGateways: ctx.ipfsGateways,
			ipfsGatewayEnabled: ctx.ipfsGatewayEnabled,
			feedTransportByKind: ctx.feedTransportByKind
		});
	}

	cached = {
		ctx: {
			...ctx,
			proxies: [...ctx.proxies],
			ipfsGateways: [...ctx.ipfsGateways],
			feedTransportByKind: {
				rss: { ...ctx.feedTransportByKind.rss },
				atom: { ...ctx.feedTransportByKind.atom },
				jsonfeed: { ...ctx.feedTransportByKind.jsonfeed }
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
	if (a.ipfsGatewayEnabled !== b.ipfsGatewayEnabled) return false;
	if (a.proxies.length !== b.proxies.length) return false;
	if (a.ipfsGateways.length !== b.ipfsGateways.length) return false;
	for (let i = 0; i < a.proxies.length; i++) {
		if (a.proxies[i].url !== b.proxies[i].url) return false;
	}
	for (let i = 0; i < a.ipfsGateways.length; i++) {
		if (a.ipfsGateways[i].url !== b.ipfsGateways[i].url) return false;
	}
	if (a.feedTransportByKind.rss.directEnabled !== b.feedTransportByKind.rss.directEnabled) return false;
	if (a.feedTransportByKind.rss.proxyFallbackEnabled !== b.feedTransportByKind.rss.proxyFallbackEnabled) return false;
	if (a.feedTransportByKind.atom.directEnabled !== b.feedTransportByKind.atom.directEnabled) return false;
	if (a.feedTransportByKind.atom.proxyFallbackEnabled !== b.feedTransportByKind.atom.proxyFallbackEnabled) return false;
	if (a.feedTransportByKind.jsonfeed.directEnabled !== b.feedTransportByKind.jsonfeed.directEnabled) return false;
	if (a.feedTransportByKind.jsonfeed.proxyFallbackEnabled !== b.feedTransportByKind.jsonfeed.proxyFallbackEnabled) return false;
	return true;
}
