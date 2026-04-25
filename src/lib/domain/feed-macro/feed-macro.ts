/**
 * FeedMacro — saved filter preset for the feed.
 *
 * Pure data types. Persistence is handled by the UserConsumer record.
 */

import type { CategoryTreeId } from '$lib/domain/category/category.js';
import type { CategoryFilterMode } from '$lib/stores/category-tree.types.js';

export interface FeedMacroFilters {
	/** Selected content node IDs (any role) */
	nodeIds: string[];
	/** Selected category IDs keyed by tree */
	categoryIdsByTree: Record<CategoryTreeId, string[]>;
	/** Filter mode per category ID per tree (backwards-compatible: defaults to 'any' when absent) */
	categoryModesByTree?: Record<CategoryTreeId, Record<string, CategoryFilterMode>>;
	/**
	 * Per-node priority within this macro. Sparse: only `'high'` entries are
	 * stored — absence means `'default'`. Different macros can assign
	 * different priorities to the same node.
	 */
	priorityByNodeId?: Record<string, 'high'>;
}

export interface FeedMacro {
	id: string;
	name: string;
	filters: FeedMacroFilters;
}
