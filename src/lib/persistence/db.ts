/**
 * Database initialization.
 *
 * Abstracts over IndexedDB (web/PWA/TWA) and SQLite (Tauri desktop).
 * Provides a unified interface for the persistence layer.
 *
 * NOTE: No migration logic — the app hasn't launched yet.
 * If the schema changes during development, delete the local DB
 * (DevTools → Application → Delete database "notfeed") and reload.
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
		const request = indexedDB.open('notfeed', 1);

		request.onupgradeneeded = () => {
			const idb = request.result;

			const userStore = idb.createObjectStore('users', { keyPath: 'id' });
			userStore.createIndex('role', 'role', { unique: false });

			const cpStore = idb.createObjectStore('creatorPages', { keyPath: 'id' });
			cpStore.createIndex('ownerId', 'ownerId', { unique: false });

			const profileStore = idb.createObjectStore('profiles', { keyPath: 'id' });
			profileStore.createIndex('ownerId', 'ownerId', { unique: false });
			profileStore.createIndex('creatorPageId', 'creatorPageId', { unique: false });

			const fontStore = idb.createObjectStore('fonts', { keyPath: 'id' });
			fontStore.createIndex('profileId', 'profileId', { unique: false });

			const catStore = idb.createObjectStore('categories', { keyPath: 'id' });
			catStore.createIndex('parentId', 'parentId', { unique: false });
			catStore.createIndex('treeId', 'treeId', { unique: false });

			const csStore = idb.createObjectStore('consumerStates', { keyPath: 'entityId' });
			csStore.createIndex('entityType', 'entityType', { unique: false });

			const postStore = idb.createObjectStore('posts', { keyPath: 'id' });
			postStore.createIndex('fontId', 'fontId', { unique: false });
			postStore.createIndex('publishedAt', 'publishedAt', { unique: false });

			idb.createObjectStore('favoriteTabs', { keyPath: 'id' });
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
