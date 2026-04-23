/**
 * Library Store — reactive state for activated nodes with embedded tab system.
 *
 * Derives from consumer.activateNodes (all activated nodes),
 * then resolves each referenced TreeNode from trees in persistence.
 * Custom tabs are embedded in the UserConsumer record.
 * System tabs (All Library, Only Favorites) are app constants.
 *
 * System tabs:
 *   - "All Library" (SYSTEM_ALL_LIBRARY_TAB_ID) — shows all activated nodes
 *   - "Only Favorites" (SYSTEM_ONLY_FAVORITES_TAB_ID) — shows only favorite nodes
 *
 * Pattern: module-level $state + exported read-only accessor + actions.
 */

import type { TreeNode } from '$lib/domain/content-tree/content-tree.js';
import { parseTreeId } from '$lib/domain/content-tree/content-tree.js';
import type { NodeActivation, LibraryTab } from '$lib/domain/user/user-consumer.js';
import { SYSTEM_ALL_LIBRARY_TAB_ID, SYSTEM_ONLY_FAVORITES_TAB_ID, SYSTEM_LIBRARY_TABS } from '$lib/domain/user/user-consumer.js';
import { createContentTreeStore } from '$lib/persistence/content-tree.store.js';
import { consumer } from './consumer.svelte.js';

// ── Types ──────────────────────────────────────────────────────────────

export interface LibraryItem {
activation: NodeActivation;
node: TreeNode | null;
tabIds: string[];
}

export { SYSTEM_ALL_LIBRARY_TAB_ID as ALL_LIBRARY_ID };
export { SYSTEM_ONLY_FAVORITES_TAB_ID as ONLY_FAVORITES_ID };

// ── Internal reactive state ────────────────────────────────────────────

interface LibraryStoreState {
items: LibraryItem[];
activeTabId: string;
selectedItemIds: Set<string>;
loading: boolean;
}

let state = $state<LibraryStoreState>({
items: [],
activeTabId: SYSTEM_ALL_LIBRARY_TAB_ID,
selectedItemIds: new Set(),
loading: false
});

const treeRepo = createContentTreeStore();

// ── Exported accessor ──────────────────────────────────────────────────

