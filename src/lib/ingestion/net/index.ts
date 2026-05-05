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
	FeedKind,
	FeedTransportByKind,
	FeedTransportRule,
	IpfsFeedTransportByKind,
	IpfsFeedTransportRule
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

const FEED_KIND_INDEX: Record<FeedKind, true> = {
	rss: true,
	atom: true,
	jsonfeed: true
};

const FEED_KINDS = Object.keys(FEED_KIND_INDEX) as FeedKind[];

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
			httpFeedTransportByKind: cloneHttpFeedTransportByKind(ctx.httpFeedTransportByKind),
			ipfsFeedTransportByKind: cloneIpfsFeedTransportByKind(ctx.ipfsFeedTransportByKind)
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
	if (!sameUrlList(a.proxies, b.proxies)) return false;
	if (!sameUrlList(a.ipfsGateways, b.ipfsGateways)) return false;

	for (const kind of FEED_KINDS) {
		if (!sameHttpFeedTransportRule(a.httpFeedTransportByKind[kind], b.httpFeedTransportByKind[kind])) return false;
		if (!sameIpfsFeedTransportRule(a.ipfsFeedTransportByKind[kind], b.ipfsFeedTransportByKind[kind])) return false;
	}

	return true;
}

function cloneHttpFeedTransportByKind(source: FeedTransportByKind): FeedTransportByKind {
	const cloned = {} as FeedTransportByKind;
	for (const kind of FEED_KINDS) {
		cloned[kind] = { ...source[kind] };
	}
	return cloned;
}

function cloneIpfsFeedTransportByKind(source: IpfsFeedTransportByKind): IpfsFeedTransportByKind {
	const cloned = {} as IpfsFeedTransportByKind;
	for (const kind of FEED_KINDS) {
		cloned[kind] = { ...source[kind] };
	}
	return cloned;
}

function sameUrlList<T extends { url: string }>(a: T[], b: T[]): boolean {
	if (a.length !== b.length) return false;
	for (let i = 0; i < a.length; i++) {
		if (a[i].url !== b[i].url) return false;
	}
	return true;
}

function sameHttpFeedTransportRule(a: FeedTransportRule, b: FeedTransportRule): boolean {
	if (a.directEnabled !== b.directEnabled) return false;
	if (a.proxyFallbackEnabled !== b.proxyFallbackEnabled) return false;
	return true;
}

function sameIpfsFeedTransportRule(a: IpfsFeedTransportRule, b: IpfsFeedTransportRule): boolean {
	if (a.directEnabled !== b.directEnabled) return false;
	if (a.gatewayEnabled !== b.gatewayEnabled) return false;
	if (a.proxyEnabled !== b.proxyEnabled) return false;
	return true;
}
