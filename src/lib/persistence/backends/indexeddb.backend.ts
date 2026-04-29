/**
 * IndexedDB implementation of StorageBackend.
 *
 * Active for: web, PWA, Android TWA, and Tauri Linux AppImage.
 *
 * Pre-release: schema migrations are destructive — bumping the DB
 * version drops all stores and recreates them.
 */

import type { StorageBackend, StoreOps } from './storage-backend.js';

const DB_NAME = 'notfeed-v2';
const DB_VERSION = 11;

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
		categories: createTable(idb, 'categories'),
		activityData: createTable(idb, 'activityData')
	};
}

function openDatabase(): Promise<IDBDatabase> {
	return new Promise((resolve, reject) => {
		const request = indexedDB.open(DB_NAME, DB_VERSION);

		request.onupgradeneeded = (event) => {
			const idb = request.result;
			const oldVersion = (event as IDBVersionChangeEvent).oldVersion;

			// Destructive: delete all existing stores and recreate
			if (oldVersion < 11) {
				for (const name of idb.objectStoreNames) {
					idb.deleteObjectStore(name);
				}

				// Content trees (with embedded nodes) — consumer/read
				const treeStore = idb.createObjectStore('contentTrees', { keyPath: 'metadata.id' });
				treeStore.createIndex('author', 'metadata.author', { unique: false });

				// Content medias — consumer/read
				const mediaStore = idb.createObjectStore('contentMedias', { keyPath: 'metadata.id' });
				mediaStore.createIndex('author', 'metadata.author', { unique: false });

				// Editor trees — creator/edit
				const editorTreeStore = idb.createObjectStore('editorTrees', { keyPath: 'metadata.id' });
				editorTreeStore.createIndex('author', 'metadata.author', { unique: false });

				// Editor medias — creator/edit
				const editorMediaStore = idb.createObjectStore('editorMedias', { keyPath: 'metadata.id' });
				editorMediaStore.createIndex('author', 'metadata.author', { unique: false });

				// Tree publications
				idb.createObjectStore('treePublications', { keyPath: 'treeId' });

				// Users
				const userStore = idb.createObjectStore('users', { keyPath: 'id' });
				userStore.createIndex('role', 'role', { unique: false });

				// Posts (grouped by composite nodeId = treeId:localUuid)
				idb.createObjectStore('posts', { keyPath: 'nodeId' });

				// Categories
				const catStore = idb.createObjectStore('categories', { keyPath: 'id' });
				catStore.createIndex('parentId', 'parentId', { unique: false });
				catStore.createIndex('treeId', 'treeId', { unique: false });

				// Per-user activity log (kept outside the user record to keep users lean)
				idb.createObjectStore('activityData', { keyPath: 'userId' });
			}
		};

		request.onsuccess = () => resolve(request.result);
		request.onerror = () => reject(request.error);
	});
}

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
