/**
 * Database initialization and migration.
 *
 * Abstracts over IndexedDB (web/PWA/TWA) and SQLite (Tauri desktop).
 * Provides a unified interface for the persistence layer.
 */

import { detectPlatform } from '$lib/platform/capabilities.js';

export interface Database {
	users: TableOps;
	creatorPages: TableOps;
	profiles: TableOps;
	fonts: TableOps;
	categories: TableOps;
	consumerStates: TableOps;
	posts: TableOps;
	favoriteTabs: TableOps;
}

export interface TableOps {
	getAll<T>(): Promise<T[]>;
	getById<T>(id: string): Promise<T | null>;
	query<T>(index: string, value: unknown): Promise<T[]>;
	put<T>(item: T): Promise<void>;
	delete(id: string): Promise<void>;
}

let db: Database | null = null;

export async function getDatabase(): Promise<Database> {
	if (db) return db;

	const platform = detectPlatform();

	if (platform === 'desktop') {
		// TODO: Initialize SQLite via Tauri plugin
		throw new Error('SQLite backend not yet implemented');
	}

	db = await initIndexedDB();
	return db;
}

async function initIndexedDB(): Promise<Database> {
	return new Promise((resolve, reject) => {
		const request = indexedDB.open('notfeed', 4);

		request.onupgradeneeded = (event) => {
			const idb = request.result;
			const oldVersion = (event as IDBVersionChangeEvent).oldVersion;

			// ── v1 → initial stores ────────────────────────────────────

			if (!idb.objectStoreNames.contains('users')) {
				const userStore = idb.createObjectStore('users', { keyPath: 'id' });
				userStore.createIndex('role', 'role', { unique: false });
			}

			if (!idb.objectStoreNames.contains('creatorPages')) {
				const cpStore = idb.createObjectStore('creatorPages', { keyPath: 'id' });
				cpStore.createIndex('ownerId', 'ownerId', { unique: false });
			}

			if (!idb.objectStoreNames.contains('profiles')) {
				const profileStore = idb.createObjectStore('profiles', { keyPath: 'id' });
				profileStore.createIndex('ownerId', 'ownerId', { unique: false });
				profileStore.createIndex('creatorPageId', 'creatorPageId', { unique: false });
			}

			if (!idb.objectStoreNames.contains('fonts')) {
				const fontStore = idb.createObjectStore('fonts', { keyPath: 'id' });
				fontStore.createIndex('profileId', 'profileId', { unique: false });
			}

			if (!idb.objectStoreNames.contains('categories')) {
				const catStore = idb.createObjectStore('categories', { keyPath: 'id' });
				catStore.createIndex('parentId', 'parentId', { unique: false });
				catStore.createIndex('treeId', 'treeId', { unique: false });
			}

			if (!idb.objectStoreNames.contains('consumerStates')) {
				const csStore = idb.createObjectStore('consumerStates', { keyPath: 'entityId' });
				csStore.createIndex('entityType', 'entityType', { unique: false });
			}

			if (!idb.objectStoreNames.contains('posts')) {
				const postStore = idb.createObjectStore('posts', { keyPath: 'id' });
				postStore.createIndex('fontId', 'fontId', { unique: false });
				postStore.createIndex('publishedAt', 'publishedAt', { unique: false });
			}

			// ── v3 → favoriteFolders store + category index migration ──

			if (!idb.objectStoreNames.contains('favoriteFolders') && !idb.objectStoreNames.contains('favoriteTabs')) {
				// Fresh install or upgrading from < v3: create favoriteTabs directly
				idb.createObjectStore('favoriteTabs', { keyPath: 'id' });
			}

			// Remove stale indexes from v2 categories (origin, ownerId, categoryId on profiles)
			if (oldVersion > 0 && oldVersion < 3) {
				const tx = (event.target as IDBOpenDBRequest).transaction!;

				// Categories: drop origin/ownerId indexes, add treeId if missing
				if (idb.objectStoreNames.contains('categories')) {
					const catStore = tx.objectStore('categories');
					if (catStore.indexNames.contains('origin')) catStore.deleteIndex('origin');
					if (catStore.indexNames.contains('ownerId')) catStore.deleteIndex('ownerId');
					if (!catStore.indexNames.contains('treeId')) {
						catStore.createIndex('treeId', 'treeId', { unique: false });
					}
				}

				// Profiles: drop categoryId index (no longer single field)
				if (idb.objectStoreNames.contains('profiles')) {
					const profileStore = tx.objectStore('profiles');
					if (profileStore.indexNames.contains('categoryId')) {
						profileStore.deleteIndex('categoryId');
					}
				}
			}

			// ── v4 → favoriteFolders → favoriteTabs + consumerState migration ──

			if (oldVersion > 0 && oldVersion < 4) {
				// Rename store: delete favoriteFolders, create favoriteTabs
				if (idb.objectStoreNames.contains('favoriteFolders')) {
					idb.deleteObjectStore('favoriteFolders');
				}
				if (!idb.objectStoreNames.contains('favoriteTabs')) {
					idb.createObjectStore('favoriteTabs', { keyPath: 'id' });
				}

				// Migrate consumerStates: favoriteFolderId → favoriteTabIds
				if (idb.objectStoreNames.contains('consumerStates')) {
					const tx = (event.target as IDBOpenDBRequest).transaction!;
					const csStore = tx.objectStore('consumerStates');
					const getAll = csStore.getAll();
					getAll.onsuccess = () => {
						for (const record of getAll.result) {
							if ('favoriteFolderId' in record) {
								delete (record as any).favoriteFolderId;
								(record as any).favoriteTabIds = [];
								csStore.put(record);
							}
						}
					};
				}
			}
		};

		request.onsuccess = () => {
			const idb = request.result;
			resolve({
				users: createIndexedDBTable(idb, 'users'),
				creatorPages: createIndexedDBTable(idb, 'creatorPages'),
				profiles: createIndexedDBTable(idb, 'profiles'),
				fonts: createIndexedDBTable(idb, 'fonts'),
				categories: createIndexedDBTable(idb, 'categories'),
				consumerStates: createIndexedDBTable(idb, 'consumerStates'),
				posts: createIndexedDBTable(idb, 'posts'),
				favoriteTabs: createIndexedDBTable(idb, 'favoriteTabs')
			});
		};

		request.onerror = () => reject(request.error);
	});
}

function createIndexedDBTable(db: IDBDatabase, storeName: string): TableOps {
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
