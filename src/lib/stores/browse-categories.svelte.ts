/**
 * Browse Categories Store — CategoryFilterInstance for the Browse page.
 *
 * Thin wrapper around createCategoryFilter() factory.
 * Pure sync store — browse.svelte.ts watches modeByTree via $effect
 * and triggers applyFilters() on changes.
 */

import { createCategoryFilter } from './category-filter.svelte.js';

export const browseCategories = createCategoryFilter();
