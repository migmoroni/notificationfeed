/**
 * Browse Entity Filter — instance of EntityFilterStore for the Browse page.
 *
 * Data source: all trees from IndexedDB (not limited to subscriptions).
 */

import type { ContentTree } from '$lib/domain/content-tree/content-tree.js';
import { createContentTreeStore } from '$lib/persistence/content-tree.store.js';
import { createEntityFilter } from './entity-filter.svelte.js';

const treeRepo = createContentTreeStore();

let loadedTrees = $state<ContentTree[]>([]);

export const browseEntityFilter = createEntityFilter({
async load() {
const trees = await treeRepo.getAll();
loadedTrees = trees;
return { trees };
},
getTrees() { return loadedTrees; }
}, { singlePageSelect: true });
