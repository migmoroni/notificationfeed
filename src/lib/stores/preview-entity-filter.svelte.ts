/**
 * Preview Entity Filter — EntityFilterStore instance for the Preview page.
 *
 * Data source: trees/nodes owned by the active creator user.
 * Uses the entity filter factory with a creator-specific data source.
 */

import type { ContentTree } from '$lib/domain/content-tree/content-tree.js';
import type { ContentNode } from '$lib/domain/content-node/content-node.js';
import { getNodeIds } from '$lib/domain/content-tree/content-tree.js';
import { createContentNodeStore } from '$lib/persistence/content-node.store.js';
import { createContentTreeStore } from '$lib/persistence/content-tree.store.js';
import { createEntityFilter, type EntityFilterDataSource } from './entity-filter.svelte.js';
import { activeUser } from './active-user.svelte.js';

const nodeRepo = createContentNodeStore();
const treeRepo = createContentTreeStore();

let loadedTrees = $state<ContentTree[]>([]);
let loadedNodes = $state<ContentNode[]>([]);

const source: EntityFilterDataSource = {
	async load() {
		const userId = activeUser.current?.id;
		if (!userId) {
			loadedTrees = [];
			loadedNodes = [];
			return { trees: [], nodes: [] };
		}

		const trees = await treeRepo.getByAuthor(userId);
		const allNodeIds = new Set<string>();
		for (const tree of trees) {
			for (const id of getNodeIds(tree)) allNodeIds.add(id);
		}
		const nodes = allNodeIds.size > 0
			? await nodeRepo.getByIds([...allNodeIds])
			: [];

		loadedTrees = trees;
		loadedNodes = nodes;
		return { trees, nodes };
	},

	getTrees() { return loadedTrees; },
	getNodes() { return loadedNodes; }
};

export const previewEntityFilter = Object.assign(createEntityFilter(source), {
	/** Access loaded trees (available after loadNodes). */
	getTrees() { return loadedTrees; },
	/** Access loaded nodes (available after loadNodes). */
	getNodes() { return loadedNodes; }
});
