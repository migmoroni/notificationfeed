/**
 * Feed Categories Store — CategoryFilterInstance for the Feed page.
 *
 * Thin wrapper around createCategoryFilter() factory.
 */

import { createCategoryFilter } from './category-filter.svelte.js';

export const feedCategories = createCategoryFilter();
