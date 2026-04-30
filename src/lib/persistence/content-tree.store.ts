/**
 * ContentTree store — persistence for content trees using IndexedDB.
 *
 * Also provides composite-nodeId helpers (treeId:localUuid) that resolve
 * a node by first fetching its parent tree.
 */

import type {
	ContentTree,
	ContentTreeRepository,
	TreeNode
} from '$lib/domain/content-tree/content-tree.js';
import { parseTreeId } from '$lib/domain/content-tree/content-tree.js';
import { getStorageBackend } from './db.js';

export function createContentTreeStore(): ContentTreeRepository {
	return {
		async getAll(): Promise<ContentTree[]> {
			const db = await getStorageBackend();
			return db.contentTrees.getAll<ContentTree>();
		},

		async getById(id: string): Promise<ContentTree | null> {
			const db = await getStorageBackend();
			return db.contentTrees.getById<ContentTree>(id);
		},

		async getByIds(ids: string[]): Promise<ContentTree[]> {
			const db = await getStorageBackend();
			const results: ContentTree[] = [];
			for (const id of ids) {
				const tree = await db.contentTrees.getById<ContentTree>(id);
				if (tree) results.push(tree);
			}
			return results;
		},

		async getByAuthor(authorId: string): Promise<ContentTree[]> {
			const db = await getStorageBackend();
			return db.contentTrees.query<ContentTree>('author', authorId);
		},

		async put(tree: ContentTree): Promise<void> {
			const db = await getStorageBackend();
			await db.contentTrees.put(tree);
		},

		async delete(id: string): Promise<void> {
			const db = await getStorageBackend();
			await db.contentTrees.delete(id);
		}
	};
}

// ── Composite nodeId helpers ──────────────────────────────────────────

/**
 * Fetch the ContentTree that owns a given composite nodeId.
 */
export async function getTreeByNodeId(compositeNodeId: string): Promise<ContentTree | null> {
	const treeId = parseTreeId(compositeNodeId);
	const store = createContentTreeStore();
	return store.getById(treeId);
}

/**
 * Resolve a composite nodeId to its TreeNode (or null).
 */
export async function getNodeByCompositeId(
	compositeNodeId: string
): Promise<TreeNode | null> {
	const tree = await getTreeByNodeId(compositeNodeId);
	if (!tree) return null;
	return tree.nodes[compositeNodeId] ?? null;
}
