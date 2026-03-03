/**
 * Browse Store — reactive state for category-based navigation.
 *
 * Supports simultaneous filtering by both category trees (subject + content_type)
 * with multi-select within each tree. Text search is combined with category
 * filters (intersection), not mutually exclusive.
 *
 * Profile navigation respects the DDD lifecycle modes:
 * - Standalone profiles (creatorPageId = null) → `/browse/profile/{id}`
 * - Dependent profiles (creatorPageId set) → `/browse/creator/{pageId}/profile/{id}`
 * URL construction is delegated to the EntityList component.
 *
 * Pattern: module-level $state + exported read-only accessor + actions.
 */

import type { Category, CategoryTreeId } from '$lib/domain/category/category.js';
import type { CreatorPage } from '$lib/domain/creator-page/creator-page.js';
import type { Profile } from '$lib/domain/profile/profile.js';
import type { Font } from '$lib/domain/font/font.js';
import { createCategoryStore } from '$lib/persistence/category.store.js';
import { createCreatorPageStore } from '$lib/persistence/creator-page.store.js';
import { createProfileStore } from '$lib/persistence/profile.store.js';
import { createFontStore } from '$lib/persistence/font.store.js';
import { mergeAssignments } from '$lib/domain/shared/category-aggregation.js';

// ── Types ──────────────────────────────────────────────────────────────

export type BrowseEntity =
	| { type: 'creator_page'; data: CreatorPage }
	| { type: 'profile'; data: Profile }
	| { type: 'font'; data: Font };

// ── Internal reactive state ────────────────────────────────────────────

interface BrowseStoreState {
	categories: Category[];
	/** Selected category IDs per tree (multi-select within each tree) */
	selectedByTree: Record<CategoryTreeId, Set<string>>;
	entities: BrowseEntity[];
	searchQuery: string;
	loading: boolean;
}

let state = $state<BrowseStoreState>({
	categories: [],
	selectedByTree: { subject: new Set(), content_type: new Set(), region: new Set() },
	entities: [],
	searchQuery: '',
	loading: false
});

const categoryRepo = createCategoryStore();
const pageRepo = createCreatorPageStore();
const profileRepo = createProfileStore();
const fontRepo = createFontStore();

// ── Helpers ────────────────────────────────────────────────────────────

function matchesQuery(text: string, query: string): boolean {
	return text.toLowerCase().includes(query.toLowerCase());
}

function matchesTags(tags: string[], query: string): boolean {
	return tags.some((t) => matchesQuery(t, query));
}

/** Expand selected IDs to include their children (for deeper matching) */
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

/** Check if a set of assignments matches a tree's selected categories */
function assignmentsMatchTree(assignments: { treeId: string; categoryIds: string[] }[], treeId: CategoryTreeId, expandedIds: Set<string>): boolean {
	if (expandedIds.size === 0) return true; // no filter = pass
	const assignment = assignments.find((a) => a.treeId === treeId);
	if (!assignment) return false;
	return assignment.categoryIds.some((cid) => expandedIds.has(cid));
}

/** Check if entity matches text query */
function entityMatchesQuery(entity: BrowseEntity, query: string): boolean {
	if (!query.trim()) return true;
	return matchesQuery(entity.data.title, query) || matchesTags(entity.data.tags, query);
}

let hasAnySelection = $derived(
	state.selectedByTree.subject.size > 0 || state.selectedByTree.content_type.size > 0 || state.selectedByTree.region.size > 0
);

// ── Exported accessor ──────────────────────────────────────────────────

