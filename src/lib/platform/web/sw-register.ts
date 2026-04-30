/**
 * PWA — Service worker registration (web platforms only).
 *
 * SvelteKit emits the SW at /service-worker.js when there is a
 * src/service-worker.ts file. Registration is manual (svelte.config.js
 * has serviceWorker.register=false) so we can gate it by platform.
 *
 * Callers must check `capabilities.platform !== 'desktop'` before invoking.
 */

import { getCapabilities } from '$lib/platform/capabilities.js';
import { SERVICE_WORKER } from '$lib/config/back-settings.js';

const PERIODIC_SYNC_TAG = SERVICE_WORKER.periodicSyncTag;
const SYNC_TAG = SERVICE_WORKER.backgroundSyncTag;
const PERIODIC_MIN_INTERVAL_MS = SERVICE_WORKER.periodicMinIntervalMs;

let onlineHandlerInstalled = false;

export async function registerPwa(): Promise<ServiceWorkerRegistration | null> {
if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return null;

// Em dev (Vite), o SW é servido como ESM com HMR/imports que não evaluam
// dentro de um Service Worker. SW só faz sentido no build de produção.
if (import.meta.env.DEV) {
console.debug('[pwa] skipping service worker registration in dev mode');
return null;
}

let registration: ServiceWorkerRegistration;
try {
registration = await navigator.serviceWorker.register('/service-worker.js', {
type: 'module',
scope: '/'
});
} catch (error) {
console.error('[pwa] service worker registration failed:', error);
return null;
}

const ready = await navigator.serviceWorker.ready;
const caps = getCapabilities();

if (caps.hasPeriodicSync) {
await tryRegisterPeriodicSync(ready);
}

if (caps.hasBackgroundSync) {
installOnlineSyncTrigger(ready);
}

return registration;
}

async function tryRegisterPeriodicSync(reg: ServiceWorkerRegistration): Promise<void> {
try {
const status = await navigator.permissions.query({
// `periodic-background-sync` is non-standard in lib.dom; cast.
name: 'periodic-background-sync' as PermissionName
});
if (status.state !== 'granted') return;

const periodicSync = (reg as ServiceWorkerRegistration & {
periodicSync?: { register(tag: string, opts: { minInterval: number }): Promise<void> };
}).periodicSync;
if (!periodicSync) return;

await periodicSync.register(PERIODIC_SYNC_TAG, {
minInterval: PERIODIC_MIN_INTERVAL_MS
});
} catch (err) {
console.debug('[pwa] periodic sync registration skipped:', err);
}
}

function installOnlineSyncTrigger(reg: ServiceWorkerRegistration): void {
if (onlineHandlerInstalled) return;
onlineHandlerInstalled = true;
window.addEventListener('online', () => {
const sync = (reg as ServiceWorkerRegistration & {
sync?: { register(tag: string): Promise<void> };
}).sync;
if (!sync) return;
void sync.register(SYNC_TAG).catch((err) => {
console.debug('[pwa] sync registration failed:', err);
});
});
}
