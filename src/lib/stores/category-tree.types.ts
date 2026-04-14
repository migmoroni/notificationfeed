/**
 * CategoryTreeStore — shared interface for hierarchical category tree operations.
 *
 * Both `browse` and `feedCategories` stores implement this interface,
 * allowing CategoryTree / TreeSelector components to be reused across pages.
 *
 * Stores may optionally support filter modes ('any' | 'all') per category.
 * When supported, clicking a category toggles between 'any' and 'all' modes.
 * An explicit deselect action (X button) removes the selection.
 *   - 'any': post matches if it has at least one of the selected categories (OR)
 *   - 'all': post matches only if it has every selected category (AND)
 */

import type { Category, CategoryTreeId } from '$lib/domain/category/category.js';

/** Filter mode for a selected category. */
export type CategoryFilterMode = 'any' | 'all';

export interface CategoryTreeStore {
	loading: boolean;
	getRootCategories(treeId: CategoryTreeId): Category[];
	getChildren(parentId: string): Category[];
	isSelected(categoryId: string, treeId: CategoryTreeId): boolean;
	getSelectedCount(treeId: CategoryTreeId): number;
	toggleCategory(categoryId: string, treeId: CategoryTreeId): void;
	deselectCategory?(categoryId: string, treeId: CategoryTreeId): void;
	clearTree(treeId: CategoryTreeId): void;

	/** Whether this store supports tri-state filter modes (any/all). */
	readonly supportsFilterMode?: boolean;
	/** Get the filter mode for a selected category. Returns undefined if not selected. */
	getFilterMode?(categoryId: string, treeId: CategoryTreeId): CategoryFilterMode | undefined;
}
