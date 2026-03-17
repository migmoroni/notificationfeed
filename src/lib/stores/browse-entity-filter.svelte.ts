/**
 * Browse Entity Filter — instance of EntityFilterStore for the Browse page.
 *
 * Data source: all trees and nodes from IndexedDB (not limited to subscriptions).
 */

import type { ContentTree } from '$lib/domain/content-tree/content-tree.js';
import type { ContentNode } from '$lib/domain/content-node/content-node.js';
import { createContentNodeStore } from '$lib/persistence/content-node.store.js';
import { createContentTreeStore } from '$lib/persistence/content-tree.store.js';
import { createEntityFilter } from './entity-filter.svelte.js';

const nodeRepo = createContentNodeStore();
const treeRepo = createContentTreeStore();

let loadedTrees = $state<ContentTree[]>([]);
let loadedNodes = $state<ContentNode[]>([]);

export const browseEntityFilter = createEntityFilter({
	async load() {
		const [trees, nodes] = await Promise.all([
			treeRepo.getAll(),
			nodeRepo.getAll()
		]);
		loadedTrees = trees;
		loadedNodes = nodes;
		return { trees, nodes };
	},
	getTrees() { return loadedTrees; },
	getNodes() { return loadedNodes; }
});
