/**
 * Category Filter Factory — creates independent category filter store instances.
 *
 * Each call returns a store with its own selection state ($state).
 * Implements the CategoryTreeStore interface with tri-state filter mode support.
 * Each selected category can be in 'any' (OR) or 'all' (AND) mode.
 *
 * Click cycle: unselected → any → all → unselected
 *
 * Pattern mirrors createEntityFilter() — thin wrappers per page.
 */

import type { Category, CategoryTreeId } from '$lib/domain/category/category.js';
import type { CategoryFilterMode } from '$lib/stores/category-tree.types.js';
import { createCategoryStore } from '$lib/persistence/category.store.js';

// ── Shared types ───────────────────────────────────────────────────────

export type TreeModes = Record<CategoryTreeId, Map<string, CategoryFilterMode>>;

export function emptyTreeModes(): TreeModes {
	return { subject: new Map(), content: new Map(), media: new Map(), region: new Map(), language: new Map() };
}

const TREE_IDS: readonly CategoryTreeId[] = ['subject', 'content', 'media', 'region', 'language'];

// ── Return type ────────────────────────────────────────────────────────

export interface CategoryFilterInstance {
	readonly categories: Category[];
	readonly modeByTree: TreeModes;
	readonly loading: boolean;
	readonly supportsFilterMode: true;
	readonly hasFilters: boolean;

	getFilterMode(categoryId: string, treeId: CategoryTreeId): CategoryFilterMode | undefined;
	getSelectedIds(treeId: CategoryTreeId): string[];
	getAnyIds(treeId: CategoryTreeId): string[];
	getAllIds(treeId: CategoryTreeId): string[];
	getRootCategories(treeId: CategoryTreeId): Category[];
	getChildren(parentId: string): Category[];
	isSelected(categoryId: string, treeId: CategoryTreeId): boolean;
	getSelectedCount(treeId: CategoryTreeId): number;

	loadCategories(): Promise<void>;
	toggleCategory(categoryId: string, treeId: CategoryTreeId): void;
	selectCategory(categoryId: string, treeId: CategoryTreeId, mode: CategoryFilterMode): void;
	deselectCategory(categoryId: string, treeId: CategoryTreeId): void;
	clearTree(treeId: CategoryTreeId): void;
	clearAll(): void;
}

// ── Factory ────────────────────────────────────────────────────────────

export function createCategoryFilter(): CategoryFilterInstance {
	let categories = $state<Category[]>([]);
	let modeByTree = $state<TreeModes>(emptyTreeModes());
	let loading = $state(false);

	const categoryRepo = createCategoryStore();

	return {
		get categories() { return categories; },
		get modeByTree() { return modeByTree; },
		get loading() { return loading; },
		get supportsFilterMode(): true { return true; },

		getFilterMode(categoryId: string, treeId: CategoryTreeId): CategoryFilterMode | undefined {
			return modeByTree[treeId].get(categoryId);
		},

		getSelectedIds(treeId: CategoryTreeId): string[] {
			return [...modeByTree[treeId].keys()];
		},

		getAnyIds(treeId: CategoryTreeId): string[] {
			const entries = modeByTree[treeId];
			return [...entries.entries()].filter(([, m]) => m === 'any').map(([id]) => id);
		},

		getAllIds(treeId: CategoryTreeId): string[] {
			const entries = modeByTree[treeId];
			return [...entries.entries()].filter(([, m]) => m === 'all').map(([id]) => id);
		},

		get hasFilters(): boolean {
			return TREE_IDS.some((t) => modeByTree[t].size > 0);
		},

		getRootCategories(treeId: CategoryTreeId): Category[] {
			return categories
				.filter((c) => c.parentId === null && c.treeId === treeId)
				.sort((a, b) => a.order - b.order);
		},

		getChildren(parentId: string): Category[] {
			return categories
				.filter((c) => c.parentId === parentId)
				.sort((a, b) => a.order - b.order);
		},

		isSelected(categoryId: string, treeId: CategoryTreeId): boolean {
			return modeByTree[treeId].has(categoryId);
		},

		getSelectedCount(treeId: CategoryTreeId): number {
			return modeByTree[treeId].size;
		},

		async loadCategories(): Promise<void> {
			if (categories.length > 0) return;
			loading = true;
			try {
				categories = await categoryRepo.getAll();
			} finally {
				loading = false;
			}
		},

		/** Cycle: unselected → any, then any ↔ all */
		toggleCategory(categoryId: string, treeId: CategoryTreeId): void {
			const current = modeByTree[treeId];
			const next = new Map(current);
			const mode = next.get(categoryId);

			if (mode === undefined) {
				next.set(categoryId, 'any');
			} else if (mode === 'any') {
				next.set(categoryId, 'all');
			} else {
				next.set(categoryId, 'any');
			}

			modeByTree = { ...modeByTree, [treeId]: next };
		},

		deselectCategory(categoryId: string, treeId: CategoryTreeId): void {
			const current = modeByTree[treeId];
			const next = new Map(current);
			next.delete(categoryId);
			modeByTree = { ...modeByTree, [treeId]: next };
		},

		selectCategory(categoryId: string, treeId: CategoryTreeId, mode: CategoryFilterMode): void {
			const current = modeByTree[treeId];
			const next = new Map(current);
			next.set(categoryId, mode);
			modeByTree = { ...modeByTree, [treeId]: next };
		},

		clearTree(treeId: CategoryTreeId): void {
			modeByTree = { ...modeByTree, [treeId]: new Map() };
		},

		clearAll(): void {
			modeByTree = emptyTreeModes();
		}
	};
}
