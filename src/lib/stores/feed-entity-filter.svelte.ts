/**
 * Feed Entity Filter — instance of EntityFilterStore for the Feed page.
 *
 * Data source: profiles/fonts from the feed store (subscribed entities only),
 * pages from IndexedDB.
 */

import { createCreatorPageStore } from '$lib/persistence/creator-page.store.js';
import { createEntityFilter } from './entity-filter.svelte.js';
import { feed } from './feed.svelte.js';

const pageRepo = createCreatorPageStore();

export const feedEntityFilter = createEntityFilter({
	async load() {
		const pages = await pageRepo.getAll();
		return { pages, profiles: feed.profiles, fonts: feed.fonts };
	},
	getProfiles() { return feed.profiles; },
	getFonts() { return feed.fonts; }
});
