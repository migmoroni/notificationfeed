/**
 * Editor Tree store — persistence for trees being created/edited by the creator.
 *
 * Separate from contentTrees (consumer/read) so editing drafts don't
 * interfere with the consumption pipeline.
 */

import type {
	ContentTree,
	ContentTreeRepository
} from '$lib/domain/content-tree/content-tree.js';
import { getDatabase } from './db.js';

export function createEditorTreeStore(): ContentTreeRepository {
	return {
		async getAll(): Promise<ContentTree[]> {
			const db = await getDatabase();
			return db.editorTrees.getAll<ContentTree>();
		},

		async getById(id: string): Promise<ContentTree | null> {
			const db = await getDatabase();
			return db.editorTrees.getById<ContentTree>(id);
		},

		async getByIds(ids: string[]): Promise<ContentTree[]> {
			const db = await getDatabase();
			const results: ContentTree[] = [];
			for (const id of ids) {
				const tree = await db.editorTrees.getById<ContentTree>(id);
				if (tree) results.push(tree);
			}
			return results;
		},

		async getByAuthor(authorId: string): Promise<ContentTree[]> {
			const db = await getDatabase();
			return db.editorTrees.query<ContentTree>('author', authorId);
		},

		async put(tree: ContentTree): Promise<void> {
			const db = await getDatabase();
			await db.editorTrees.put(tree);
		},

		async delete(id: string): Promise<void> {
			const db = await getDatabase();
			await db.editorTrees.delete(id);
		}
	};
}
