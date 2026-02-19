/**
 * Favorites Store — reactive state for favorited entities with tab system.
 *
 * Derives from `consumer.states` filtering on `favorite === true`,
 * then resolves each referenced entity (CreatorPage / Profile / Font)
 * from the persistence layer. Supports many-to-many tab associations.
 *
 * The system tab "all_favorites" always shows every favorited item.
 * Custom tabs are user-created (emoji + title) and items can belong
 * to multiple tabs simultaneously.
 *
 * Pattern: module-level $state + exported read-only accessor + actions.
 */

import type { ConsumerState, ConsumerEntityType } from '$lib/domain/shared/consumer-state.js';
import type { CreatorPage } from '$lib/domain/creator-page/creator-page.js';
import type { Profile } from '$lib/domain/profile/profile.js';
import type { Font } from '$lib/domain/font/font.js';
import type { FavoriteTab } from '$lib/domain/favorite-tab/favorite-tab.js';
import { createCreatorPageStore } from '$lib/persistence/creator-page.store.js';
import { createProfileStore } from '$lib/persistence/profile.store.js';
import { createFontStore } from '$lib/persistence/font.store.js';
import { createFavoriteTabStore, ALL_FAVORITES_ID } from '$lib/persistence/favorite-tab.store.js';
import { consumer } from './consumer.svelte.js';

// ── Types ──────────────────────────────────────────────────────────────

export interface FavoriteItem {
	state: ConsumerState;
	entity: CreatorPage | Profile | Font | null;
	entityType: ConsumerEntityType;
	tabIds: string[]; // custom tab IDs this item belongs to
}

// Re-export for convenience
export { ALL_FAVORITES_ID };

// ── Internal reactive state ────────────────────────────────────────────

interface FavoritesStoreState {
	tabs: FavoriteTab[];
	items: FavoriteItem[];
	activeTabId: string; // ALL_FAVORITES_ID = show all
	selectedItemIds: Set<string>; // for batch selection
	loading: boolean;
}

let state = $state<FavoritesStoreState>({
	tabs: [],
	items: [],
	activeTabId: ALL_FAVORITES_ID,
	selectedItemIds: new Set(),
	loading: false
});

const pageRepo = createCreatorPageStore();
const profileRepo = createProfileStore();
const fontRepo = createFontStore();
const tabRepo = createFavoriteTabStore();

// ── Helpers ────────────────────────────────────────────────────────────

async function resolveEntity(cs: ConsumerState): Promise<CreatorPage | Profile | Font | null> {
	switch (cs.entityType) {
		case 'creator_page':
			return pageRepo.getById(cs.entityId);
		case 'profile':
			return profileRepo.getById(cs.entityId);
		case 'font':
			return fontRepo.getById(cs.entityId);
		default:
			return null;
	}
}

// ── Exported accessor ──────────────────────────────────────────────────

