/**
 * HTTP adapter interface — used by ingestion clients to fetch text-based
 * resources (RSS/Atom/JSON Feed documents) regardless of runtime.
 *
 * Two implementations exist:
 *  - `web-proxy.adapter` (browser/PWA/TWA): resolves http(s)/ipfs/ipns URL
 *    transport with Helia first for ipfs/ipns, then gateway + proxy fallback.
 *    Some proxies pre-parse RSS into JSON (e.g. rss2json), in which case
 *    the response is flagged with
 *    `parsedAs: 'rss-json'`.
 *  - `tauri-http.adapter` (Tauri desktop AppImage): uses Helia-first for
 *    ipfs/ipns and falls back to gateway/proxy HTTP fetches via
 *    `@tauri-apps/plugin-http`.
 *
 * The factory in `./index.ts` picks the right adapter at runtime.
 */

export interface HttpRequestOpts {
	/** Logical feed kind for proxy compatibility decisions. */
	feedKind?: 'rss' | 'atom' | 'jsonfeed';
	/** ETag from a prior response — sent as `If-None-Match`. */
	etag?: string | null;
	/** Last-Modified from a prior response — sent as `If-Modified-Since`. */
	lastModified?: string | null;
	/** AbortSignal for cancellation. */
	signal?: AbortSignal;
}

export interface HttpResponse {
	/** HTTP status code. 304 means "not modified, body empty". */
	status: number;
	/** Response body. Empty string when status === 304. */
	body: string;
	/** ETag returned by the server, if any (for conditional GET). */
	etag: string | null;
	/** Last-Modified header, if any. */
	lastModified: string | null;
	/**
	 * Indicates how the body should be interpreted by the caller.
	 * - 'raw': feed the body to the protocol parser (default).
	 * - 'rss-json': proxy already parsed RSS to JSON (e.g. rss2json) — caller
	 *   maps the JSON shape directly instead of running the XML parser.
	 */
	parsedAs: 'raw' | 'rss-json';
}

export interface HttpAdapter {
	fetchText(url: string, opts?: HttpRequestOpts): Promise<HttpResponse>;
}
