/**
 * IndexedDB implementation of StorageBackend.
 *
 * Active for: web, PWA, Android TWA, and Tauri Linux AppImage.
 *
 * Pre-release: schema migrations are destructive — bumping the DB
 * version drops all stores and recreates them from STORE_SPECS.
 */

import type { StorageBackend, StoreOps } from './storage-backend.js';
import { STORE_SPECS } from '../schema.js';
import { PERSISTENCE } from '$lib/config/back-settings.js';

const DB_NAME = PERSISTENCE.dbName;
/**
 * v12 (Plano B): per-user post boxes (composite key via synthetic `_pk`),
 * new `fetcherStates` store, all timestamps as epoch ms numbers.
 */
const DB_VERSION = PERSISTENCE.dbSchemaVersion;

/**
 * Open (or upgrade) the IndexedDB database and return a StorageBackend
 * whose every store is wired to a fresh `StoreOps` instance backed by
 * the same `IDBDatabase` connection.
 */
export async function openIndexedDBBackend(): Promise<StorageBackend> {
	const idb = await openDatabase();
	return {
		contentTrees: createTable(idb, 'contentTrees'),
		contentMedias: createTable(idb, 'contentMedias'),
		editorTrees: createTable(idb, 'editorTrees'),
		editorMedias: createTable(idb, 'editorMedias'),
		treePublications: createTable(idb, 'treePublications'),
		users: createTable(idb, 'users'),
		posts: createTable(idb, 'posts'),
		fetcherStates: createTable(idb, 'fetcherStates'),
		categories: createTable(idb, 'categories'),
		activityData: createTable(idb, 'activityData')
	};
}

/**
 * Wrap `indexedDB.open` in a promise and run the destructive
 * migration in `onupgradeneeded` whenever `DB_VERSION` is newer than
 * the on-disk version. The migration drops every existing store and
 * recreates them from `STORE_SPECS` — acceptable while the app is
 * pre-release and has no data worth preserving across schema bumps.
 */
function openDatabase(): Promise<IDBDatabase> {
	return new Promise((resolve, reject) => {
		const request = indexedDB.open(DB_NAME, DB_VERSION);

		request.onupgradeneeded = () => {
			const idb = request.result;

			// Destructive migration (pre-release): drop everything and rebuild
			// from STORE_SPECS. Avoids bespoke per-version migration code.
			for (const name of Array.from(idb.objectStoreNames)) {
				idb.deleteObjectStore(name);
			}

			for (const spec of STORE_SPECS) {
				const store = idb.createObjectStore(spec.name, { keyPath: spec.keyPath });
				if (spec.indexes) {
					for (const idx of spec.indexes) {
						store.createIndex(idx.name, idx.keyPath, { unique: idx.unique ?? false });
					}
				}
			}
		};

		request.onsuccess = () => resolve(request.result);
		request.onerror = () => reject(request.error);
	});
}

/**
 * Build a `StoreOps` object that talks to a single IndexedDB object
 * store. Each verb opens its own short-lived transaction so callers
 * never have to think about transaction lifetime; the trade-off is
 * lower throughput on bulk operations, which is acceptable here.
 */
function createTable(db: IDBDatabase, storeName: string): StoreOps {
	return {
		async getAll<T>(): Promise<T[]> {
			return new Promise((resolve, reject) => {
				const tx = db.transaction(storeName, 'readonly');
				const store = tx.objectStore(storeName);
				const request = store.getAll();
				request.onsuccess = () => resolve(request.result);
				request.onerror = () => reject(request.error);
			});
		},

		async getById<T>(id: string): Promise<T | null> {
			return new Promise((resolve, reject) => {
				const tx = db.transaction(storeName, 'readonly');
				const store = tx.objectStore(storeName);
				const request = store.get(id);
				request.onsuccess = () => resolve(request.result ?? null);
				request.onerror = () => reject(request.error);
			});
		},

		async query<T>(index: string, value: unknown): Promise<T[]> {
			return new Promise((resolve, reject) => {
				const tx = db.transaction(storeName, 'readonly');
				const store = tx.objectStore(storeName);
				const idx = store.index(index);
				const request = idx.getAll(value as IDBValidKey);
				request.onsuccess = () => resolve(request.result);
				request.onerror = () => reject(request.error);
			});
		},

		async put<T>(item: T): Promise<void> {
			return new Promise((resolve, reject) => {
				const tx = db.transaction(storeName, 'readwrite');
				const store = tx.objectStore(storeName);
				const request = store.put(item);
				request.onsuccess = () => resolve();
				request.onerror = () => reject(request.error);
			});
		},

		async delete(id: string): Promise<void> {
			return new Promise((resolve, reject) => {
				const tx = db.transaction(storeName, 'readwrite');
				const store = tx.objectStore(storeName);
				const request = store.delete(id);
				request.onsuccess = () => resolve();
				request.onerror = () => reject(request.error);
			});
		}
	};
}
