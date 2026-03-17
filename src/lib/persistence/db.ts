/**
 * Database — persistence layer for the refactored content model.
 *
 * New stores: contentNodes, contentTrees, contentMedias
 * Replaced: creatorPages, profiles, fonts, creatorProfiles, profileFonts,
 *           consumerStates, favoriteTabs, sections, pagePublications
 * Kept: users, feedMacros, categories
 * Changed: posts (fontId → nodeId)
 *
 * Since this is pre-release, migration is destructive: old data is cleared.
 * Delete the "notfeed" database in DevTools and reload to migrate.
 */

import { detectPlatform } from '$lib/platform/capabilities.js';

export interface Database {
	contentNodes: TableOps;
	contentTrees: TableOps;
	contentMedias: TableOps;
	treePublications: TableOps;
	users: TableOps;
	feedMacros: TableOps;
	posts: TableOps;
	categories: TableOps;
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
		throw new Error('SQLite backend not yet implemented');
	}

	db = await initIndexedDB();
	return db;
}

async function initIndexedDB(): Promise<Database> {
	return new Promise((resolve, reject) => {
		const request = indexedDB.open('notfeed-v2', 3);

		request.onupgradeneeded = (event) => {
			const idb = request.result;
			const oldVersion = (event as IDBVersionChangeEvent).oldVersion;

			if (oldVersion < 1) {
				// Content stores
				const nodeStore = idb.createObjectStore('contentNodes', { keyPath: 'metadata.id' });
				nodeStore.createIndex('role', 'role', { unique: false });
				nodeStore.createIndex('author', 'metadata.author', { unique: false });

				const treeStore = idb.createObjectStore('contentTrees', { keyPath: 'metadata.id' });
				treeStore.createIndex('author', 'metadata.author', { unique: false });

				const mediaStore = idb.createObjectStore('contentMedias', { keyPath: 'metadata.id' });
				mediaStore.createIndex('author', 'metadata.author', { unique: false });

				// Tree publications
				idb.createObjectStore('treePublications', { keyPath: 'treeId' });

				// User store (supports consumer + creator in same table)
				const userStore = idb.createObjectStore('users', { keyPath: 'id' });
				userStore.createIndex('role', 'role', { unique: false });

				// Feed macros
				idb.createObjectStore('feedMacros', { keyPath: 'id' });

				// Posts (grouped by nodeId)
				idb.createObjectStore('posts', { keyPath: 'nodeId' });

				// Categories (unchanged)
				const catStore = idb.createObjectStore('categories', { keyPath: 'id' });
				catStore.createIndex('parentId', 'parentId', { unique: false });
				catStore.createIndex('treeId', 'treeId', { unique: false });
			}

			if (oldVersion >= 1 && oldVersion < 2) {
				// Incremental upgrade: add author indexes + treePublications store
				const tx = (event.target as IDBOpenDBRequest).transaction!;

				const nodeStore = tx.objectStore('contentNodes');
				nodeStore.createIndex('author', 'metadata.author', { unique: false });

				const treeStore = tx.objectStore('contentTrees');
				treeStore.createIndex('author', 'metadata.author', { unique: false });

				const mediaStore = tx.objectStore('contentMedias');
				mediaStore.createIndex('author', 'metadata.author', { unique: false });

				idb.createObjectStore('treePublications', { keyPath: 'treeId' });
			}

			if (oldVersion < 3) {
				if (!idb.objectStoreNames.contains('favoriteTabs')) {
					idb.createObjectStore('favoriteTabs', { keyPath: 'id' });
				}
			}
		};

		request.onsuccess = () => {
			const idb = request.result;
			resolve({
				contentNodes: createIndexedDBTable(idb, 'contentNodes'),
				contentTrees: createIndexedDBTable(idb, 'contentTrees'),
				contentMedias: createIndexedDBTable(idb, 'contentMedias'),
				treePublications: createIndexedDBTable(idb, 'treePublications'),
				users: createIndexedDBTable(idb, 'users'),
				feedMacros: createIndexedDBTable(idb, 'feedMacros'),
				posts: createIndexedDBTable(idb, 'posts'),
				categories: createIndexedDBTable(idb, 'categories'),
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
