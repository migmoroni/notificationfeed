/**
 * Preview Feed Store — loads posts for the creator's published pages.
 *
 * Filters posts from IndexedDB by fontIds found in published snapshots.
 * If fonts have never been ingested, no posts will appear (empty state
 * suggests waiting for ingestion or triggering a manual refresh).
 *
 * Pattern: module-level $state + exported read-only accessor.
 */

import type { CanonicalPost } from '$lib/normalization/canonical-post.js';
import type { CreatorPage } from '$lib/domain/creator-page/creator-page.js';
import type { Font } from '$lib/domain/font/font.js';
import { getPosts } from '$lib/persistence/post.store.js';
import { createFontStore } from '$lib/persistence/font.store.js';
import { createProfileStore } from '$lib/persistence/profile.store.js';

// ── Internal reactive state ────────────────────────────────────────────

interface PreviewFeedState {
	posts: CanonicalPost[];
	loading: boolean;
}

let state = $state<PreviewFeedState>({
	posts: [],
	loading: false
});

const fontRepo = createFontStore();
const profileRepo = createProfileStore();

// ── Exported accessor ──────────────────────────────────────────────────

export const previewFeed = {
	get posts() { return state.posts; },
	get loading() { return state.loading; },

	/**
	 * Load posts for all published pages.
	 * Resolves fontIds from the live data (not snapshots) of published pages,
	 * then loads posts for those fonts.
	 */
	async loadPreviewFeed(publishedPages: CreatorPage[]): Promise<void> {
		if (state.loading) return;
		state.loading = true;

		try {
			// Collect font IDs from published pages' profiles
			const fontIds = new Set<string>();

			for (const page of publishedPages) {
				const profiles = await profileRepo.getByCreatorPageId(page.id);
				for (const profile of profiles) {
					const fonts = await fontRepo.getByProfileId(profile.id);
					for (const font of fonts) {
						fontIds.add(font.id);
					}
				}
			}

			if (fontIds.size === 0) {
				state.posts = [];
				return;
			}

			// Load posts for these fonts
			const allPosts = await getPosts();
			state.posts = allPosts
				.filter((p) => fontIds.has(p.fontId))
				.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
		} finally {
			state.loading = false;
		}
	},

	clear(): void {
		state.posts = [];
	}
};
