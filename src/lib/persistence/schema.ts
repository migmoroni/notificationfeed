/**
 * Backend-agnostic schema specification for Plano B (DB v12).
 *
 * Each entry is a declarative description of an object store / SQL table.
 * The IndexedDB backend translates this to `createObjectStore` + `createIndex`;
 * a future SQLite backend (Plano C) will translate the same data to
 * `CREATE TABLE` + `CREATE INDEX`.
 *
 * Design rules:
 *
 * - All keyPaths are strings (single field). Composite identity is encoded
 *   into a synthetic field (e.g. `_pk = ${userId}|${nodeId}|${postId}`),
 *   which we maintain in application code on every write. This keeps
 *   StoreOps simple (no IDBKeyRange / array keys leaking through).
 * - All indexes are single-field (string). Multi-criteria filtering
 *   (e.g. saved + by user) happens in memory in the store layer for now.
 *   When SQLite arrives, those filters become `WHERE` clauses without
 *   touching domain code.
 */

export interface IndexSpec {
	name: string;
	keyPath: string;
	unique?: boolean;
}

export interface StoreSpec {
	name: string;
	keyPath: string;
	indexes?: IndexSpec[];
}

export const STORE_SPECS: readonly StoreSpec[] = [
	{
		name: 'contentTrees',
		keyPath: 'metadata.id',
		indexes: [{ name: 'author', keyPath: 'metadata.author' }]
	},
	{
		name: 'contentMedias',
		keyPath: 'metadata.id',
		indexes: [{ name: 'author', keyPath: 'metadata.author' }]
	},
	{
		name: 'editorTrees',
		keyPath: 'metadata.id',
		indexes: [{ name: 'author', keyPath: 'metadata.author' }]
	},
	{
		name: 'editorMedias',
		keyPath: 'metadata.id',
		indexes: [{ name: 'author', keyPath: 'metadata.author' }]
	},
	{ name: 'treePublications', keyPath: 'treeId' },
	{
		name: 'users',
		keyPath: 'id',
		indexes: [{ name: 'role', keyPath: 'role' }]
	},
	{
		// Per-user post boxes (Plano B). One record = one post in one user's box.
		// `_pk` and `_userNode` are synthetic fields maintained by post.store.
		name: 'posts',
		keyPath: '_pk',
		indexes: [
			{ name: 'byUser', keyPath: 'userId' },
			{ name: 'byUserNode', keyPath: '_userNode' }
		]
	},
	{
		// Per-source ingestion state (Plano B). Shared across users.
		name: 'fetcherStates',
		keyPath: 'nodeId'
	},
	{
		name: 'categories',
		keyPath: 'id',
		indexes: [
			{ name: 'parentId', keyPath: 'parentId' },
			{ name: 'treeId', keyPath: 'treeId' }
		]
	},
	{ name: 'activityData', keyPath: 'userId' }
] as const;

export type SchemaStoreName = (typeof STORE_SPECS)[number]['name'];
