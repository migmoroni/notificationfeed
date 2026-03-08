/**
 * Preview Entity Filter — instance of EntityFilterStore for the Preview page.
 *
 * Data source: only entities owned by the active creator user.
 * Loads pages via getByOwnerId to exclude consumer-owned entities.
 */

import { createCreatorPageStore } from '$lib/persistence/creator-page.store.js';
import { createProfileStore } from '$lib/persistence/profile.store.js';
import { createFontStore } from '$lib/persistence/font.store.js';
import { createSectionStore } from '$lib/persistence/section.store.js';
import { createEntityFilter } from './entity-filter.svelte.js';
import { activeUser } from './active-user.svelte.js';

const pageRepo = createCreatorPageStore();
const profileRepo = createProfileStore();
const fontRepo = createFontStore();
const sectionRepo = createSectionStore();

let loadedProfiles = $state<import('$lib/domain/profile/profile.js').Profile[]>([]);
let loadedFonts = $state<import('$lib/domain/font/font.js').Font[]>([]);

export const previewEntityFilter = createEntityFilter({
	async load() {
		const userId = activeUser.current?.id;
		if (!userId) return { pages: [], profiles: [], fonts: [], sectionContainers: [] };

		const [pages, profiles] = await Promise.all([
			pageRepo.getByOwnerId(userId),
			profileRepo.getByOwnerId(userId, 'creator')
		]);

		const profileIds = new Set(profiles.map((p) => p.id));
		const allFonts = await fontRepo.getAll();
		const fonts = allFonts.filter((f) => profileIds.has(f.profileId));

		const sectionContainers = await sectionRepo.getAll();

		loadedProfiles = profiles;
		loadedFonts = fonts;
		return { pages, profiles, fonts, sectionContainers };
	},
	getProfiles() { return loadedProfiles; },
	getFonts() { return loadedFonts; }
});
