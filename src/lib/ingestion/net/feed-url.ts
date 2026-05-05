import type { IpfsGatewayConfig } from '$lib/domain/ingestion/ingestion-settings.js';

export type FeedTransport = FeedHttpTransport | FeedIpfsTransport | FeedIpnsTransport;

type GatewayFeedTransport = FeedIpfsTransport | FeedIpnsTransport;
type GatewayNamespace = GatewayFeedTransport['kind'];
type GatewayScheme = `${GatewayNamespace}:`;

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

const GATEWAY_SCHEMES: Record<GatewayScheme, GatewayNamespace> = {
	'ipfs:': 'ipfs',
	'ipns:': 'ipns'
};

const GATEWAY_TRANSPORT_FACTORIES: Record<
	GatewayNamespace,
	(id: string, path: string, originalUrl: string, gatewaySourceUrl: string | null) => GatewayFeedTransport
> = {
	ipfs: (id, path, originalUrl, gatewaySourceUrl) => ({
		kind: 'ipfs',
		cid: id,
		path,
		gatewaySourceUrl,
		originalUrl
	}),
	ipns: (id, path, originalUrl, gatewaySourceUrl) => ({
		kind: 'ipns',
		name: id,
		path,
		dnsLink: looksLikeDomain(id),
		gatewaySourceUrl,
		originalUrl
	})
};

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
	const gatewayNamespace = GATEWAY_SCHEMES[protocol as GatewayScheme];
	if (gatewayNamespace) {
		return parseGatewayScheme(parsed, originalUrl, gatewayNamespace);
	}
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
	ipfsGateways: IpfsGatewayConfig[]
): string[] {
	const parsed = parseFeedTransportUrl(input);
	if (!parsed) return [];

	if (parsed.kind === 'http') return [parsed.url];

	const targets: string[] = [];
	if (parsed.gatewaySourceUrl) targets.push(parsed.gatewaySourceUrl);

	for (const gateway of ipfsGateways) {
		const target = buildGatewayUrl(gateway.url, parsed);
		if (target) targets.push(target);
	}

	return dedupe(targets);
}

export function joinFeedPath(...parts: Array<string | null | undefined>): string {
	const tokens: string[] = [];
	for (const part of parts) {
		if (!part) continue;
		tokens.push(...splitPathTokens(part, false));
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
	const id = encodeURIComponent(getGatewayTransportId(feed));
	const encodedPath = encodePath(feed.path);
	const suffix = encodedPath ? `/${encodedPath}` : '';
	const prefix = trimTrailingSlash(base.pathname);
	base.pathname = `${prefix}/${namespace}/${id}${suffix}`;
	base.search = '';
	base.hash = '';

	return base.toString();
}

function parseGatewayScheme(parsed: URL, originalUrl: string, namespace: GatewayNamespace): GatewayFeedTransport | null {
	const id = parsed.hostname.trim();
	if (!id) return null;

	return createGatewayTransport(namespace, id, normalizePath(parsed.pathname), originalUrl, null);
}

function parseGatewayPath(pathname: string, originalUrl: string): GatewayFeedTransport | null {
	const tokens = splitPathTokens(pathname, true);
	if (tokens.length < 2) return null;

	const namespace = tokens[0].toLowerCase();
	if (!isGatewayNamespace(namespace)) return null;
	const id = tokens[1];
	if (!id) return null;

	const path = tokens.slice(2).join('/');
	return createGatewayTransport(namespace, id, path, originalUrl, originalUrl);
}

function createGatewayTransport(
	namespace: GatewayNamespace,
	id: string,
	path: string,
	originalUrl: string,
	gatewaySourceUrl: string | null
): GatewayFeedTransport {
	return GATEWAY_TRANSPORT_FACTORIES[namespace](id, path, originalUrl, gatewaySourceUrl);
}

function isGatewayNamespace(input: string): input is GatewayNamespace {
	return input === 'ipfs' || input === 'ipns';
}

function normalizePath(pathname: string): string {
	return splitPathTokens(pathname, true).join('/');
}

function encodePath(path: string): string {
	const tokens = splitPathTokens(path, false);
	if (tokens.length === 0) return '';
	return tokens.map((token) => encodeURIComponent(token)).join('/');
}

function splitPathTokens(pathname: string, decode: boolean): string[] {
	const out: string[] = [];
	for (const token of pathname.split('/')) {
		const trimmed = token.trim();
		if (!trimmed) continue;

		const normalized = decode ? decodeToken(trimmed) : trimmed;
		if (!normalized) continue;
		out.push(normalized);
	}

	return out;
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

function getGatewayTransportId(feed: GatewayFeedTransport): string {
	return feed.kind === 'ipfs' ? feed.cid : feed.name;
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