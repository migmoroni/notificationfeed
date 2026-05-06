/// <reference types="@sveltejs/kit" />
/// <reference lib="webworker" />

/**
 * Notfeed service worker.
 *
 * - Precaches the SvelteKit-built app shell + static files using Workbox.
 * - Serves a SPA navigation fallback (the precached `/` document) for any
 *   in-scope navigation, so deep links work offline once visited.
 * - Runtime-caches requested images (cache-first) so viewed media can be
 *   reopened without downloading again.
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

const DAY_MS = 24 * 60 * 60 * 1000;
const RUNTIME_IMAGE_CACHE = 'notfeed-runtime-images-v2';
const RUNTIME_IMAGE_META_CACHE = 'notfeed-runtime-images-meta-v2';
const RUNTIME_IMAGE_CACHE_LEGACY = 'notfeed-runtime-images-v1';
const RUNTIME_IMAGE_META_CACHE_LEGACY = 'notfeed-runtime-images-meta-v1';
const RUNTIME_IMAGE_CACHE_MAX_ENTRIES = 500;
const RUNTIME_IMAGE_CACHE_MAX_UNUSED_MS = 30 * DAY_MS;
const RUNTIME_IMAGE_CACHE_PRUNE_INTERVAL_MS = 6 * 60 * 60 * 1000;
let lastRuntimeImagePruneAt = 0;

// SPA navigation fallback — serve the precached app shell for any nav.
// adapter-static with fallback: 'index.html' emits a precached document at
// the root scope; createHandlerBoundToURL returns it as the response.
const navHandler = createHandlerBoundToURL('/');
registerRoute(new NavigationRoute(navHandler));

// Runtime cache for external and dynamic images. We intentionally use a
// cache-first strategy to avoid redownloading images the user has already
// seen, while keeping media loading on-demand at render time.
registerRoute(
        ({ request, url }) => isRuntimeImageRequest(request, url),
        async ({ request }) => {
                const now = Date.now();
                const cache = await caches.open(RUNTIME_IMAGE_CACHE);
                const meta = await caches.open(RUNTIME_IMAGE_META_CACHE);

                await maybePruneRuntimeImages(cache, meta, now);

                const cached = await cache.match(request);
                if (cached) {
                        await touchRuntimeImage(meta, request.url, now);
                        return cached;
                }

                try {
                        const network = await fetch(request);
                        if (isCacheableImageResponse(network)) {
                                await cache.put(request, network.clone());
                                await touchRuntimeImage(meta, request.url, now);
                        }
                        return network;
                } catch (err) {
                        void err;
                        return Response.error();
                }
        }
);

function isRuntimeImageRequest(request: Request, url: URL): boolean {
        if (request.method !== 'GET') return false;
        if (request.destination !== 'image') return false;
        return url.protocol === 'http:' || url.protocol === 'https:';
}

function isCacheableImageResponse(response: Response): boolean {
        return response.ok || response.type === 'opaque';
}

function runtimeMetaRequest(url: string): Request {
        return new Request(url);
}

async function touchRuntimeImage(meta: Cache, url: string, now: number): Promise<void> {
        await meta.put(runtimeMetaRequest(url), new Response(String(now)));
}

async function readRuntimeImageLastUsed(meta: Cache, url: string): Promise<number | null> {
        const record = await meta.match(runtimeMetaRequest(url));
        if (!record) return null;
        const text = await record.text();
        const value = Number(text);
        return Number.isFinite(value) ? value : null;
}

async function deleteRuntimeImage(cache: Cache, meta: Cache, request: Request): Promise<void> {
        await cache.delete(request);
        await meta.delete(runtimeMetaRequest(request.url));
}

async function maybePruneRuntimeImages(cache: Cache, meta: Cache, now: number): Promise<void> {
        if (now - lastRuntimeImagePruneAt < RUNTIME_IMAGE_CACHE_PRUNE_INTERVAL_MS) return;
        lastRuntimeImagePruneAt = now;
        await pruneRuntimeImages(cache, meta, now);
}

async function pruneRuntimeImages(cache: Cache, meta: Cache, now: number): Promise<void> {
        const keys = await cache.keys();
        const active: Array<{ request: Request; lastUsed: number }> = [];

        for (const request of keys) {
                const lastUsed = await readRuntimeImageLastUsed(meta, request.url);
                const resolvedLastUsed = lastUsed ?? now;

                if (lastUsed == null) {
                        await touchRuntimeImage(meta, request.url, resolvedLastUsed);
                }

                if (now - resolvedLastUsed > RUNTIME_IMAGE_CACHE_MAX_UNUSED_MS) {
                        await deleteRuntimeImage(cache, meta, request);
                        continue;
                }

                active.push({ request, lastUsed: resolvedLastUsed });
        }

        if (active.length <= RUNTIME_IMAGE_CACHE_MAX_ENTRIES) return;

        active.sort((a, b) => a.lastUsed - b.lastUsed);
        const overflow = active.length - RUNTIME_IMAGE_CACHE_MAX_ENTRIES;
        for (let i = 0; i < overflow; i++) {
                await deleteRuntimeImage(cache, meta, active[i].request);
        }
}

async function cleanupLegacyRuntimeImageCaches(): Promise<void> {
        const names = await caches.keys();
        const legacy = names.filter(
                (name) => name === RUNTIME_IMAGE_CACHE_LEGACY || name === RUNTIME_IMAGE_META_CACHE_LEGACY
        );
        if (legacy.length === 0) return;
        await Promise.all(legacy.map((name) => caches.delete(name)));
}

// Activation: take control immediately so updates are picked up on first nav.
self.addEventListener('install', () => {
	self.skipWaiting();
});
self.addEventListener('activate', (event) => {
        event.waitUntil(
                (async () => {
                        await cleanupLegacyRuntimeImageCaches();
                        const cache = await caches.open(RUNTIME_IMAGE_CACHE);
                        const meta = await caches.open(RUNTIME_IMAGE_META_CACHE);
                        await pruneRuntimeImages(cache, meta, Date.now());
                        await self.clients.claim();
                })()
        );
});

// Background-sync handler. Browser flushes a queued `notfeed-fetch` tag
// (registered by the page after reconnect) → run a manager tick.
interface SyncEvent extends ExtendableEvent {
        readonly tag: string;
        readonly lastChance: boolean;
}
self.addEventListener('sync', (event) => {
        const e = event as SyncEvent;
        if (e.tag !== 'notfeed-fetch') return;
        e.waitUntil(runTickInSW('sync'));
});

// Periodic background sync handler — Chrome only, requires permission.
interface PeriodicSyncEvent extends ExtendableEvent {
        readonly tag: string;
}
self.addEventListener('periodicsync', (event) => {
        const e = event as PeriodicSyncEvent;
        if (e.tag !== 'notfeed-periodic-fetch') return;
        e.waitUntil(runTickInSW('periodicsync'));
});

// Message channel — page → SW commands. Currently `{type:'tick'}` triggers
// an immediate ingestion tick for debugging / manual refresh.
self.addEventListener('message', (event) => {
        const data = event.data as { type?: string } | undefined;
        if (data?.type === 'tick') {
                event.waitUntil(runTickInSW('message'));
        }
});

// Notification click — focus an existing window if one is open, otherwise
// open a new one. The target URL is set by the engine via the
// `data.targetUrl` field on `showNotification`.
self.addEventListener('notificationclick', (event) => {
        event.notification.close();
        const data = event.notification.data as { targetUrl?: string } | undefined;
        const targetUrl = data?.targetUrl ?? '/';
        event.waitUntil(
                (async () => {
                        const clientsApi = (self as unknown as ServiceWorkerGlobalScope).clients;
                        const allClients = await clientsApi.matchAll({
                                type: 'window',
                                includeUncontrolled: true
                        });
                        // Prefer focusing an open window — navigate it to the target.
                        for (const c of allClients) {
                                try {
                                        await (c as WindowClient).focus();
                                        await (c as WindowClient).navigate(targetUrl);
                                        return;
                                } catch {
                                        /* try next */
                                }
                        }
                        await clientsApi.openWindow(targetUrl);
                })()
        );
});

async function runTickInSW(trigger: string): Promise<void> {
        try {
                const { createPostManager } = await import('./lib/ingestion/post-manager.js');
                const manager = createPostManager({ getActiveUserId: () => null });
                const result = await manager.tick();
                console.debug('[sw] tick done', trigger, result);
                // Notifications are delegated to the per-user pipeline run from
                // inside `post-manager.processFont` (see notification-engine).
        } catch (err) {
                console.warn('[sw] tick failed', trigger, err);
        }
}
