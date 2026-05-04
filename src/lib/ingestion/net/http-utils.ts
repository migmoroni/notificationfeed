import type {
	ProxyConfig,
	FeedTransportByKind,
	FeedTransportRule
} from '$lib/domain/ingestion/ingestion-settings.js';
import { INGESTION_HTTP_FEED_TRANSPORT_DEFAULTS } from '$lib/config/back-settings.js';
import type { HttpRequestOpts } from './http-adapter.js';

export interface IpfsFallbackPhases {
	gatewayEnabled: boolean;
	proxyEnabled: boolean;
}

export function buildConditionalHeaders(reqOpts: HttpRequestOpts = {}): Record<string, string> {
	const headers: Record<string, string> = {};
	if (reqOpts.etag) headers['If-None-Match'] = reqOpts.etag;
	if (reqOpts.lastModified) headers['If-Modified-Since'] = reqOpts.lastModified;
	return headers;
}

export function detectParsedAs(contentType: string | null, body: string): 'raw' | 'rss-json' {
	const ct = (contentType ?? '').toLowerCase();
	if (ct.includes('json')) return 'rss-json';
	if (ct.includes('xml')) return 'raw';
	const trimmed = body.trimStart();
	if (trimmed.startsWith('{') || trimmed.startsWith('[')) return 'rss-json';
	return 'raw';
}

export function applyProxyTemplate(template: string, url: string): string {
	if (template.includes('{url}')) {
		return template.replace('{url}', encodeURIComponent(url));
	}
	return template + encodeURIComponent(url);
}

export function createProxyTargets(
	baseTargets: string[],
	proxies: ProxyConfig[],
	feedKind?: HttpRequestOpts['feedKind'],
	httpFeedTransportByKind?: FeedTransportByKind
): string[] {
	const strategy = resolveHttpFeedTransportRule(feedKind, httpFeedTransportByKind);
	const allowDirect = strategy.directEnabled;
	const allowProxy = strategy.proxyFallbackEnabled && proxies.length > 0;
	if (!allowDirect && !allowProxy) return [];

	const out: string[] = [];
	for (const base of baseTargets) {
		if (allowDirect) out.push(base);
		if (allowProxy) {
			for (const proxy of proxies) {
				out.push(applyProxyTemplate(proxy.url, base));
			}
		}
	}

	return dedupe(out);
}

export function createGatewayProxyFallbackTargets(baseTargets: string[], proxies: ProxyConfig[]): string[] {
	const defaultPhases: IpfsFallbackPhases = {
		gatewayEnabled: true,
		proxyEnabled: true
	};

	return createGatewayProxyFallbackTargetsByPhase(baseTargets, proxies, defaultPhases);
}

export function createGatewayProxyFallbackTargetsByPhase(
	baseTargets: string[],
	proxies: ProxyConfig[],
	phases: IpfsFallbackPhases
): string[] {
	const allowGateway = phases.gatewayEnabled;
	const allowProxy = phases.proxyEnabled && proxies.length > 0;
	if (!allowGateway && !allowProxy) return [];

	const out: string[] = [];
	for (const base of baseTargets) {
		if (allowGateway) out.push(base);
		if (allowProxy) {
			for (const proxy of proxies) {
				out.push(applyProxyTemplate(proxy.url, base));
			}
		}
	}

	return dedupe(out);
}

function resolveHttpFeedTransportRule(
	feedKind: HttpRequestOpts['feedKind'] | undefined,
	httpFeedTransportByKind?: FeedTransportByKind
): FeedTransportRule {
	const defaults = defaultHttpFeedTransportRule(feedKind);
	if (!httpFeedTransportByKind || !feedKind) return defaults;

	const fromSettings = httpFeedTransportByKind[feedKind];
	if (!fromSettings) return defaults;
	return {
		directEnabled: fromSettings.directEnabled,
		proxyFallbackEnabled: fromSettings.proxyFallbackEnabled
	};
}

function defaultHttpFeedTransportRule(feedKind: HttpRequestOpts['feedKind'] | undefined): FeedTransportRule {
	if (feedKind) {
		const fromBackSettings = INGESTION_HTTP_FEED_TRANSPORT_DEFAULTS[feedKind];
		return {
			directEnabled: fromBackSettings.directEnabled,
			proxyFallbackEnabled: fromBackSettings.proxyFallbackEnabled
		};
	}

	return {
		directEnabled: INGESTION_HTTP_FEED_TRANSPORT_DEFAULTS.rss.directEnabled,
		proxyFallbackEnabled: INGESTION_HTTP_FEED_TRANSPORT_DEFAULTS.rss.proxyFallbackEnabled
	};
}

function dedupe(values: string[]): string[] {
	const seen = new Set<string>();
	const out: string[] = [];
	for (const value of values) {
		const trimmed = value.trim();
		if (!trimmed || seen.has(trimmed)) continue;
		seen.add(trimmed);
		out.push(trimmed);
	}
	return out;
}