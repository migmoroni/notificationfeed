/**
 * Persistence factory.
 *
 * Selects and caches the active StorageBackend based on
 * `capabilities.storageBackend`. All stores in this folder consume
 * the backend through `getDatabase()` (legacy name) or
 * `getStorageBackend()` (new name) — they are aliases.
 *
 * - 'indexeddb' (default) → IndexedDBBackend (web/PWA/AppImage)
 * - 'sqlite' (Plan C)     → SqliteBackend (other Tauri bundles)
 */

import { getCapabilities } from '$lib/platform/capabilities.js';
import type { StorageBackend, StoreOps } from './backends/storage-backend.js';
import { openIndexedDBBackend } from './backends/indexeddb.backend.js';
import { openSqliteBackend } from './backends/sqlite.backend.js';

// Back-compat type aliases for existing call-sites.
export type Database = StorageBackend;
export type TableOps = StoreOps;

let cached: StorageBackend | null = null;
let pending: Promise<StorageBackend> | null = null;

export async function getStorageBackend(): Promise<StorageBackend> {
if (cached) return cached;
if (pending) return pending;

const { storageBackend } = getCapabilities();

pending = (async () => {
switch (storageBackend) {
case 'indexeddb':
cached = await openIndexedDBBackend();
break;
case 'sqlite':
cached = await openSqliteBackend();
break;
default: {
const exhaustive: never = storageBackend;
throw new Error(`Unknown storage backend: ${exhaustive as string}`);
}
}
pending = null;
return cached;
})();

return pending;
}

/** @deprecated Use getStorageBackend(). Kept for back-compat. */
export const getDatabase = getStorageBackend;
