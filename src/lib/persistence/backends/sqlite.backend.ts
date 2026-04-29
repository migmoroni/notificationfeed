/**
 * SQLite implementation of StorageBackend — STUB.
 *
 * Planned for Plan C, when Tauri bundles deb/rpm/msi/dmg/android are
 * added. Real implementation will use `tauri-plugin-sql` (sqlite
 * feature) and translate StoreOps onto a normalized schema.
 *
 * The stub exists so that the type checker enforces both backends
 * conform to the StorageBackend interface, and so that any premature
 * activation fails fast with a clear message.
 */

import type { StorageBackend, StoreOps } from './storage-backend.js';

const NOT_IMPLEMENTED = 'SqliteBackend not implemented yet — see Plan C';

function notImplementedTable(): StoreOps {
	return {
		async getAll() {
			throw new Error(NOT_IMPLEMENTED);
		},
		async getById() {
			throw new Error(NOT_IMPLEMENTED);
		},
		async query() {
			throw new Error(NOT_IMPLEMENTED);
		},
		async put() {
			throw new Error(NOT_IMPLEMENTED);
		},
		async delete() {
			throw new Error(NOT_IMPLEMENTED);
		}
	};
}

export async function openSqliteBackend(): Promise<StorageBackend> {
	throw new Error(NOT_IMPLEMENTED);

	// Unreachable, kept to enforce the interface shape:
	// eslint-disable-next-line no-unreachable
	return {
		contentTrees: notImplementedTable(),
		contentMedias: notImplementedTable(),
		editorTrees: notImplementedTable(),
		editorMedias: notImplementedTable(),
		treePublications: notImplementedTable(),
		users: notImplementedTable(),
		posts: notImplementedTable(),
		categories: notImplementedTable(),
		activityData: notImplementedTable()
	};
}
