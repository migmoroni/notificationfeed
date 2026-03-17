/**
 * TreePublication store — persistence for tree publication snapshots using IndexedDB.
 */

import type { TreePublication, TreePublicationRepository } from '$lib/domain/tree-export/tree-publication.js';
import { getDatabase } from './db.js';

export function createTreePublicationStore(): TreePublicationRepository {
	return {
		async getByTreeId(treeId: string): Promise<TreePublication | null> {
			const db = await getDatabase();
			return db.treePublications.getById<TreePublication>(treeId);
		},

		async save(publication: TreePublication): Promise<void> {
			const db = await getDatabase();
			await db.treePublications.put(publication);
		},

		async delete(treeId: string): Promise<void> {
			const db = await getDatabase();
			await db.treePublications.delete(treeId);
		}
	};
}
