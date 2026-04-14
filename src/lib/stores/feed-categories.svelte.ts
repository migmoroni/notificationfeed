/**
 * Feed Categories Store — reactive category tree state for Feed page filtering.
 *
 * Implements the CategoryTreeStore interface with tri-state filter mode support.
 * Each selected category can be in 'any' (OR) or 'all' (AND) mode.
 *
 * Click cycle: unselected → any → all → unselected
 */

import type { Category, CategoryTreeId } from '$lib/domain/category/category.js';
import type { CategoryFilterMode } from '$lib/stores/category-tree.types.js';
import { createCategoryStore } from '$lib/persistence/category.store.js';

// ── Internal reactive state ────────────────────────────────────────────

type TreeModes = Record<CategoryTreeId, Map<string, CategoryFilterMode>>;

function emptyTreeModes(): TreeModes {
	return { subject: new Map(), content_type: new Map(), media_type: new Map(), region: new Map() };
}

interface FeedCategoriesState {
	categories: Category[];
	modeByTree: TreeModes;
	loading: boolean;
}

let state = $state<FeedCategoriesState>({
	categories: [],
	modeByTree: emptyTreeModes(),
	loading: false
});

const categoryRepo = createCategoryStore();

// ── Exported accessor (matches CategoryTreeStore interface) ────────────

export const feedCategories = {
	get categories() { return state.categories; },
	get modeByTree() { return state.modeByTree; },
	get loading() { return state.loading; },

	/** Whether this store supports tri-state filter modes. */
	get supportsFilterMode(): true { return true; },

	/** Get the filter mode for a selected category. Returns undefined if not selected. */
	getFilterMode(categoryId: string, treeId: CategoryTreeId): CategoryFilterMode | undefined {
		return state.modeByTree[treeId].get(categoryId);
	},

	/** All selected IDs for a given tree (both 'any' and 'all'). */
	getSelectedIds(treeId: CategoryTreeId): string[] {
		return [...state.modeByTree[treeId].keys()];
	},

	/** IDs in 'any' mode for a given tree. */
	getAnyIds(treeId: CategoryTreeId): string[] {
		const entries = state.modeByTree[treeId];
		return [...entries.entries()].filter(([, m]) => m === 'any').map(([id]) => id);
	},

	/** IDs in 'all' mode for a given tree. */
	getAllIds(treeId: CategoryTreeId): string[] {
		const entries = state.modeByTree[treeId];
		return [...entries.entries()].filter(([, m]) => m === 'all').map(([id]) => id);
	},

	get hasFilters(): boolean {
		return state.modeByTree.subject.size > 0 || state.modeByTree.content_type.size > 0 || state.modeByTree.media_type.size > 0 || state.modeByTree.region.size > 0;
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
		return state.modeByTree[treeId].has(categoryId);
	},

	getSelectedCount(treeId: CategoryTreeId): number {
		return state.modeByTree[treeId].size;
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

	/** Cycle: unselected → any → all → unselected */
	toggleCategory(categoryId: string, treeId: CategoryTreeId): void {
		const current = state.modeByTree[treeId];
		const next = new Map(current);
		const mode = next.get(categoryId);

		if (mode === undefined) {
			next.set(categoryId, 'any');
		} else if (mode === 'any') {
			next.set(categoryId, 'all');
		} else {
			next.delete(categoryId);
		}

		state.modeByTree = { ...state.modeByTree, [treeId]: next };
	},

	clearTree(treeId: CategoryTreeId): void {
		state.modeByTree = { ...state.modeByTree, [treeId]: new Map() };
	},

	clearAll(): void {
		state.modeByTree = emptyTreeModes();
	}
};
