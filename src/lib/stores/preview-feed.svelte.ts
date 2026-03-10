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
import { createCreatorProfileStore } from '$lib/persistence/creator-profile.store.js';
import { createProfileFontStore } from '$lib/persistence/profile-font.store.js';

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
const cpRepo = createCreatorProfileStore();
const pfRepo = createProfileFontStore();

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
			// Collect font IDs from published pages via junctions
			const fontIds = new Set<string>();

			for (const page of publishedPages) {
				const cpJunctions = await cpRepo.getByCreatorPageId(page.id);
				for (const cp of cpJunctions) {
					const pfJunctions = await pfRepo.getByProfileId(cp.profileId);
					for (const pf of pfJunctions) {
						fontIds.add(pf.fontId);
					}
				}
			}

			if (fontIds.size === 0) {
				state.posts = [];
				return;
			}

			// Load posts for these fonts
			const postArrays = await Promise.all(
				Array.from(fontIds).map((fontId) => getPosts({ fontId }))
			);
			state.posts = postArrays
				.flat()
				.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
		} finally {
			state.loading = false;
		}
	},

	clear(): void {
		state.posts = [];
	}
};
