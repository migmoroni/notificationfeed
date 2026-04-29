/**
 * Storage backend abstraction.
 *
 * The application's persistence layer is modeled as a fixed set of
 * keyed object stores ("tables"), each supporting a small set of
 * CRUD/index operations. This file defines the contracts; concrete
 * implementations live in sibling files (indexeddb.backend.ts,
 * sqlite.backend.ts).
 *
 * Targets:
 * - Web / PWA / Tauri AppImage → IndexedDBBackend
 * - Tauri deb/rpm/msi/dmg/android → SqliteBackend (Plan C)
 */

export interface StoreOps {
	getAll<T>(): Promise<T[]>;
	getById<T>(id: string): Promise<T | null>;
	query<T>(index: string, value: unknown): Promise<T[]>;
	put<T>(item: T): Promise<void>;
	delete(id: string): Promise<void>;
}

export interface StorageBackend {
	contentTrees: StoreOps;
	contentMedias: StoreOps;
	editorTrees: StoreOps;
	editorMedias: StoreOps;
	treePublications: StoreOps;
	users: StoreOps;
	posts: StoreOps;
	categories: StoreOps;
	activityData: StoreOps;
}

/** Names of all known stores. Drives schema-as-data in Plan B. */
export const STORE_NAMES = [
	'contentTrees',
	'contentMedias',
	'editorTrees',
	'editorMedias',
	'treePublications',
	'users',
	'posts',
	'categories',
	'activityData'
] as const satisfies readonly (keyof StorageBackend)[];
export type StoreName = (typeof STORE_NAMES)[number];
