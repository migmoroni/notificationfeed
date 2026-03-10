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
import { createCreatorProfileStore } from '$lib/persistence/creator-profile.store.js';
import { createProfileFontStore } from '$lib/persistence/profile-font.store.js';
import { createEntityFilter } from './entity-filter.svelte.js';
import { activeUser } from './active-user.svelte.js';
import type { CreatorProfile } from '$lib/domain/creator-profile/creator-profile.js';
import type { ProfileFont } from '$lib/domain/profile-font/profile-font.js';

const pageRepo = createCreatorPageStore();
const profileRepo = createProfileStore();
const fontRepo = createFontStore();
const sectionRepo = createSectionStore();
const creatorProfileRepo = createCreatorProfileStore();
const profileFontRepo = createProfileFontStore();

let loadedProfiles = $state<import('$lib/domain/profile/profile.js').Profile[]>([]);
let loadedFonts = $state<import('$lib/domain/font/font.js').Font[]>([]);
let loadedCreatorProfiles = $state<CreatorProfile[]>([]);
let loadedProfileFonts = $state<ProfileFont[]>([]);

export const previewEntityFilter = createEntityFilter({
	async load() {
		const userId = activeUser.current?.id;
		if (!userId) return { pages: [], profiles: [], fonts: [], creatorProfiles: [], profileFonts: [], sectionContainers: [] };

		const [pages, profiles, allCreatorProfiles, allProfileFonts, allFonts, sectionContainers] = await Promise.all([
			pageRepo.getByOwnerId(userId),
			profileRepo.getByOwnerId(userId, 'creator'),
			creatorProfileRepo.getAll(),
			profileFontRepo.getAll(),
			fontRepo.getAll(),
			sectionRepo.getAll()
		]);

		const profileIds = new Set(profiles.map((p) => p.id));

		// Filter junctions to only those referencing our profiles
		const creatorProfiles = allCreatorProfiles.filter((cp) => profileIds.has(cp.profileId));

		// Fonts linked to our profiles via profileFonts
		const relevantProfileFonts = allProfileFonts.filter((pf) => profileIds.has(pf.profileId));
		const fontIds = new Set(relevantProfileFonts.map((pf) => pf.fontId));
		const fonts = allFonts.filter((f) => fontIds.has(f.id));

		loadedProfiles = profiles;
		loadedFonts = fonts;
		loadedCreatorProfiles = creatorProfiles;
		loadedProfileFonts = relevantProfileFonts;
		return { pages, profiles, fonts, creatorProfiles, profileFonts: relevantProfileFonts, sectionContainers };
	},
	getProfiles() { return loadedProfiles; },
	getFonts() { return loadedFonts; },
	getCreatorProfiles() { return loadedCreatorProfiles; },
	getProfileFonts() { return loadedProfileFonts; }
});
