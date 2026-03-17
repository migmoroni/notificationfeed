/**
 * Browse Store — reactive state for category-based navigation using ContentNode model.
 *
 * Supports simultaneous filtering by category trees (subject + content_type + region)
 * with multi-select within each tree. Text search combined with category filters.
 *
 * Entities are now ContentNode[] instead of separate CreatorPage/Profile/Font.
 *
 * Pattern: module-level $state + exported read-only accessor + actions.
 */

import type { Category, CategoryTreeId } from '$lib/domain/category/category.js';
import type { ContentNode } from '$lib/domain/content-node/content-node.js';
import type { ContentTree } from '$lib/domain/content-tree/content-tree.js';
import { createCategoryStore } from '$lib/persistence/category.store.js';
import { createContentNodeStore } from '$lib/persistence/content-node.store.js';
import { createContentTreeStore } from '$lib/persistence/content-tree.store.js';
import { getEffectiveNodeCategories } from '$lib/domain/shared/category-aggregation.js';

// ── Internal reactive state ────────────────────────────────────────────

interface BrowseStoreState {
	categories: Category[];
	selectedByTree: Record<CategoryTreeId, Set<string>>;
	nodes: ContentNode[];
	trees: ContentTree[];
	searchQuery: string;
	loading: boolean;
}

let state = $state<BrowseStoreState>({
	categories: [],
	selectedByTree: { subject: new Set(), content_type: new Set(), region: new Set() },
	nodes: [],
	trees: [],
	searchQuery: '',
	loading: false
});

const categoryRepo = createCategoryStore();
const nodeRepo = createContentNodeStore();
const treeRepo = createContentTreeStore();

// ── Helpers ────────────────────────────────────────────────────────────

function matchesQuery(text: string, query: string): boolean {
	return text.toLowerCase().includes(query.toLowerCase());
}

function expandCategoryIds(selectedIds: Set<string>, allCategories: Category[]): Set<string> {
	const expanded = new Set(selectedIds);
	for (const catId of selectedIds) {
		for (const cat of allCategories) {
			if (cat.parentId === catId && cat.isActive) {
				expanded.add(cat.id);
			}
		}
	}
	return expanded;
}

function assignmentsMatchTree(
	assignments: { treeId: string; categoryIds: string[] }[],
	treeId: CategoryTreeId,
	expandedIds: Set<string>
): boolean {
	if (expandedIds.size === 0) return true;
	const assignment = assignments.find((a) => a.treeId === treeId);
	if (!assignment) return false;
	return assignment.categoryIds.some((cid) => expandedIds.has(cid));
}

function nodeMatchesQuery(node: ContentNode, query: string): boolean {
	if (!query.trim()) return true;
	const h = node.data.header;
	return (
		matchesQuery(h.title, query) ||
		h.tags.some((t) => matchesQuery(t, query)) ||
		(h.subtitle ? matchesQuery(h.subtitle, query) : false) ||
		(h.summary ? matchesQuery(h.summary, query) : false)
	);
}

// ── Exported accessor ──────────────────────────────────────────────────

