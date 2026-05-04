/**
 * Tauri HTTP adapter — Helia-first for IPFS/IPNS, with plugin-http gateway
 * fallback and plain HTTP support.
 *
 * Only loaded inside Tauri runtime; web/PWA/TWA imports a stub that throws.
 */

import { ipns, type IPNS } from '@helia/ipns';
import { unixfs, type UnixFS } from '@helia/unixfs';
import { peerIdFromCID, peerIdFromString } from '@libp2p/peer-id';
import { createHelia } from 'helia';
import { fetch as tauriFetch } from '@tauri-apps/plugin-http';
import { CID } from 'multiformats/cid';
import { INGESTION_FETCH } from '$lib/config/back-settings.js';
import type { ProxyConfig, IpfsGatewayConfig } from '$lib/domain/ingestion/ingestion-settings.js';
import type { HttpAdapter, HttpRequestOpts, HttpResponse } from './http-adapter.js';
import {
	parseFeedTransportUrl,
	resolveFeedHttpTargets,
	type FeedIpfsTransport,
	type FeedIpnsTransport,
	joinFeedPath
} from './feed-url.js';
import {
	buildConditionalHeaders,
	createProxyTargets,
	detectParsedAs
} from './http-utils.js';

interface TauriHttpOptions {
	proxies: ProxyConfig[];
	proxyEnabled: boolean;
	ipfsGateways: IpfsGatewayConfig[];
	ipfsGatewayEnabled: boolean;
}

interface HeliaRuntime {
	fs: UnixFS;
	ipnsClient: IPNS;
}

let heliaRuntime: Promise<HeliaRuntime> | null = null;

/**
 * Build the Tauri-native HTTP adapter and wrap it in the shared
 * `HttpAdapter` interface.
 */
export function createTauriHttpAdapter(opts: TauriHttpOptions): HttpAdapter {
	return {
		async fetchText(url: string, reqOpts: HttpRequestOpts = {}): Promise<HttpResponse> {
			const transport = parseFeedTransportUrl(url);
			if (transport && transport.kind !== 'http') {
				let heliaError: unknown = null;
				try {
					const body = await resolveWithHelia(transport, reqOpts.signal);
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

				const baseTargets = resolveFeedHttpTargets(url, opts.ipfsGateways, opts.ipfsGatewayEnabled);
				const targets = createProxyTargets(baseTargets, opts.proxies, opts.proxyEnabled);
				try {
					return await fetchFromTargets(tauriFetch, targets, reqOpts);
				} catch (fallbackError) {
					throw new Error(
						`IPFS/IPNS fetch failed via Helia and gateway fallback: ${errorToString(heliaError)} | ${errorToString(fallbackError)}`
					);
				}
			}

			return fetchDirect(tauriFetch, url, reqOpts);
		}
	};
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

async function resolveWithHelia(
	transport: FeedIpfsTransport | FeedIpnsTransport,
	signal?: AbortSignal
): Promise<string> {
	const runtime = await getHeliaRuntime();
	const timeoutSignal = mergeWithTimeout(signal, INGESTION_FETCH.ipfsResolveTimeoutMs);

	if (transport.kind === 'ipfs') {
		const cid = CID.parse(transport.cid);
		return readUnixfsText(runtime.fs, cid, transport.path, timeoutSignal);
	}

	if (transport.dnsLink) {
		throw new Error('IPNS DNSLink names fall back to HTTP gateways');
	}

	const resolved = await runtime.ipnsClient.resolve(parseIpnsKey(transport.name), {
		signal: timeoutSignal
	});
	const fullPath = joinFeedPath(resolved.path ?? '', transport.path);
	return readUnixfsText(runtime.fs, resolved.cid, fullPath, timeoutSignal);
}

async function getHeliaRuntime(): Promise<HeliaRuntime> {
	if (!heliaRuntime) {
		heliaRuntime = createHeliaRuntime();
	}

	try {
		return await heliaRuntime;
	} catch (err) {
		heliaRuntime = null;
		throw err;
	}
}

async function createHeliaRuntime(): Promise<HeliaRuntime> {
	const helialib = await createHelia();
	return {
		fs: unixfs(helialib),
		ipnsClient: ipns(helialib)
	};
}

function parseIpnsKey(name: string) {
	try {
		return peerIdFromCID(CID.parse(name));
	} catch {
		return peerIdFromString(name);
	}
}

async function readUnixfsText(
	fs: UnixFS,
	cid: CID,
	path: string,
	signal: AbortSignal
): Promise<string> {
	const stream = fs.cat(cid, {
		path: path || undefined,
		signal
	});
	return readUtf8Stream(stream, INGESTION_FETCH.ipfsMaxBodyBytes);
}

async function readUtf8Stream(stream: AsyncIterable<Uint8Array>, maxBytes: number): Promise<string> {
	const chunks: Uint8Array[] = [];
	let total = 0;

	for await (const chunk of stream) {
		total += chunk.byteLength;
		if (total > maxBytes) {
			throw new Error(`IPFS response too large (${total} bytes)`);
		}
		chunks.push(chunk);
	}

	const data = new Uint8Array(total);
	let offset = 0;
	for (const chunk of chunks) {
		data.set(chunk, offset);
		offset += chunk.byteLength;
	}

	return new TextDecoder().decode(data);
}

function mergeWithTimeout(signal: AbortSignal | undefined, timeoutMs: number): AbortSignal {
	const timeoutSignal = AbortSignal.timeout(timeoutMs);
	if (!signal) return timeoutSignal;
	if (typeof AbortSignal.any === 'function') {
		return AbortSignal.any([signal, timeoutSignal]);
	}

	const controller = new AbortController();
	const onAbort = () => controller.abort();
	if (signal.aborted || timeoutSignal.aborted) {
		controller.abort();
	} else {
		signal.addEventListener('abort', onAbort, { once: true });
		timeoutSignal.addEventListener('abort', onAbort, { once: true });
	}
	return controller.signal;
}

function errorToString(err: unknown): string {
	if (err instanceof Error) return err.message;
	return String(err);
}
