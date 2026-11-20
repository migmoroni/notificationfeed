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

/**
 * Minimal CRUD/index contract every store must implement.
 *
 * The shape is deliberately small so the SQLite backend can map each
 * verb 1:1 onto a parameterized SQL statement, and the IndexedDB
 * backend can map each verb 1:1 onto a single transaction.
 */
export interface StoreOps {
	/** Read every record in the store. Use sparingly on large stores. */
	getAll<T>(): Promise<T[]>;
	/** Read a single record by primary key. Returns `null` when missing. */
	getById<T>(id: string): Promise<T | null>;
	/**
	 * Read all records whose `index` equals `value`. Indexes are
	 * declared in `schema.ts` and must match the backend's expectations.
	 */
	query<T>(index: string, value: unknown): Promise<T[]>;
	/** Upsert a record. The store's keyPath determines identity. */
	put<T>(item: T): Promise<void>;
	/** Hard-delete by primary key. No-op if the key does not exist. */
	delete(id: string): Promise<void>;
}

/**
 * Aggregate handle exposing every store the app needs.
 *
 * Concrete backends construct one `StoreOps` per field; callers obtain
 * the aggregate via `getStorageBackend()` and then operate on the
 * relevant store (e.g. `db.posts.put(...)`).
 */
export interface StorageBackend {
	/** Published content trees (read-only catalog of articles/books). */
	contentTrees: StoreOps;
	/** Media blobs/metadata referenced by published content trees. */
	contentMedias: StoreOps;
	/** Working-copy trees authored in the in-app editor. */
	editorTrees: StoreOps;
	/** Media uploaded inside editor trees (decoupled from content medias). */
	editorMedias: StoreOps;
	/** Snapshots that promote an editor tree into a published content tree. */
	treePublications: StoreOps;
	/** Local user accounts (per-device; multi-user without sync). */
	users: StoreOps;
	/** Per-user post boxes (Plano B v12). Composite key via `_pk`. */
	posts: StoreOps;
	/** Per-source ingestion metadata (etag, lastModified, backoff, ...). */
	fetcherStates: StoreOps;
	/** User-defined feed categories / folders. */
	categories: StoreOps;
	/** Activity / read-history aggregates used by the dashboard. */
	activityData: StoreOps;
	/** Per-user notification metadata (per-step lastFiredAt, lastClearedAt, …). */
	notificationMeta: StoreOps;
	/** In-app notification inbox. Composite key via `_pk = ${userId}|${notifId}`. */
	notificationInbox: StoreOps;
	/** Pipeline event bus (durable queue from post-manager to consumer). */
	pipelineEvents: StoreOps;
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
	'fetcherStates',
	'categories',
	'activityData',
	'notificationMeta',
	'notificationInbox',
	'pipelineEvents'
] as const satisfies readonly (keyof StorageBackend)[];
export type StoreName = (typeof STORE_NAMES)[number];