export const browse = {
	get categories() { return state.categories; },
	get selectedByTree() { return state.selectedByTree; },
	get entities() { return state.entities; },
	get searchQuery() { return state.searchQuery; },
	get loading() { return state.loading; },
	get hasFilters() { return hasAnySelection || state.searchQuery.trim().length > 0; },

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

	/** Toggle a category selection within a tree. Triggers re-filter. */
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

	/** Clear all selections for a tree. Triggers re-filter. */
	async clearTree(treeId: CategoryTreeId): Promise<void> {
		state.selectedByTree = { ...state.selectedByTree, [treeId]: new Set() };
		await this.applyFilters();
	},

	/** Clear all selections across all trees. */
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

	/**
	 * Apply all active filters (categories + search) as intersection.
	 * - No filters = show nothing (user must select or search)
	 * - Categories filter entities by effective assignments (AND between trees, OR within a tree)
	 *   Effective = entity own + aggregated child assignments.
	 * - Search filters by title/tags across all entity types
	 * - Both active = intersection
	 */
	async applyFilters(): Promise<void> {
		const hasCategories = state.selectedByTree.subject.size > 0 || state.selectedByTree.content_type.size > 0 || state.selectedByTree.region.size > 0;
		const hasSearch = state.searchQuery.trim().length > 0;

		if (!hasCategories && !hasSearch) {
			state.entities = [];
			return;
		}

		state.loading = true;
		try {
			const [allPages, allProfiles, allFonts] = await Promise.all([
				pageRepo.getAll(),
				profileRepo.getAll(),
				fontRepo.getAll()
			]);

			// Expand selected categories to include children
			const subjectIds = expandCategoryIds(state.selectedByTree.subject, state.categories);
			const contentTypeIds = expandCategoryIds(state.selectedByTree.content_type, state.categories);
			const regionIds = expandCategoryIds(state.selectedByTree.region, state.categories);

			// Build font-by-profile map for aggregation
			const fontsByProfile = new Map<string, typeof allFonts>();
			for (const f of allFonts) {
				const list = fontsByProfile.get(f.profileId) ?? [];
				list.push(f);
				fontsByProfile.set(f.profileId, list);
			}

			// Compute effective profile categories (own + child fonts)
			const profileEffective = new Map<string, import('$lib/domain/shared/category-assignment.js').CategoryAssignment[]>();
			for (const p of allProfiles) {
				const childFontAssignments = (fontsByProfile.get(p.id) ?? []).map(
					(f) => f.categoryAssignments ?? []
				);
				profileEffective.set(
					p.id,
					mergeAssignments(p.categoryAssignments ?? [], ...childFontAssignments)
				);
			}

			// Filter fonts by their own categories only (no downward propagation)
			let matchedFonts = allFonts;
			if (hasCategories) {
				matchedFonts = allFonts.filter((f) => {
					const own = f.categoryAssignments ?? [];
					return (
						assignmentsMatchTree(own, 'subject', subjectIds) &&
						assignmentsMatchTree(own, 'content_type', contentTypeIds) &&
						assignmentsMatchTree(own, 'region', regionIds)
					);
				});
			}

			// Filter profiles by effective categories (own + child fonts): AND between trees
			let matchedProfiles = allProfiles;
			if (hasCategories) {
				matchedProfiles = allProfiles.filter((p) => {
					const eff = profileEffective.get(p.id) ?? [];
					return (
						assignmentsMatchTree(eff, 'subject', subjectIds) &&
						assignmentsMatchTree(eff, 'content_type', contentTypeIds) &&
						assignmentsMatchTree(eff, 'region', regionIds)
					);
				});
			}

			// Filter pages by effective categories (own + child profiles' effective): AND between trees
			let matchedPages: typeof allPages = [];
			if (hasCategories) {
				// Compute effective page categories (own + child profiles' effective)
				const profilesByPage = new Map<string, typeof allProfiles>();
				for (const p of allProfiles) {
					if (!p.creatorPageId) continue;
					const list = profilesByPage.get(p.creatorPageId) ?? [];
					list.push(p);
					profilesByPage.set(p.creatorPageId, list);
				}

				matchedPages = allPages.filter((page) => {
					const childProfileEffectives = (profilesByPage.get(page.id) ?? []).map(
						(p) => profileEffective.get(p.id) ?? []
					);
					const pageEff = mergeAssignments(page.categoryAssignments ?? [], ...childProfileEffectives);
					return (
						assignmentsMatchTree(pageEff, 'subject', subjectIds) &&
						assignmentsMatchTree(pageEff, 'content_type', contentTypeIds) &&
						assignmentsMatchTree(pageEff, 'region', regionIds)
					);
				});
			} else {
				matchedPages = allPages;
			}

			// Assemble entities
			let entities: BrowseEntity[] = [
				...matchedPages.map((p) => ({ type: 'creator_page' as const, data: p })),
				...matchedProfiles.map((p) => ({ type: 'profile' as const, data: p })),
				...matchedFonts.map((f) => ({ type: 'font' as const, data: f }))
			];

			// If search is also active, intersect with text match
			if (hasSearch) {
				const query = state.searchQuery;
				if (hasCategories) {
					// Intersection: must match both categories AND text
					entities = entities.filter((e) => entityMatchesQuery(e, query));
				} else {
					// Search only — search across everything
					entities = [
						...allPages.filter((p) => matchesQuery(p.title, query) || matchesTags(p.tags, query))
							.map((p) => ({ type: 'creator_page' as const, data: p })),
						...allProfiles.filter((p) => matchesQuery(p.title, query) || matchesTags(p.tags, query))
							.map((p) => ({ type: 'profile' as const, data: p })),
						...allFonts.filter((f) => matchesQuery(f.title, query) || matchesTags(f.tags, query))
							.map((f) => ({ type: 'font' as const, data: f }))
					];
				}
			}

			state.entities = entities;
		} finally {
			state.loading = false;
		}
	},

	// Legacy compatibility
	async searchEntities(query: string): Promise<void> {
		return this.setSearchQuery(query);
	},

	/**
	 * Load all entities unconditionally (used when an external filter like
	 * the entity filter is active but browse has no category/search filters).
	 */
	async loadAllEntities(): Promise<void> {
		state.loading = true;
		try {
			const [allPages, allProfiles, allFonts] = await Promise.all([
				pageRepo.getAll(),
				profileRepo.getAll(),
				fontRepo.getAll()
			]);
			state.entities = [
				...allPages.map((p) => ({ type: 'creator_page' as const, data: p })),
				...allProfiles.map((p) => ({ type: 'profile' as const, data: p })),
				...allFonts.map((f) => ({ type: 'font' as const, data: f }))
			];
		} finally {
			state.loading = false;
		}
	},

	/** Clear entities (used when all external filters are also cleared). */
	clearEntities(): void {
		state.entities = [];
	}
};
