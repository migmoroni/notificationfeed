import type { IpfsGatewayConfig } from '$lib/domain/ingestion/ingestion-settings.js';

export type FeedTransport = FeedHttpTransport | FeedIpfsTransport | FeedIpnsTransport;

interface FeedTransportBase {
	originalUrl: string;
}

export interface FeedHttpTransport extends FeedTransportBase {
	kind: 'http';
	url: string;
}

export interface FeedIpfsTransport extends FeedTransportBase {
	kind: 'ipfs';
	cid: string;
	/** File path inside the CID, without leading slash. */
	path: string;
	/** Original gateway URL when source was HTTP /ipfs/... */
	gatewaySourceUrl: string | null;
}

export interface FeedIpnsTransport extends FeedTransportBase {
	kind: 'ipns';
	name: string;
	/** File path inside the resolved target, without leading slash. */
	path: string;
	dnsLink: boolean;
	/** Original gateway URL when source was HTTP /ipns/... */
	gatewaySourceUrl: string | null;
}

const HTTP_PROTOCOLS = new Set(['http:', 'https:']);

export function parseFeedTransportUrl(input: string): FeedTransport | null {
	const originalUrl = input.trim();
	if (!originalUrl) return null;

	let parsed: URL;
	try {
		parsed = new URL(originalUrl);
	} catch {
		return null;
	}

	const protocol = parsed.protocol.toLowerCase();
	if (protocol === 'ipfs:') return parseIpfsScheme(parsed, originalUrl);
	if (protocol === 'ipns:') return parseIpnsScheme(parsed, originalUrl);
	if (!HTTP_PROTOCOLS.has(protocol)) return null;

	const fromGateway = parseGatewayPath(parsed.pathname, originalUrl);
	if (fromGateway) return fromGateway;

	return {
		kind: 'http',
		url: originalUrl,
		originalUrl
	};
}

export function isSupportedFeedUrl(input: string): boolean {
	return parseFeedTransportUrl(input) != null;
}

export function getFeedUrlHeuristicHint(input: string): string {
	const parsed = parseFeedTransportUrl(input);
	if (!parsed) return input.trim().toLowerCase();
	if (parsed.kind === 'http') return parsed.url.toLowerCase();

	const base = parsed.path.toLowerCase();
	if (parsed.kind === 'ipns') return `${parsed.name.toLowerCase()} ${base}`.trim();
	return base;
}

export function resolveFeedHttpTargets(
	input: string,
	ipfsGateways: IpfsGatewayConfig[],
	ipfsGatewayEnabled: boolean
): string[] {
	const parsed = parseFeedTransportUrl(input);
	if (!parsed) return [];

	if (parsed.kind === 'http') return [parsed.url];

	const targets: string[] = [];
	if (parsed.gatewaySourceUrl) targets.push(parsed.gatewaySourceUrl);

	if (ipfsGatewayEnabled) {
		for (const gateway of ipfsGateways) {
			const target = buildGatewayUrl(gateway.url, parsed);
			if (target) targets.push(target);
		}
	}

	return dedupe(targets);
}

export function joinFeedPath(...parts: Array<string | null | undefined>): string {
	const tokens: string[] = [];
	for (const part of parts) {
		if (!part) continue;
		for (const token of part.split('/')) {
			const trimmed = token.trim();
			if (trimmed) tokens.push(trimmed);
		}
	}
	return tokens.join('/');
}

export function buildGatewayUrl(baseUrl: string, feed: FeedIpfsTransport | FeedIpnsTransport): string | null {
	const cleanBase = baseUrl.trim();
	if (!cleanBase) return null;

	let base: URL;
	try {
		base = new URL(cleanBase);
	} catch {
		return null;
	}
	if (!HTTP_PROTOCOLS.has(base.protocol.toLowerCase())) return null;

	const namespace = feed.kind;
	const id = encodeURIComponent(feed.kind === 'ipfs' ? feed.cid : feed.name);
	const encodedPath = encodePath(feed.path);
	const suffix = encodedPath ? `/${encodedPath}` : '';
	const prefix = trimTrailingSlash(base.pathname);
	base.pathname = `${prefix}/${namespace}/${id}${suffix}`;
	base.search = '';
	base.hash = '';
 
	return base.toString();
}

function parseIpfsScheme(parsed: URL, originalUrl: string): FeedIpfsTransport | null {
	const cid = parsed.hostname.trim();
	if (!cid) return null;

	return {
		kind: 'ipfs',
		cid,
		path: normalizePath(parsed.pathname),
		gatewaySourceUrl: null,
		originalUrl
	};
}

function parseIpnsScheme(parsed: URL, originalUrl: string): FeedIpnsTransport | null {
	const name = parsed.hostname.trim();
	if (!name) return null;

	return {
		kind: 'ipns',
		name,
		path: normalizePath(parsed.pathname),
		dnsLink: looksLikeDomain(name),
		gatewaySourceUrl: null,
		originalUrl
	};
}

function parseGatewayPath(pathname: string, originalUrl: string): FeedIpfsTransport | FeedIpnsTransport | null {
	const tokens = normalizePath(pathname).split('/').filter(Boolean);
	if (tokens.length < 2) return null;

	const namespace = tokens[0].toLowerCase();
	const id = decodeToken(tokens[1]);
	const path = tokens.slice(2).map(decodeToken).join('/');

	if (!id) return null;

	if (namespace === 'ipfs') {
		return {
			kind: 'ipfs',
			cid: id,
			path,
			gatewaySourceUrl: originalUrl,
			originalUrl
		};
	}

	if (namespace === 'ipns') {
		return {
			kind: 'ipns',
			name: id,
			path,
			dnsLink: looksLikeDomain(id),
			gatewaySourceUrl: originalUrl,
			originalUrl
		};
	}

	return null;
}

function normalizePath(pathname: string): string {
	const parts = pathname
		.split('/')
		.map((token) => token.trim())
		.filter(Boolean)
		.map(decodeToken)
		.filter(Boolean);

	return parts.join('/');
}

function encodePath(path: string): string {
	if (!path) return '';
	return path
		.split('/')
		.map((token) => token.trim())
		.filter(Boolean)
		.map((token) => encodeURIComponent(token))
		.join('/');
}

function trimTrailingSlash(path: string): string {
	if (!path) return '';
	if (path === '/') return '';
	return path.endsWith('/') ? path.slice(0, -1) : path;
}

function decodeToken(token: string): string {
	try {
		return decodeURIComponent(token);
	} catch {
		return token;
	}
}

function looksLikeDomain(input: string): boolean {
	if (!input.includes('.')) return false;
	return /^[a-z0-9.-]+$/i.test(input);
}

function dedupe(values: string[]): string[] {
	const seen = new Set<string>();
	const out: string[] = [];
	for (const value of values) {
		const trimmed = value.trim();
		if (!trimmed) continue;
		if (seen.has(trimmed)) continue;
		seen.add(trimmed);
		out.push(trimmed);
	}
	return out;
}