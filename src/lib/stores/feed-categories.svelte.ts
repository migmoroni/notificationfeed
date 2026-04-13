/**
 * Feed Categories Store — reactive category tree state for Feed page filtering.
 *
 * Implements the same CategoryTreeStore interface used by CategoryTree/TreeSelector
 * so the Feed page can reuse the identical tree UI from Browse.
 *
 * Selection state is local to this store and independent from the browse store.
 */

import type { Category, CategoryTreeId } from '$lib/domain/category/category.js';
import { createCategoryStore } from '$lib/persistence/category.store.js';

// ── Internal reactive state ────────────────────────────────────────────

interface FeedCategoriesState {
	categories: Category[];
	selectedByTree: Record<CategoryTreeId, Set<string>>;
	loading: boolean;
}

let state = $state<FeedCategoriesState>({
	categories: [],
	selectedByTree: { subject: new Set(), content_type: new Set(), media_type: new Set(), region: new Set() },
	loading: false
});

const categoryRepo = createCategoryStore();

// ── Exported accessor (matches CategoryTreeStore interface) ────────────

export const feedCategories = {
	get categories() { return state.categories; },
	get selectedByTree() { return state.selectedByTree; },
	get loading() { return state.loading; },

	/** Selected IDs for a given tree as an array (convenience for FeedList). */
	getSelectedIds(treeId: CategoryTreeId): string[] {
		return [...state.selectedByTree[treeId]];
	},

	get hasFilters(): boolean {
		return state.selectedByTree.subject.size > 0 || state.selectedByTree.content_type.size > 0 || state.selectedByTree.media_type.size > 0 || state.selectedByTree.region.size > 0;
	},

	getRootCategories(treeId: CategoryTreeId): Category[] {
		return state.categories
			.filter((c) => c.parentId === null && c.treeId === treeId)
			.sort((a, b) => a.order - b.order);
	},

	getChildren(parentId: string): Category[] {
		return state.categories
			.filter((c) => c.parentId === parentId)
			.sort((a, b) => a.order - b.order);
	},

	isSelected(categoryId: string, treeId: CategoryTreeId): boolean {
		return state.selectedByTree[treeId].has(categoryId);
	},

	getSelectedCount(treeId: CategoryTreeId): number {
		return state.selectedByTree[treeId].size;
	},

	// ── Actions ──────────────────────────────────────────────────────

	async loadCategories(): Promise<void> {
		if (state.categories.length > 0) return; // already loaded
		state.loading = true;
		try {
			state.categories = await categoryRepo.getAll();
		} finally {
			state.loading = false;
		}
	},

	toggleCategory(categoryId: string, treeId: CategoryTreeId): void {
		const current = state.selectedByTree[treeId];
		const next = new Set(current);
		if (next.has(categoryId)) {
			next.delete(categoryId);
		} else {
			next.add(categoryId);
		}
		state.selectedByTree = { ...state.selectedByTree, [treeId]: next };
	},

	clearTree(treeId: CategoryTreeId): void {
		state.selectedByTree = { ...state.selectedByTree, [treeId]: new Set() };
	},

	clearAll(): void {
		state.selectedByTree = { subject: new Set(), content_type: new Set(), media_type: new Set(), region: new Set() };
	}
};
