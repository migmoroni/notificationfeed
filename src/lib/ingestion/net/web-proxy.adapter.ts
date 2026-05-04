/**
 * Web/PWA/TWA HTTP adapter — Helia-first for IPFS/IPNS, with gateway+proxy
 * fallback and plain HTTP support.
 */

import type {
	ProxyConfig,
	IpfsGatewayConfig,
	FeedTransportByKind
} from '$lib/domain/ingestion/ingestion-settings.js';
import type { HttpAdapter, HttpRequestOpts, HttpResponse } from './http-adapter.js';
import { parseFeedTransportUrl, resolveFeedHttpTargets } from './feed-url.js';
import { buildConditionalHeaders, createProxyTargets, detectParsedAs } from './http-utils.js';
import { resolveTransportWithHelia } from './helia-resolver.js';

interface WebProxyOptions {
	proxies: ProxyConfig[];
	ipfsGateways: IpfsGatewayConfig[];
	ipfsGatewayEnabled: boolean;
	feedTransportByKind: FeedTransportByKind;
}

/**
 * Build a web/PWA HTTP adapter with a two-stage strategy:
 * 1) Helia-first for ipfs/ipns transports.
 * 2) Gateway + CORS proxy fallback for every HTTP target.
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

			const candidates = createProxyTargets(
				baseTargets,
				opts.proxies,
				reqOpts.feedKind,
				opts.feedTransportByKind
			);
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

			const body = await readResponseBody(response);
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

async function readResponseBody(response: Response): Promise<string> {
	const contentType = response.headers.get('content-type');
	const bytes = new Uint8Array(await response.arrayBuffer());
	let body = decodeUtf8(bytes);

	if (!shouldTryDecompression(body, contentType)) return body;

	const decompressed = await tryDecompression(bytes);
	if (decompressed) return decompressed;
	return body;
}

function decodeUtf8(data: Uint8Array): string {
	return new TextDecoder().decode(data);
}

function shouldTryDecompression(body: string, contentType: string | null): boolean {
	if (!body) return true;
	if (isStructuredText(body)) return false;

	const ct = (contentType ?? '').toLowerCase();
	if (ct.includes('json') || ct.includes('xml') || ct.includes('text')) {
		if (containsManyControlChars(body)) return true;
		if (body.includes('\ufffd')) return true;
	}

	return false;
}

function isStructuredText(body: string): boolean {
	const t = body.trimStart();
	return t.startsWith('{') || t.startsWith('[') || t.startsWith('<');
}

function containsManyControlChars(body: string): boolean {
	let controlCount = 0;
	for (let i = 0; i < body.length; i++) {
		const code = body.charCodeAt(i);
		if (code < 32 && code !== 9 && code !== 10 && code !== 13) controlCount++;
	}
	return controlCount > Math.max(8, Math.floor(body.length * 0.01));
}

async function tryDecompression(data: Uint8Array): Promise<string | null> {
	type DecompressionStreamCtor = new (
		format: 'gzip' | 'deflate' | 'br'
	) => TransformStream<Uint8Array, Uint8Array>;
	const ctor = (globalThis as unknown as { DecompressionStream?: DecompressionStreamCtor })
		.DecompressionStream;
	if (!ctor) return null;

	for (const format of ['br', 'gzip', 'deflate'] as const) {
		try {
			const payload = new Uint8Array(data.byteLength);
			payload.set(data);
			const stream = new Blob([payload]).stream().pipeThrough(new ctor(format));
			const decoded = decodeUtf8(new Uint8Array(await new Response(stream).arrayBuffer()));
			if (isStructuredText(decoded) && !containsManyControlChars(decoded)) {
				return decoded;
			}
		} catch {
			// try next format
		}
	}

	return null;
}

function errorToString(err: unknown): string {
	if (err instanceof Error) return err.message;
	return String(err);
}