export const browse = {
	get categories() { return state.categories; },
	get selectedByTree() { return state.selectedByTree; },
	get nodes() { return state.nodes; },
	get trees() { return state.trees; },
	get searchQuery() { return state.searchQuery; },
	get loading() { return state.loading; },
	get hasFilters() {
		return (
			state.selectedByTree.subject.size > 0 ||
			state.selectedByTree.content_type.size > 0 ||
			state.selectedByTree.region.size > 0 ||
			state.searchQuery.trim().length > 0
		);
	},

	/** Nodes grouped by role for display */
	get nodesByRole(): { creators: ContentNode[]; profiles: ContentNode[]; fonts: ContentNode[] } {
		const creators: ContentNode[] = [];
		const profiles: ContentNode[] = [];
		const fonts: ContentNode[] = [];
		for (const n of state.nodes) {
			switch (n.role) {
				case 'creator': creators.push(n); break;
				case 'profile': profiles.push(n); break;
				case 'font': fonts.push(n); break;
			}
		}
		return { creators, profiles, fonts };
	},

	getRootCategories(treeId: CategoryTreeId): Category[] {
		return state.categories
			.filter((c) => c.parentId === null && c.treeId === treeId && c.isActive)
			.sort((a, b) => a.order - b.order);
	},

	getChildren(parentId: string): Category[] {
		return state.categories
			.filter((c) => c.parentId === parentId && c.isActive)
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
		state.loading = true;
		try {
			state.categories = await categoryRepo.getAll();
		} finally {
			state.loading = false;
		}
	},

	async toggleCategory(categoryId: string, treeId: CategoryTreeId): Promise<void> {
		const current = state.selectedByTree[treeId];
		const next = new Set(current);
		if (next.has(categoryId)) {
			next.delete(categoryId);
		} else {
			next.add(categoryId);
		}
		state.selectedByTree = { ...state.selectedByTree, [treeId]: next };
		await this.applyFilters();
	},

	async clearTree(treeId: CategoryTreeId): Promise<void> {
		state.selectedByTree = { ...state.selectedByTree, [treeId]: new Set() };
		await this.applyFilters();
	},

	async clearAllCategories(): Promise<void> {
		state.selectedByTree = { subject: new Set(), content_type: new Set(), region: new Set() };
		await this.applyFilters();
	},

	async setSearchQuery(query: string): Promise<void> {
		state.searchQuery = query;
		await this.applyFilters();
	},

	clearSearch(): void {
		state.searchQuery = '';
		this.applyFilters();
	},

	async applyFilters(): Promise<void> {
		const hasCategories =
			state.selectedByTree.subject.size > 0 ||
			state.selectedByTree.content_type.size > 0 ||
			state.selectedByTree.region.size > 0;
		const hasSearch = state.searchQuery.trim().length > 0;

		if (!hasCategories && !hasSearch) {
			state.nodes = [];
			return;
		}

		state.loading = true;
		try {
			const [allNodes, allTrees] = await Promise.all([
				nodeRepo.getAll(),
				treeRepo.getAll()
			]);

			state.trees = allTrees;

			const subjectIds = expandCategoryIds(state.selectedByTree.subject, state.categories);
			const contentTypeIds = expandCategoryIds(state.selectedByTree.content_type, state.categories);
			const regionIds = expandCategoryIds(state.selectedByTree.region, state.categories);

			const nodeMap = new Map(allNodes.map((n) => [n.metadata.id, n]));

			let matched = allNodes;

			if (hasCategories) {
				matched = matched.filter((node) => {
					// For each tree the node appears in, compute effective categories
					let effective = node.data.header.categoryAssignments;
					for (const tree of allTrees) {
						const treeEffective = getEffectiveNodeCategories(node.metadata.id, tree, nodeMap);
						if (treeEffective.length > 0) {
							effective = treeEffective;
							break; // use the first tree's effective categories
						}
					}

					return (
						assignmentsMatchTree(effective, 'subject', subjectIds) &&
						assignmentsMatchTree(effective, 'content_type', contentTypeIds) &&
						assignmentsMatchTree(effective, 'region', regionIds)
					);
				});
			}

			if (hasSearch) {
				const query = state.searchQuery;
				if (hasCategories) {
					matched = matched.filter((n) => nodeMatchesQuery(n, query));
				} else {
					matched = allNodes.filter((n) => nodeMatchesQuery(n, query));
				}
			}

			state.nodes = matched;
		} finally {
			state.loading = false;
		}
	},

	async searchEntities(query: string): Promise<void> {
		return this.setSearchQuery(query);
	},

	async loadAllNodes(): Promise<void> {
		state.loading = true;
		try {
			const [allNodes, allTrees] = await Promise.all([
				nodeRepo.getAll(),
				treeRepo.getAll()
			]);
			state.nodes = allNodes;
			state.trees = allTrees;
		} finally {
			state.loading = false;
		}
	},

	clearNodes(): void {
		state.nodes = [];
	}
};
