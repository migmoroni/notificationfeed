/**
 * Feed Entity Filter — instance of EntityFilterStore for the Feed page.
 *
 * Data source: profiles/fonts/junctions from the feed store (subscribed entities only),
 * pages from IndexedDB.
 */

import { createCreatorPageStore } from '$lib/persistence/creator-page.store.js';
import { createSectionStore } from '$lib/persistence/section.store.js';
import { createEntityFilter } from './entity-filter.svelte.js';
import { feed } from './feed.svelte.js';

const pageRepo = createCreatorPageStore();
const sectionRepo = createSectionStore();

export const feedEntityFilter = createEntityFilter({
	async load() {
		const [pages, sectionContainers] = await Promise.all([pageRepo.getAll(), sectionRepo.getAll()]);
		return {
			pages,
			profiles: feed.profiles,
			fonts: feed.fonts,
			creatorProfiles: feed.creatorProfiles,
			profileFonts: feed.profileFonts,
			sectionContainers
		};
	},
	getProfiles() { return feed.profiles; },
	getFonts() { return feed.fonts; },
	getCreatorProfiles() { return feed.creatorProfiles; },
	getProfileFonts() { return feed.profileFonts; }
});
