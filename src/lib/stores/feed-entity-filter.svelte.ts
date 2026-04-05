/**
 * Feed Entity Filter — instance of EntityFilterStore for the Feed page.
 *
 * Data source: trees from the feed store (subscribed entities only).
 */

import { createEntityFilter } from './entity-filter.svelte.js';
import { feed } from './feed.svelte.js';

export const feedEntityFilter = createEntityFilter({
async load() {
return { trees: feed.trees };
},
getTrees() { return feed.trees; }
});
