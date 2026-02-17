/**
 * Feed Store — reactive state for the post feed.
 *
 * Holds the raw posts from persistence and exposes a derived `prioritized`
 * view that applies the priority-resolver + feed-sorter pipeline.
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
import { buildPriorityMap } from '$lib/domain/shared/priority-resolver.js';
import { sortByPriority } from '$lib/domain/shared/feed-sorter.js';
import { getPosts, markAsRead as persistMarkRead } from '$lib/persistence/post.store.js';
import { createFontStore } from '$lib/persistence/font.store.js';
import { consumer } from './consumer.svelte.js';

// ── Internal reactive state ────────────────────────────────────────────

interface FeedStoreState {
	posts: CanonicalPost[];
	fonts: Font[];
	loading: boolean;
	lastRefresh: Date | null;
}

let state = $state<FeedStoreState>({
	posts: [],
	fonts: [],
	loading: false,
	lastRefresh: null
});

const fontRepo = createFontStore();

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

// ── Exported accessor ──────────────────────────────────────────────────

export const feed = {
	get posts() { return state.posts; },
	get fonts() { return state.fonts; },
	get loading() { return state.loading; },
	get lastRefresh() { return state.lastRefresh; },
	get prioritized(): SortedPost[] { return computePrioritized(); },
	get count() { return state.posts.length; },

	// ── Actions ──────────────────────────────────────────────────────

	async loadFeed(): Promise<void> {
		if (state.loading) return;
		state.loading = true;

		try {
			const [posts, fonts] = await Promise.all([
				getPosts(),
				fontRepo.getAll()
			]);

			state.posts = posts;
			state.fonts = fonts;
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
