/**
 * Feed Entity Filter — instance of EntityFilterStore for the Feed page.
 *
 * Data source: trees and nodes from the feed store (subscribed entities only).
 */

import { createEntityFilter } from './entity-filter.svelte.js';
import { feed } from './feed.svelte.js';

export const feedEntityFilter = createEntityFilter({
	async load() {
		// Feed store should already be loaded; just return current data
		return { trees: feed.trees, nodes: feed.nodes };
	},
	getTrees() { return feed.trees; },
	getNodes() { return feed.nodes; }
});
