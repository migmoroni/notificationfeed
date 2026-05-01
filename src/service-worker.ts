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
                const { createPostManager } = await import('$lib/ingestion/post-manager.js');
                const manager = createPostManager({ getActiveUserId: () => null });
                const result = await manager.tick();
                console.debug('[sw] tick done', trigger, result);
                // Notifications are delegated to the per-user pipeline run from
                // inside `post-manager.processFont` (see notification-engine).
        } catch (err) {
                console.warn('[sw] tick failed', trigger, err);
        }
}
