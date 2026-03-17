/**
 * ContentNode store — persistence for content nodes using IndexedDB.
 */

import type {
	ContentNode,
	ContentNodeRepository,
	NodeRole
} from '$lib/domain/content-node/content-node.js';
import { getDatabase } from './db.js';

export function createContentNodeStore(): ContentNodeRepository {
	return {
		async getAll(): Promise<ContentNode[]> {
			const db = await getDatabase();
			return db.contentNodes.getAll<ContentNode>();
		},

		async getById(id: string): Promise<ContentNode | null> {
			const db = await getDatabase();
			return db.contentNodes.getById<ContentNode>(id);
		},

		async getByRole(role: NodeRole): Promise<ContentNode[]> {
			const db = await getDatabase();
			return db.contentNodes.query<ContentNode>('role', role);
		},

		async getByIds(ids: string[]): Promise<ContentNode[]> {
			const db = await getDatabase();
			const results: ContentNode[] = [];
			for (const id of ids) {
				const node = await db.contentNodes.getById<ContentNode>(id);
				if (node) results.push(node);
			}
			return results;
		},

		async getByAuthor(authorId: string): Promise<ContentNode[]> {
			const db = await getDatabase();
			return db.contentNodes.query<ContentNode>('author', authorId);
		},

		async put(node: ContentNode): Promise<void> {
			const db = await getDatabase();
			await db.contentNodes.put(node);
		},

		async delete(id: string): Promise<void> {
			const db = await getDatabase();
			await db.contentNodes.delete(id);
		}
	};
}
