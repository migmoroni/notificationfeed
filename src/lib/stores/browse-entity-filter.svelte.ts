/**
 * Browse Entity Filter — instance of EntityFilterStore for the Browse page.
 *
 * Data source: all entities from IndexedDB (not limited to feed subscriptions).
 * Uses the same factory as Feed; only the data source differs.
 */

import { createCreatorPageStore } from '$lib/persistence/creator-page.store.js';
import { createProfileStore } from '$lib/persistence/profile.store.js';
import { createFontStore } from '$lib/persistence/font.store.js';
import { createSectionStore } from '$lib/persistence/section.store.js';
import { createCreatorProfileStore } from '$lib/persistence/creator-profile.store.js';
import { createProfileFontStore } from '$lib/persistence/profile-font.store.js';
import { createEntityFilter } from './entity-filter.svelte.js';
import type { CreatorProfile } from '$lib/domain/creator-profile/creator-profile.js';
import type { ProfileFont } from '$lib/domain/profile-font/profile-font.js';

const pageRepo = createCreatorPageStore();
const profileRepo = createProfileStore();
const fontRepo = createFontStore();
const sectionRepo = createSectionStore();
const creatorProfileRepo = createCreatorProfileStore();
const profileFontRepo = createProfileFontStore();

/** Loaded snapshots — reactive so the UI updates after loadPages(). */
let loadedProfiles = $state<import('$lib/domain/profile/profile.js').Profile[]>([]);
let loadedFonts = $state<import('$lib/domain/font/font.js').Font[]>([]);
let loadedCreatorProfiles = $state<CreatorProfile[]>([]);
let loadedProfileFonts = $state<ProfileFont[]>([]);

export const browseEntityFilter = createEntityFilter({
	async load() {
		const [pages, profiles, fonts, sectionContainers, creatorProfiles, profileFonts] = await Promise.all([
			pageRepo.getAll(),
			profileRepo.getAll(),
			fontRepo.getAll(),
			sectionRepo.getAll(),
			creatorProfileRepo.getAll(),
			profileFontRepo.getAll()
		]);
		loadedProfiles = profiles;
		loadedFonts = fonts;
		loadedCreatorProfiles = creatorProfiles;
		loadedProfileFonts = profileFonts;
		return { pages, profiles, fonts, creatorProfiles, profileFonts, sectionContainers };
	},
	getProfiles() { return loadedProfiles; },
	getFonts() { return loadedFonts; },
	getCreatorProfiles() { return loadedCreatorProfiles; },
	getProfileFonts() { return loadedProfileFonts; }
});
