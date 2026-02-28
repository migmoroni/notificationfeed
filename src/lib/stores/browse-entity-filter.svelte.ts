/**
 * Browse Entity Filter — instance of EntityFilterStore for the Browse page.
 *
 * Data source: all entities from IndexedDB (not limited to feed subscriptions).
 * Uses the same factory as Feed; only the data source differs.
 */

import { createCreatorPageStore } from '$lib/persistence/creator-page.store.js';
import { createProfileStore } from '$lib/persistence/profile.store.js';
import { createFontStore } from '$lib/persistence/font.store.js';
import { createEntityFilter } from './entity-filter.svelte.js';

const pageRepo = createCreatorPageStore();
const profileRepo = createProfileStore();
const fontRepo = createFontStore();

/** Loaded snapshots — reactive so the UI updates after loadPages(). */
let loadedProfiles = $state<import('$lib/domain/profile/profile.js').Profile[]>([]);
let loadedFonts = $state<import('$lib/domain/font/font.js').Font[]>([]);

export const browseEntityFilter = createEntityFilter({
	async load() {
		const [pages, profiles, fonts] = await Promise.all([
			pageRepo.getAll(),
			profileRepo.getAll(),
			fontRepo.getAll()
		]);
		loadedProfiles = profiles;
		loadedFonts = fonts;
		return { pages, profiles, fonts };
	},
	getProfiles() { return loadedProfiles; },
	getFonts() { return loadedFonts; }
});
