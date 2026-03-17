/**
 * ContentTree store — persistence for content trees using IndexedDB.
 */

import type { ContentTree, ContentTreeRepository } from '$lib/domain/content-tree/content-tree.js';
import { getDatabase } from './db.js';

export function createContentTreeStore(): ContentTreeRepository {
	return {
		async getAll(): Promise<ContentTree[]> {
			const db = await getDatabase();
			return db.contentTrees.getAll<ContentTree>();
		},

		async getById(id: string): Promise<ContentTree | null> {
			const db = await getDatabase();
			return db.contentTrees.getById<ContentTree>(id);
		},

		async getByIds(ids: string[]): Promise<ContentTree[]> {
			const db = await getDatabase();
			const results: ContentTree[] = [];
			for (const id of ids) {
				const tree = await db.contentTrees.getById<ContentTree>(id);
				if (tree) results.push(tree);
			}
			return results;
		},

		async getByAuthor(authorId: string): Promise<ContentTree[]> {
			const db = await getDatabase();
			return db.contentTrees.query<ContentTree>('author', authorId);
		},

		async put(tree: ContentTree): Promise<void> {
			const db = await getDatabase();
			await db.contentTrees.put(tree);
		},

		async delete(id: string): Promise<void> {
			const db = await getDatabase();
			await db.contentTrees.delete(id);
		}
	};
}
