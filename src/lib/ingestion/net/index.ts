/**
 * HTTP adapter factory.
 *
 * Picks the right adapter at runtime:
 * - Tauri desktop (window.__TAURI_INTERNALS__): Helia-first for ipfs/ipns,
 *   then gateway/proxy fallback over plugin-http.
 * - Web/PWA/TWA/SW: gateway + CORS proxy chain configured per-user.
 *
 * The Tauri adapter pulls in Helia + libp2p + @tauri-apps/plugin-http
 * (each megabytes of code that uses Tauri-only globals at runtime).
 * Importing it statically would force every web/PWA/SW bundle to
 * carry that graph, which breaks the offline-first hot path. We
 * therefore code-split it behind a single runtime branch — the
 * desktop bundle loads it once on the first tick, the web bundle
 * never loads it at all.
 */

import type { ProxyConfig, IpfsGatewayConfig } from '$lib/domain/ingestion/ingestion-settings.js';
import type { HttpAdapter } from './http-adapter.js';
import { createWebProxyAdapter } from './web-proxy.adapter.js';

export type { HttpAdapter, HttpRequestOpts, HttpResponse } from './http-adapter.js';

interface AdapterContext {
	proxies: ProxyConfig[];
	proxyEnabled: boolean;
	ipfsGateways: IpfsGatewayConfig[];
	ipfsGatewayEnabled: boolean;
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
		// Lazy: keeps Helia/libp2p/plugin-http out of the web/PWA/SW bundle.
		const { createTauriHttpAdapter } = await import('./tauri-http.adapter.js');
		adapter = createTauriHttpAdapter({
			proxies: ctx.proxies,
			proxyEnabled: ctx.proxyEnabled,
			ipfsGateways: ctx.ipfsGateways,
			ipfsGatewayEnabled: ctx.ipfsGatewayEnabled
		});
	} else {
		adapter = createWebProxyAdapter({
			proxies: ctx.proxies,
			enabled: ctx.proxyEnabled,
			ipfsGateways: ctx.ipfsGateways,
			ipfsGatewayEnabled: ctx.ipfsGatewayEnabled
		});
	}

	cached = {
		ctx: {
			...ctx,
			proxies: [...ctx.proxies],
			ipfsGateways: [...ctx.ipfsGateways]
		},
		adapter
	};
	return adapter;
}

/** For tests / settings change. */
/**
 * Drop the cached adapter so the next `getHttpAdapter` call rebuilds
 * one. Call this whenever the user changes proxy settings or toggles
 * `proxyEnabled`, and from tests that need a clean slate.
 */
export function resetHttpAdapter(): void {
	cached = null;
}

/**
 * Cheap deep-equality check on `AdapterContext` to decide whether the
 * cached adapter is still valid for an incoming request.
 */
function sameCtx(a: AdapterContext, b: AdapterContext): boolean {
	if (a.proxyEnabled !== b.proxyEnabled) return false;
	if (a.ipfsGatewayEnabled !== b.ipfsGatewayEnabled) return false;
	if (a.proxies.length !== b.proxies.length) return false;
	if (a.ipfsGateways.length !== b.ipfsGateways.length) return false;
	for (let i = 0; i < a.proxies.length; i++) {
		if (a.proxies[i].url !== b.proxies[i].url) return false;
	}
	for (let i = 0; i < a.ipfsGateways.length; i++) {
		if (a.ipfsGateways[i].url !== b.ipfsGateways[i].url) return false;
	}
	return true;
}
