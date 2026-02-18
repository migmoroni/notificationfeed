/**
 * Favorites Store — reactive state for favorited entities with folder system.
 *
 * Derives from `consumer.states` filtering on `favorite === true`,
 * then resolves each referenced entity (CreatorPage / Profile / Font)
 * from the persistence layer. Supports folders (Inbox + custom).
 *
 * UI offers two interchangeable views: list/grid or lateral tabs (per folder).
 *
 * Pattern: module-level $state + exported read-only accessor + actions.
 */

import type { ConsumerState, ConsumerEntityType } from '$lib/domain/shared/consumer-state.js';
import type { CreatorPage } from '$lib/domain/creator-page/creator-page.js';
import type { Profile } from '$lib/domain/profile/profile.js';
import type { Font } from '$lib/domain/font/font.js';
import type { FavoriteFolder } from '$lib/domain/favorite-folder/favorite-folder.js';
import { createCreatorPageStore } from '$lib/persistence/creator-page.store.js';
import { createProfileStore } from '$lib/persistence/profile.store.js';
import { createFontStore } from '$lib/persistence/font.store.js';
import { createFavoriteFolderStore, INBOX_ID } from '$lib/persistence/favorite-folder.store.js';
import { consumer } from './consumer.svelte.js';

// ── Types ──────────────────────────────────────────────────────────────

export interface FavoriteItem {
	state: ConsumerState;
	entity: CreatorPage | Profile | Font | null;
	entityType: ConsumerEntityType;
	folderId: string; // resolved: null on ConsumerState → INBOX_ID
}

export type FavoritesViewMode = 'list' | 'tabs';

// ── Internal reactive state ────────────────────────────────────────────

interface FavoritesStoreState {
	folders: FavoriteFolder[];
	items: FavoriteItem[];
	activeFolderId: string | null; // null = show all
	viewMode: FavoritesViewMode;
	loading: boolean;
}

let state = $state<FavoritesStoreState>({
	folders: [],
	items: [],
	activeFolderId: null,
	viewMode: 'list',
	loading: false
});

const pageRepo = createCreatorPageStore();
const profileRepo = createProfileStore();
const fontRepo = createFontStore();
const folderRepo = createFavoriteFolderStore();

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
	get folders() { return state.folders; },
	get items() { return state.items; },
	get activeFolderId() { return state.activeFolderId; },
	get viewMode() { return state.viewMode; },
	get loading() { return state.loading; },
	get count() { return state.items.length; },

	/** Items filtered by the active folder (null = all) */
	get filteredItems(): FavoriteItem[] {
		if (!state.activeFolderId) return state.items;
		return state.items.filter((i) => i.folderId === state.activeFolderId);
	},

	/** Items grouped by folder ID */
	get itemsByFolder(): Map<string, FavoriteItem[]> {
		const map = new Map<string, FavoriteItem[]>();
		for (const item of state.items) {
			const arr = map.get(item.folderId) ?? [];
			arr.push(item);
			map.set(item.folderId, arr);
		}
		return map;
	},

	// ── Actions ──────────────────────────────────────────────────────

	async loadFolders(): Promise<void> {
		state.folders = await folderRepo.getAll();
	},

	async loadFavorites(): Promise<void> {
		state.loading = true;

		try {
			await favorites.loadFolders();

			const favStates = consumer.states.filter((s) => s.favorite === true);

			const items: FavoriteItem[] = await Promise.all(
				favStates.map(async (s) => {
					const entity = await resolveEntity(s);
					return {
						state: s,
						entity,
						entityType: s.entityType,
						folderId: s.favoriteFolderId ?? INBOX_ID
					};
				})
			);

			state.items = items;
		} finally {
			state.loading = false;
		}
	},

	async removeFavorite(entityId: string, entityType: ConsumerEntityType): Promise<void> {
		await consumer.setFavorite(entityId, entityType, false);

		// Optimistic removal from local list
		state.items = state.items.filter((item) => item.state.entityId !== entityId);
	},

	async createFolder(name: string): Promise<FavoriteFolder> {
		const maxOrder = state.folders.reduce((max, f) => Math.max(max, f.order), 0);
		const folder = await folderRepo.create({
			name,
			isInbox: false,
			order: maxOrder + 1
		});
		state.folders = [...state.folders, folder];
		return folder;
	},

	async renameFolder(id: string, name: string): Promise<void> {
		const updated = await folderRepo.update(id, { name });
		state.folders = state.folders.map((f) => (f.id === id ? updated : f));
	},

	async deleteFolder(id: string): Promise<void> {
		await folderRepo.delete(id);
		state.folders = state.folders.filter((f) => f.id !== id);

		// Move items from deleted folder to Inbox
		for (const item of state.items) {
			if (item.folderId === id) {
				await consumer.moveFavoriteToFolder(item.state.entityId, item.state.entityType, null);
				item.folderId = INBOX_ID;
			}
		}
		// Trigger reactivity
		state.items = [...state.items];

		// If active folder was deleted, reset
		if (state.activeFolderId === id) {
			state.activeFolderId = null;
		}
	},

	async moveToFolder(entityId: string, entityType: ConsumerEntityType, folderId: string | null): Promise<void> {
		await consumer.moveFavoriteToFolder(entityId, entityType, folderId);

		const resolvedFolderId = folderId ?? INBOX_ID;
		state.items = state.items.map((item) =>
			item.state.entityId === entityId
				? { ...item, folderId: resolvedFolderId }
				: item
		);
	},

	setActiveFolder(folderId: string | null): void {
		state.activeFolderId = folderId;
	},

	setViewMode(mode: FavoritesViewMode): void {
		state.viewMode = mode;
	}
};