export const favorites = {
	get tabs() { return state.tabs; },
	get items() { return state.items; },
	get activeTabId() { return state.activeTabId; },
	get selectedItemIds() { return state.selectedItemIds; },
	get loading() { return state.loading; },
	get count() { return state.items.length; },
	get isSelecting() { return state.selectedItemIds.size > 0; },
	get selectedCount() { return state.selectedItemIds.size; },

	/** Custom tabs only (excludes system tab) */
	get customTabs(): FavoriteTab[] {
		return state.tabs.filter((t) => !t.isSystem);
	},

	/** Items filtered by the active tab */
	get filteredItems(): FavoriteItem[] {
		if (state.activeTabId === ALL_FAVORITES_ID) return state.items;
		return state.items.filter((i) => i.tabIds.includes(state.activeTabId));
	},

	/** Items grouped by tab ID (includes all_favorites) */
	get itemsByTab(): Map<string, FavoriteItem[]> {
		const map = new Map<string, FavoriteItem[]>();
		// all_favorites always gets all items
		map.set(ALL_FAVORITES_ID, [...state.items]);
		for (const tab of state.tabs) {
			if (tab.isSystem) continue;
			map.set(tab.id, state.items.filter((i) => i.tabIds.includes(tab.id)));
		}
		return map;
	},

	// ── Actions ──────────────────────────────────────────────────────

	async loadTabs(): Promise<void> {
		state.tabs = await tabRepo.getAll();
	},

	async loadFavorites(): Promise<void> {
		state.loading = true;

		try {
			await favorites.loadTabs();

			const favStates = consumer.states.filter((s) => s.favorite === true);

			const items: FavoriteItem[] = await Promise.all(
				favStates.map(async (s) => {
					const entity = await resolveEntity(s);
					return {
						state: s,
						entity,
						entityType: s.entityType,
						tabIds: s.favoriteTabIds ?? []
					};
				})
			);

			state.items = items;
		} finally {
			state.loading = false;
		}
	},

	/** Remove favorite flag from multiple entities (batch) */
	async removeFavorites(entityIds: string[]): Promise<void> {
		for (const entityId of entityIds) {
			const item = state.items.find((i) => i.state.entityId === entityId);
			if (item) {
				await consumer.setFavorite(entityId, item.entityType, false);
			}
		}
		// Optimistic removal
		const idSet = new Set(entityIds);
		state.items = state.items.filter((i) => !idSet.has(i.state.entityId));
		state.selectedItemIds = new Set();
	},

	/** Remove a single favorite */
	async removeFavorite(entityId: string, entityType: ConsumerEntityType): Promise<void> {
		await consumer.setFavorite(entityId, entityType, false);
		state.items = state.items.filter((i) => i.state.entityId !== entityId);
		state.selectedItemIds = new Set(
			[...state.selectedItemIds].filter((id) => id !== entityId)
		);
	},

	async createTab(title: string, emoji: string): Promise<FavoriteTab> {
		const maxPos = state.tabs.reduce((max, t) => Math.max(max, t.position), 0);
		const tab = await tabRepo.create({
			title,
			emoji,
			position: maxPos + 1,
			isSystem: false
		});
		state.tabs = [...state.tabs, tab];
		return tab;
	},

	async updateTab(id: string, data: { title?: string; emoji?: string }): Promise<void> {
		const updated = await tabRepo.update(id, data);
		state.tabs = state.tabs.map((t) => (t.id === id ? updated : t));
	},

	async deleteTab(id: string): Promise<void> {
		await tabRepo.delete(id);
		state.tabs = state.tabs.filter((t) => t.id !== id);

		// Remove this tab ID from all items' tabIds
		let changed = false;
		for (const item of state.items) {
			const idx = item.tabIds.indexOf(id);
			if (idx >= 0) {
				item.tabIds = item.tabIds.filter((tid) => tid !== id);
				// Persist the change on the consumer state
				await consumer.updateFavoriteTabIds(item.state.entityId, item.entityType, item.tabIds);
				changed = true;
			}
		}
		if (changed) state.items = [...state.items];

		// Reset active tab if deleted
		if (state.activeTabId === id) {
			state.activeTabId = ALL_FAVORITES_ID;
		}
	},

	/** Add items to one or more tabs (batch association) */
	async addItemsToTabs(entityIds: string[], tabIds: string[]): Promise<void> {
		for (const entityId of entityIds) {
			const item = state.items.find((i) => i.state.entityId === entityId);
			if (!item) continue;

			const merged = [...new Set([...item.tabIds, ...tabIds])];
			item.tabIds = merged;
			await consumer.updateFavoriteTabIds(entityId, item.entityType, merged);
		}
		state.items = [...state.items]; // trigger reactivity
	},

	/** Remove items from a specific tab (batch) */
	async removeItemsFromTab(entityIds: string[], tabId: string): Promise<void> {
		for (const entityId of entityIds) {
			const item = state.items.find((i) => i.state.entityId === entityId);
			if (!item) continue;

			const filtered = item.tabIds.filter((tid) => tid !== tabId);
			item.tabIds = filtered;
			await consumer.updateFavoriteTabIds(entityId, item.entityType, filtered);
		}
		state.items = [...state.items];
	},

	/** Reorder a tab to a new position (for future drag-and-drop) */
	async reorderTab(tabId: string, newPosition: number): Promise<void> {
		const tab = state.tabs.find((t) => t.id === tabId);
		if (!tab || tab.isSystem) return;

		const updated = await tabRepo.update(tabId, { position: newPosition });
		state.tabs = state.tabs
			.map((t) => (t.id === tabId ? updated : t))
			.sort((a, b) => a.position - b.position);
	},

	// ── Selection ────────────────────────────────────────────────────

	toggleSelectItem(entityId: string): void {
		const next = new Set(state.selectedItemIds);
		if (next.has(entityId)) {
			next.delete(entityId);
		} else {
			next.add(entityId);
		}
		state.selectedItemIds = next;
	},

	selectAll(): void {
		state.selectedItemIds = new Set(favorites.filteredItems.map((i) => i.state.entityId));
	},

	clearSelection(): void {
		state.selectedItemIds = new Set();
	},

	setActiveTab(tabId: string): void {
		state.activeTabId = tabId;
		state.selectedItemIds = new Set(); // clear selection on tab change
	}
};
