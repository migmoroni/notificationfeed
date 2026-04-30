/**
 * Tauri HTTP adapter — uses @tauri-apps/plugin-http to bypass CORS entirely.
 *
 * Only loaded inside Tauri runtime; web/PWA/TWA imports a stub that throws.
 */

import type { HttpAdapter, HttpRequestOpts, HttpResponse } from './http-adapter.js';

/**
 * Build the Tauri-native HTTP adapter. Loads `@tauri-apps/plugin-http`
 * lazily (the import would crash on web/PWA), then wraps it in the
 * shared `HttpAdapter` interface.
 */
export async function createTauriHttpAdapter(): Promise<HttpAdapter> {
	const { fetch: tauriFetch } = await import('@tauri-apps/plugin-http');

	return {
		async fetchText(url: string, reqOpts: HttpRequestOpts = {}): Promise<HttpResponse> {
			const headers: Record<string, string> = {};
			if (reqOpts.etag) headers['If-None-Match'] = reqOpts.etag;
			if (reqOpts.lastModified) headers['If-Modified-Since'] = reqOpts.lastModified;

			const response = await tauriFetch(url, {
				method: 'GET',
				headers,
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
	};
}
