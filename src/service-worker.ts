/// <reference types="@sveltejs/kit" />
/// <reference lib="webworker" />

/**
 * Notfeed service worker.
 *
 * - Precaches the SvelteKit-built app shell + static files using Workbox.
 * - Serves a SPA navigation fallback (the precached `/` document) for any
 *   in-scope navigation, so deep links work offline once visited.
 * - Stub listeners for `sync` / `periodicsync` / `message` will be filled
 *   in by Plan B (ingestion pipeline).
 */

import { build, files, prerendered, version } from '$service-worker';
import { precacheAndRoute, createHandlerBoundToURL } from 'workbox-precaching';
import { NavigationRoute, registerRoute } from 'workbox-routing';

declare const self: ServiceWorkerGlobalScope;

// Build a Workbox precache manifest from SvelteKit's $service-worker module.
// `build` entries already include hashed URLs (revision: null is correct).
// `files` (static/) and `prerendered` need an explicit revision so they get
// busted when the deployment version changes.
// `/` is the adapter-static SPA fallback (index.html) — not in any of the
// three lists, so we add it explicitly so the navigation handler can bind.
// Filter out files SvelteKit lists but adapter-static doesn't actually copy
// (e.g. dotfiles like .gitkeep) — precaching them would 404 and break install.
const isPrecacheable = (url: string) => !url.split('/').pop()?.startsWith('.');

const manifest = [
	{ url: '/', revision: version },
	...build.map((url) => ({ url, revision: null })),
	...files.filter(isPrecacheable).map((url) => ({ url, revision: version })),
	...prerendered.map((url) => ({ url, revision: version }))
];
precacheAndRoute(manifest);

// SPA navigation fallback — serve the precached app shell for any nav.
// adapter-static with fallback: 'index.html' emits a precached document at
// the root scope; createHandlerBoundToURL returns it as the response.
const navHandler = createHandlerBoundToURL('/');
registerRoute(new NavigationRoute(navHandler));

// Activation: take control immediately so updates are picked up on first nav.
self.addEventListener('install', () => {
	self.skipWaiting();
});
self.addEventListener('activate', (event) => {
	event.waitUntil(self.clients.claim());
});

// Background-sync stub. Plan B will trigger the ingestion tick here when the
// browser flushes a pending `notfeed-fetch` tag after reconnecting.
interface SyncEvent extends ExtendableEvent {
	readonly tag: string;
	readonly lastChance: boolean;
}
self.addEventListener('sync', (event) => {
	const e = event as SyncEvent;
	console.debug('[sw] sync', e.tag);
	// TODO(plan-B): runIngestionTickInSW({ trigger: 'sync', tag: e.tag });
});

// Periodic background sync stub (PWA only, requires permission). Plan B will
// run a periodic ingestion tick here.
interface PeriodicSyncEvent extends ExtendableEvent {
	readonly tag: string;
}
self.addEventListener('periodicsync', (event) => {
	const e = event as PeriodicSyncEvent;
	console.debug('[sw] periodicsync', e.tag);
	// TODO(plan-B): runIngestionTickInSW({ trigger: 'periodicsync', tag: e.tag });
});

// Message channel stub. Plan B will use it for app→SW commands like
// "force a tick now" or "update auth token".
self.addEventListener('message', (event) => {
	console.debug('[sw] message', event.data);
	// TODO(plan-B): handle commands from page clients.
});
