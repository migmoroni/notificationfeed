/**
 * FeedMacro — saved filter preset for the feed.
 *
 * Pure data types. Persistence is handled by the UserConsumer record.
 */

import type { CategoryTreeId } from '$lib/domain/category/category.js';

export interface FeedMacroFilters {
	/** Selected content node IDs (any role) */
	nodeIds: string[];
	/** Selected category IDs keyed by tree */
	categoryIdsByTree: Record<CategoryTreeId, string[]>;
}

export interface FeedMacro {
	id: string;
	name: string;
	filters: FeedMacroFilters;
}
