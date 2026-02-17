/**
 * Favorites Store — reactive state for favorited entities.
 *
 * Derives from `consumer.states` filtering on `favorite === true`,
 * then resolves each referenced entity (CreatorPage / Profile / Font)
 * from the persistence layer.
 *
 * Pattern: module-level $state + exported read-only accessor + actions.
 */

import type { ConsumerState, ConsumerEntityType } from '$lib/domain/shared/consumer-state.js';
import type { CreatorPage } from '$lib/domain/creator-page/creator-page.js';
import type { Profile } from '$lib/domain/profile/profile.js';
import type { Font } from '$lib/domain/font/font.js';
import { createCreatorPageStore } from '$lib/persistence/creator-page.store.js';
import { createProfileStore } from '$lib/persistence/profile.store.js';
import { createFontStore } from '$lib/persistence/font.store.js';
import { consumer } from './consumer.svelte.js';

// ── Types ──────────────────────────────────────────────────────────────

export interface FavoriteItem {
	state: ConsumerState;
	entity: CreatorPage | Profile | Font | null;
	entityType: ConsumerEntityType;
}

// ── Internal reactive state ────────────────────────────────────────────

interface FavoritesStoreState {
	items: FavoriteItem[];
	loading: boolean;
}

let state = $state<FavoritesStoreState>({
	items: [],
	loading: false
});

const pageRepo = createCreatorPageStore();
const profileRepo = createProfileStore();
const fontRepo = createFontStore();

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
	get items() { return state.items; },
	get loading() { return state.loading; },
	get count() { return state.items.length; },

	// ── Actions ──────────────────────────────────────────────────────

	async loadFavorites(): Promise<void> {
		state.loading = true;

		try {
			const favStates = consumer.states.filter((s) => s.favorite === true);

			const items: FavoriteItem[] = await Promise.all(
				favStates.map(async (s) => {
					const entity = await resolveEntity(s);
					return { state: s, entity, entityType: s.entityType };
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
	}
};
