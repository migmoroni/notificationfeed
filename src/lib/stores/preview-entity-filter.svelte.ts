/**
 * Preview Entity Filter — EntityFilterStore instance for the Preview page.
 *
 * Data source: trees owned by the active creator user.
 */

import type { ContentTree } from '$lib/domain/content-tree/content-tree.js';
import { createContentTreeStore } from '$lib/persistence/content-tree.store.js';
import { createEntityFilter, type EntityFilterDataSource } from './entity-filter.svelte.js';
import { activeUser } from './active-user.svelte.js';

const treeRepo = createContentTreeStore();

let loadedTrees = $state<ContentTree[]>([]);

const source: EntityFilterDataSource = {
async load() {
const userId = activeUser.current?.id;
if (!userId) {
loadedTrees = [];
return { trees: [] };
}

const trees = await treeRepo.getByAuthor(userId);
loadedTrees = trees;
return { trees };
},

getTrees() { return loadedTrees; }
};

export const previewEntityFilter = Object.assign(createEntityFilter(source), {
/** Access loaded trees (available after loadNodes). */
getTrees() { return loadedTrees; }
});