export const library = {
/** All tabs: system constants + user custom tabs */
get tabs(): (LibraryTab & { isSystem?: true })[] {
	return [...SYSTEM_LIBRARY_TABS, ...consumer.libraryTabs];
},
get items() { return state.items; },
get activeTabId() { return state.activeTabId; },
get selectedItemIds() { return state.selectedItemIds; },
get loading() { return state.loading; },
get count() { return state.items.length; },
get isSelecting() { return state.selectedItemIds.size > 0; },
get selectedCount() { return state.selectedItemIds.size; },

/** User-created custom tabs (excludes system tabs) */
get customTabs(): LibraryTab[] {
	return consumer.libraryTabs;
},

get filteredItems(): LibraryItem[] {
	if (state.activeTabId === SYSTEM_ALL_LIBRARY_TAB_ID) return state.items;
	if (state.activeTabId === SYSTEM_ONLY_FAVORITES_TAB_ID) {
		return state.items.filter((i) => i.activation.favorite);
	}
	return state.items.filter((i) => i.tabIds.includes(state.activeTabId));
},

get itemsByTab(): Map<string, LibraryItem[]> {
	const map = new Map<string, LibraryItem[]>();
	map.set(SYSTEM_ALL_LIBRARY_TAB_ID, [...state.items]);
	map.set(SYSTEM_ONLY_FAVORITES_TAB_ID, state.items.filter((i) => i.activation.favorite));
	for (const tab of consumer.libraryTabs) {
		map.set(tab.id, state.items.filter((i) => i.tabIds.includes(tab.id)));
	}
	return map;
},

// ── Actions ──────────────────────────────────────────────────────

async loadLibrary(): Promise<void> {
	state.loading = true;

	try {
		const allActivations = consumer.activateNodes;

		// Group by treeId to batch-load trees
		const treeIds = new Set<string>();
		for (const activation of allActivations) {
			treeIds.add(parseTreeId(activation.nodeId));
		}

		const trees = treeIds.size > 0
			? await treeRepo.getByIds([...treeIds])
			: [];

		const treeMap = new Map(trees.map((t) => [t.metadata.id, t]));

		const items: LibraryItem[] = allActivations.map((activation) => {
			const treeId = parseTreeId(activation.nodeId);
			const tree = treeMap.get(treeId);
			const node = tree?.nodes[activation.nodeId] ?? null;
			return {
				activation,
				node,
				tabIds: activation.libraryTabIds ?? []
			};
		});

		state.items = items;
	} finally {
		state.loading = false;
	}
},

async removeFavorites(nodeIds: string[]): Promise<void> {
	for (const nodeId of nodeIds) {
		await consumer.setFavorite(nodeId, false);
	}
	// Update local items to reflect unfavorited state
	for (const item of state.items) {
		if (nodeIds.includes(item.activation.nodeId)) {
			item.activation = { ...item.activation, favorite: false };
		}
	}
	state.items = [...state.items];
	state.selectedItemIds = new Set();
},

async removeFavorite(nodeId: string): Promise<void> {
	await consumer.setFavorite(nodeId, false);
	// Update local item to reflect unfavorited state
	const item = state.items.find((i) => i.activation.nodeId === nodeId);
	if (item) {
		item.activation = { ...item.activation, favorite: false };
	}
	state.items = [...state.items];
	state.selectedItemIds = new Set(
		[...state.selectedItemIds].filter((id) => id !== nodeId)
	);
},

async createTab(title: string, emoji: string): Promise<LibraryTab> {
	return consumer.createTab(title, emoji);
},

async updateTab(tabId: string, data: { title?: string; emoji?: string }): Promise<void> {
	await consumer.updateTab(tabId, data);
},

async deleteTab(tabId: string): Promise<void> {
	await consumer.deleteTab(tabId);

	// Update local items to remove references
	let changed = false;
	for (const item of state.items) {
		if (item.tabIds.includes(tabId)) {
			item.tabIds = item.tabIds.filter((id) => id !== tabId);
			changed = true;
		}
	}
	if (changed) state.items = [...state.items];

	if (state.activeTabId === tabId) {
		state.activeTabId = SYSTEM_ALL_LIBRARY_TAB_ID;
	}
},

async addItemsToTabs(nodeIds: string[], tabIds: string[]): Promise<void> {
	for (const nodeId of nodeIds) {
		const item = state.items.find((i) => i.activation.nodeId === nodeId);
		if (!item) continue;
		const merged = [...new Set([...item.tabIds, ...tabIds])];
		item.tabIds = merged;
		await consumer.updateLibraryTabIds(nodeId, merged);
	}
	state.items = [...state.items];
},

async removeItemsFromTab(nodeIds: string[], tabId: string): Promise<void> {
	for (const nodeId of nodeIds) {
		const item = state.items.find((i) => i.activation.nodeId === nodeId);
		if (!item) continue;
		const filtered = item.tabIds.filter((id) => id !== tabId);
		item.tabIds = filtered;
		await consumer.updateLibraryTabIds(nodeId, filtered);
	}
	state.items = [...state.items];
},

// ── Selection ────────────────────────────────────────────────────

setActiveTab(tabId: string): void {
	state.activeTabId = tabId;
	state.selectedItemIds = new Set();
},

toggleItemSelection(nodeId: string): void {
	const next = new Set(state.selectedItemIds);
	if (next.has(nodeId)) {
		next.delete(nodeId);
	} else {
		next.add(nodeId);
	}
	state.selectedItemIds = next;
},

selectAll(): void {
	state.selectedItemIds = new Set(
		library.filteredItems.map((i) => i.activation.nodeId)
	);
},

clearSelection(): void {
	state.selectedItemIds = new Set();
}
};
