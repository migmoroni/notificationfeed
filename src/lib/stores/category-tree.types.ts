/**
 * CategoryTreeStore — shared interface for hierarchical category tree operations.
 *
 * Both `browse` and `feedCategories` stores implement this interface,
 * allowing CategoryTree / TreeSelector components to be reused across pages.
 */

import type { Category, CategoryTreeId } from '$lib/domain/category/category.js';

export interface CategoryTreeStore {
	loading: boolean;
	getRootCategories(treeId: CategoryTreeId): Category[];
	getChildren(parentId: string): Category[];
	isSelected(categoryId: string, treeId: CategoryTreeId): boolean;
	getSelectedCount(treeId: CategoryTreeId): number;
	toggleCategory(categoryId: string, treeId: CategoryTreeId): void;
	clearTree(treeId: CategoryTreeId): void;
}
