/**
 * HTTP adapter factory.
 *
 * Picks the right adapter at runtime:
 * - Tauri desktop (window.__TAURI_INTERNALS__): direct HTTP via plugin-http.
 * - Web/PWA/TWA/SW: CORS proxy chain configured per-user.
 */

import type { ProxyConfig } from '$lib/domain/ingestion/ingestion-settings.js';
import type { HttpAdapter } from './http-adapter.js';
import { createWebProxyAdapter } from './web-proxy.adapter.js';

export type { HttpAdapter, HttpRequestOpts, HttpResponse } from './http-adapter.js';

interface AdapterContext {
	proxies: ProxyConfig[];
	proxyEnabled: boolean;
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
		const { createTauriHttpAdapter } = await import('./tauri-http.adapter.js');
		adapter = await createTauriHttpAdapter();
	} else {
		adapter = createWebProxyAdapter({ proxies: ctx.proxies, enabled: ctx.proxyEnabled });
	}

	cached = { ctx: { ...ctx, proxies: [...ctx.proxies] }, adapter };
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
	if (a.proxies.length !== b.proxies.length) return false;
	for (let i = 0; i < a.proxies.length; i++) {
		if (a.proxies[i].url !== b.proxies[i].url) return false;
	}
	return true;
}
