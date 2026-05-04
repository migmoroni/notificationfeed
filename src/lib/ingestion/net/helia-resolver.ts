import { ipns, type IPNS } from '@helia/ipns';
import { unixfs, type UnixFS } from '@helia/unixfs';
import { peerIdFromCID, peerIdFromString } from '@libp2p/peer-id';
import { createHelia } from 'helia';
import { CID } from 'multiformats/cid';
import { INGESTION_FETCH } from '$lib/config/back-settings.js';
import {
	joinFeedPath,
	type FeedIpfsTransport,
	type FeedIpnsTransport
} from './feed-url.js';

interface HeliaRuntime {
	fs: UnixFS;
	ipnsClient: IPNS;
}

let heliaRuntime: Promise<HeliaRuntime> | null = null;

export async function resolveTransportWithHelia(
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
	const timeoutSignal = createTimeoutSignal(timeoutMs);
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

function createTimeoutSignal(timeoutMs: number): AbortSignal {
	if (typeof AbortSignal.timeout === 'function') {
		return AbortSignal.timeout(timeoutMs);
	}

	const controller = new AbortController();
	const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
	controller.signal.addEventListener(
		'abort',
		() => {
			clearTimeout(timeoutId);
		},
		{ once: true }
	);
	return controller.signal;
}