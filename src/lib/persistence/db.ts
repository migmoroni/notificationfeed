/**
 * Database — persistence layer for the unified content model.
 *
 * Stores: contentTrees (with embedded nodes), contentMedias, treePublications,
 *         users, posts, categories
 *
 * Removed: contentNodes (nodes now live inside contentTrees)
 *
 * Since this is pre-release, migration is destructive: delete "notfeed-v2"
 * database in DevTools and reload.
 */

import { detectPlatform } from '$lib/platform/capabilities.js';

export interface Database {
contentTrees: TableOps;
contentMedias: TableOps;
editorTrees: TableOps;
editorMedias: TableOps;
treePublications: TableOps;
users: TableOps;
posts: TableOps;
categories: TableOps;
	activityData: TableOps;
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
const request = indexedDB.open('notfeed-v2', 11);

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

		request.onsuccess = () => {
			const idb = request.result;
			resolve({
				contentTrees: createIndexedDBTable(idb, 'contentTrees'),
				contentMedias: createIndexedDBTable(idb, 'contentMedias'),
				editorTrees: createIndexedDBTable(idb, 'editorTrees'),
				editorMedias: createIndexedDBTable(idb, 'editorMedias'),
				treePublications: createIndexedDBTable(idb, 'treePublications'),
				users: createIndexedDBTable(idb, 'users'),
				posts: createIndexedDBTable(idb, 'posts'),
				categories: createIndexedDBTable(idb, 'categories'),
				activityData: createIndexedDBTable(idb, 'activityData')
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
