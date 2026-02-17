/**
 * Browse Store — reactive state for category-based navigation.
 *
 * Provides categories (standard tree), selected category filtering,
 * and text-based search across CreatorPages, Profiles, and Fonts.
 *
 * Pattern: module-level $state + exported read-only accessor + actions.
 */

import type { Category } from '$lib/domain/category/category.js';
import type { CreatorPage } from '$lib/domain/creator-page/creator-page.js';
import type { Profile } from '$lib/domain/profile/profile.js';
import type { Font } from '$lib/domain/font/font.js';
import { createCategoryStore } from '$lib/persistence/category.store.js';
import { createCreatorPageStore } from '$lib/persistence/creator-page.store.js';
import { createProfileStore } from '$lib/persistence/profile.store.js';
import { createFontStore } from '$lib/persistence/font.store.js';

// ── Types ──────────────────────────────────────────────────────────────

export type BrowseEntity =
	| { type: 'creator_page'; data: CreatorPage }
	| { type: 'profile'; data: Profile }
	| { type: 'font'; data: Font };

// ── Internal reactive state ────────────────────────────────────────────

interface BrowseStoreState {
	categories: Category[];
	selectedCategoryId: string | null;
	entities: BrowseEntity[];
	searchQuery: string;
	loading: boolean;
}

let state = $state<BrowseStoreState>({
	categories: [],
	selectedCategoryId: null,
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

// ── Exported accessor ──────────────────────────────────────────────────

export const browse = {
	get categories() { return state.categories; },
	get selectedCategoryId() { return state.selectedCategoryId; },
	get entities() { return state.entities; },
	get searchQuery() { return state.searchQuery; },
	get loading() { return state.loading; },

	get rootCategories(): Category[] {
		return state.categories.filter((c) => c.parentId === null);
	},

	getChildren(parentId: string): Category[] {
		return state.categories.filter((c) => c.parentId === parentId);
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

	async selectCategory(categoryId: string | null): Promise<void> {
		state.selectedCategoryId = categoryId;
		if (!categoryId) {
			state.entities = [];
			return;
		}

		state.loading = true;
		try {
			// Gather category IDs (selected + children for deeper matching)
			const childCats = await categoryRepo.getChildren(categoryId);
			const catIds = new Set([categoryId, ...childCats.map((c) => c.id)]);

			// Load profiles in this category tree
			const allProfiles = await profileRepo.getAll();
			const matchedProfiles = allProfiles.filter((p) => catIds.has(p.categoryId));

			// Build profile IDs for font lookup
			const profileIds = new Set(matchedProfiles.map((p) => p.id));

			// Load fonts that belong to these profiles
			const allFonts = await fontRepo.getAll();
			const matchedFonts = allFonts.filter((f) => profileIds.has(f.profileId));

			// Load creator pages that own these profiles
			const ownerIds = new Set(matchedProfiles.map((p) => p.creatorPageId).filter(Boolean));
			const allPages = await pageRepo.getAll();
			const matchedPages = allPages.filter((p) => ownerIds.has(p.id));

			const entities: BrowseEntity[] = [
				...matchedPages.map((p) => ({ type: 'creator_page' as const, data: p })),
				...matchedProfiles.map((p) => ({ type: 'profile' as const, data: p })),
				...matchedFonts.map((f) => ({ type: 'font' as const, data: f }))
			];

			state.entities = entities;
		} finally {
			state.loading = false;
		}
	},

	async searchEntities(query: string): Promise<void> {
		state.searchQuery = query;

		if (!query.trim()) {
			state.entities = [];
			return;
		}

		state.loading = true;
		try {
			const [pages, profiles, fonts] = await Promise.all([
				pageRepo.getAll(),
				profileRepo.getAll(),
				fontRepo.getAll()
			]);

			const entities: BrowseEntity[] = [
				...pages
					.filter((p) => matchesQuery(p.title, query) || matchesTags(p.tags, query))
					.map((p) => ({ type: 'creator_page' as const, data: p })),
				...profiles
					.filter((p) => matchesQuery(p.title, query) || matchesTags(p.tags, query))
					.map((p) => ({ type: 'profile' as const, data: p })),
				...fonts
					.filter((f) => matchesQuery(f.title, query) || matchesTags(f.tags, query))
					.map((f) => ({ type: 'font' as const, data: f }))
			];

			state.entities = entities;
		} finally {
			state.loading = false;
		}
	},

	clearSearch(): void {
		state.searchQuery = '';
		state.entities = [];
	}
};
