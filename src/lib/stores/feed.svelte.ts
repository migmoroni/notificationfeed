/**
 * Feed Store — reactive state for the post feed.
 *
 * Holds the raw posts from persistence and exposes a derived `prioritized`
 * view that applies the priority-resolver + feed-sorter pipeline.
 *
 * Supports filtering by priority, subject categories, and content type categories.
 * Category filtering resolves font → profile → categoryAssignments.
 *
 * Depends on `consumer.stateMap` for priority resolution.
 * Depends on fonts/profiles being loaded to build PriorityContext entries.
 *
 * Pattern: module-level $state + exported read-only accessor + actions.
 */

import type { CanonicalPost } from '$lib/normalization/canonical-post.js';
import type { PriorityLevel } from '$lib/domain/shared/consumer-state.js';
import type { PriorityContext } from '$lib/domain/shared/priority-resolver.js';
import type { SortedPost } from '$lib/domain/shared/feed-sorter.js';
import type { Font } from '$lib/domain/font/font.js';
import type { Profile } from '$lib/domain/profile/profile.js';
import { buildPriorityMap } from '$lib/domain/shared/priority-resolver.js';
import { sortByPriority } from '$lib/domain/shared/feed-sorter.js';
import { getPosts, markAsRead as persistMarkRead } from '$lib/persistence/post.store.js';
import { createFontStore } from '$lib/persistence/font.store.js';
import { createProfileStore } from '$lib/persistence/profile.store.js';
import { consumer } from './consumer.svelte.js';

// ── Internal reactive state ────────────────────────────────────────────

interface FeedStoreState {
	posts: CanonicalPost[];
	fonts: Font[];
	profiles: Profile[];
	loading: boolean;
	lastRefresh: Date | null;
}

let state = $state<FeedStoreState>({
	posts: [],
	fonts: [],
	profiles: [],
	loading: false,
	lastRefresh: null
});

const fontRepo = createFontStore();
const profileRepo = createProfileStore();

// ── Priority pipeline ──────────────────────────────────────────────────

function buildContexts(fonts: Font[]): PriorityContext[] {
	return fonts.map((f) => ({
		fontId: f.id,
		profileId: f.profileId,
		creatorPageId: null // resolved at profile level; simplified for now
	}));
}

function computePrioritized(): SortedPost[] {
	if (state.posts.length === 0) return [];

	const contexts = buildContexts(state.fonts);
	const priorityMap: Map<string, PriorityLevel> = buildPriorityMap(contexts, consumer.stateMap);

	return sortByPriority(state.posts, priorityMap);
}

// ── Category filtering helpers ─────────────────────────────────────────

/**
 * Build a set of fontIds whose parent profile matches the given category IDs
 * in the specified tree.
 */
function fontIdsMatchingCategories(
	treeId: 'subject' | 'content_type',
	categoryIds: string[]
): Set<string> {
	if (categoryIds.length === 0) return new Set(); // means "no filter" — handled by caller

	const catSet = new Set(categoryIds);
	const profileMap = new Map(state.profiles.map((p) => [p.id, p]));

	const matchingFontIds = new Set<string>();
	for (const font of state.fonts) {
		const profile = profileMap.get(font.profileId);
		if (!profile) continue;

		const assignment = profile.categoryAssignments.find((a) => a.treeId === treeId);
		if (assignment && assignment.categoryIds.some((cid) => catSet.has(cid))) {
			matchingFontIds.add(font.id);
		}
	}
	return matchingFontIds;
}

// ── Exported accessor ──────────────────────────────────────────────────

export const feed = {
	get posts() { return state.posts; },
	get fonts() { return state.fonts; },
	get profiles() { return state.profiles; },
	get loading() { return state.loading; },
	get lastRefresh() { return state.lastRefresh; },
	get prioritized(): SortedPost[] { return computePrioritized(); },
	get count() { return state.posts.length; },

	/**
	 * Get prioritized posts filtered by category assignments.
	 * Pass empty arrays to skip that dimension of filtering.
	 */
	filteredByCategories(subjectIds: string[], contentTypeIds: string[]): SortedPost[] {
		let sorted = computePrioritized();

		if (subjectIds.length > 0) {
			const allowedFonts = fontIdsMatchingCategories('subject', subjectIds);
			sorted = sorted.filter((sp) => allowedFonts.has(sp.post.fontId));
		}

		if (contentTypeIds.length > 0) {
			const allowedFonts = fontIdsMatchingCategories('content_type', contentTypeIds);
			sorted = sorted.filter((sp) => allowedFonts.has(sp.post.fontId));
		}

		return sorted;
	},

	// ── Actions ──────────────────────────────────────────────────────

	async loadFeed(): Promise<void> {
		if (state.loading) return;
		state.loading = true;

		try {
			const [posts, fonts, profiles] = await Promise.all([
				getPosts(),
				fontRepo.getAll(),
				profileRepo.getAll()
			]);

			state.posts = posts;
			state.fonts = fonts;
			state.profiles = profiles;
			state.lastRefresh = new Date();
		} finally {
			state.loading = false;
		}
	},

	async markRead(postId: string): Promise<void> {
		await persistMarkRead(postId);

		// Optimistic update
		const idx = state.posts.findIndex((p) => p.id === postId);
		if (idx >= 0) {
			state.posts[idx] = { ...state.posts[idx], read: true };
		}
	},

	async refreshFeed(): Promise<void> {
		await feed.loadFeed();
	},

	/** Replace posts in-memory (used by ingestion pipeline) */
	addPosts(newPosts: CanonicalPost[]): void {
		const existingIds = new Set(state.posts.map((p) => p.id));
		const unique = newPosts.filter((p) => !existingIds.has(p.id));
		if (unique.length > 0) {
			state.posts = [...unique, ...state.posts];
		}
	}
};
