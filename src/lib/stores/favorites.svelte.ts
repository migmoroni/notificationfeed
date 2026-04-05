/**
 * Favorites Store — reactive state for favorited nodes with embedded tab system.
 *
 * Derives from consumer.activateNodes where favorite === true,
 * then resolves each referenced TreeNode from trees in persistence.
 * Tabs are embedded in the UserConsumer record.
 *
 * Pattern: module-level $state + exported read-only accessor + actions.
 */

import type { TreeNode } from '$lib/domain/content-tree/content-tree.js';
import { parseTreeId } from '$lib/domain/content-tree/content-tree.js';
import type { NodeActivation, FavoriteTab } from '$lib/domain/user/user-consumer.js';
import { SYSTEM_FAVORITES_TAB_ID } from '$lib/domain/user/user-consumer.js';
import { createContentTreeStore } from '$lib/persistence/content-tree.store.js';
import { consumer } from './consumer.svelte.js';

// ── Types ──────────────────────────────────────────────────────────────

export interface FavoriteItem {
activation: NodeActivation;
node: TreeNode | null;
tabIds: string[];
}

export { SYSTEM_FAVORITES_TAB_ID as ALL_FAVORITES_ID };

// ── Internal reactive state ────────────────────────────────────────────

interface FavoritesStoreState {
items: FavoriteItem[];
activeTabId: string;
selectedItemIds: Set<string>;
loading: boolean;
}

let state = $state<FavoritesStoreState>({
items: [],
activeTabId: SYSTEM_FAVORITES_TAB_ID,
selectedItemIds: new Set(),
loading: false
});

const treeRepo = createContentTreeStore();

// ── Exported accessor ──────────────────────────────────────────────────

export const favorites = {
get tabs(): FavoriteTab[] { return consumer.favoriteTabs; },
get items() { return state.items; },
get activeTabId() { return state.activeTabId; },
get selectedItemIds() { return state.selectedItemIds; },
get loading() { return state.loading; },
get count() { return state.items.length; },
get isSelecting() { return state.selectedItemIds.size > 0; },
get selectedCount() { return state.selectedItemIds.size; },

get customTabs(): FavoriteTab[] {
return consumer.favoriteTabs.filter((t) => !t.isSystem);
},

get filteredItems(): FavoriteItem[] {
if (state.activeTabId === SYSTEM_FAVORITES_TAB_ID) return state.items;
return state.items.filter((i) => i.tabIds.includes(state.activeTabId));
},

get itemsByTab(): Map<string, FavoriteItem[]> {
const map = new Map<string, FavoriteItem[]>();
map.set(SYSTEM_FAVORITES_TAB_ID, [...state.items]);
for (const tab of consumer.favoriteTabs) {
if (tab.isSystem) continue;
map.set(tab.id, state.items.filter((i) => i.tabIds.includes(tab.id)));
}
return map;
},

// ── Actions ──────────────────────────────────────────────────────

async loadFavorites(): Promise<void> {
state.loading = true;

try {
const favActivations = consumer.activateNodes.filter((n) => n.favorite);

// Group by treeId to batch-load trees
const treeIds = new Set<string>();
for (const activation of favActivations) {
treeIds.add(parseTreeId(activation.nodeId));
}

const trees = treeIds.size > 0
? await treeRepo.getByIds([...treeIds])
: [];

const treeMap = new Map(trees.map((t) => [t.metadata.id, t]));

const items: FavoriteItem[] = favActivations.map((activation) => {
const treeId = parseTreeId(activation.nodeId);
const tree = treeMap.get(treeId);
const node = tree?.nodes[activation.nodeId] ?? null;
return {
activation,
node,
tabIds: activation.favoriteTabIds ?? []
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
const idSet = new Set(nodeIds);
state.items = state.items.filter((i) => !idSet.has(i.activation.nodeId));
state.selectedItemIds = new Set();
},

async removeFavorite(nodeId: string): Promise<void> {
await consumer.setFavorite(nodeId, false);
state.items = state.items.filter((i) => i.activation.nodeId !== nodeId);
state.selectedItemIds = new Set(
[...state.selectedItemIds].filter((id) => id !== nodeId)
);
},

async createTab(title: string, emoji: string): Promise<FavoriteTab> {
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
state.activeTabId = SYSTEM_FAVORITES_TAB_ID;
}
},

async addItemsToTabs(nodeIds: string[], tabIds: string[]): Promise<void> {
for (const nodeId of nodeIds) {
const item = state.items.find((i) => i.activation.nodeId === nodeId);
if (!item) continue;
const merged = [...new Set([...item.tabIds, ...tabIds])];
item.tabIds = merged;
await consumer.updateFavoriteTabIds(nodeId, merged);
}
state.items = [...state.items];
state.selectedItemIds = new Set();
},

async removeItemsFromTab(nodeIds: string[], tabId: string): Promise<void> {
for (const nodeId of nodeIds) {
const item = state.items.find((i) => i.activation.nodeId === nodeId);
if (!item) continue;
const filtered = item.tabIds.filter((id) => id !== tabId);
item.tabIds = filtered;
await consumer.updateFavoriteTabIds(nodeId, filtered);
}
state.items = [...state.items];
state.selectedItemIds = new Set();
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
favorites.filteredItems.map((i) => i.activation.nodeId)
);
},

clearSelection(): void {
state.selectedItemIds = new Set();
}
};
