/**
 * Preview Feed Store — loads posts for the creator's published trees.
 *
 * Resolves font node IDs from the creator's trees, then loads posts for those fonts.
 * If fonts have never been ingested, no posts will appear.
 *
 * Pattern: module-level $state + exported read-only accessor.
 */

import type { CanonicalPost } from '$lib/normalization/canonical-post.js';
import type { ContentTree } from '$lib/domain/content-tree/content-tree.js';
import type { ContentNode } from '$lib/domain/content-node/content-node.js';
import { isFontNode } from '$lib/domain/content-node/content-node.js';
import { getNodeIds } from '$lib/domain/content-tree/content-tree.js';
import { getPosts } from '$lib/persistence/post.store.js';
import { createContentNodeStore } from '$lib/persistence/content-node.store.js';

// ── Internal reactive state ────────────────────────────────────────────

interface PreviewFeedState {
	posts: CanonicalPost[];
	loading: boolean;
}

let state = $state<PreviewFeedState>({
	posts: [],
	loading: false
});

const nodeRepo = createContentNodeStore();

// ── Exported accessor ──────────────────────────────────────────────────

export const previewFeed = {
	get posts() { return state.posts; },
	get loading() { return state.loading; },

	/**
	 * Load posts for all font nodes in the given trees.
	 */
	async loadPreviewFeed(trees: ContentTree[], nodes: ContentNode[]): Promise<void> {
		if (state.loading) return;
		state.loading = true;

		try {
			const fontNodeIds = nodes.filter(isFontNode).map((n) => n.metadata.id);

			if (fontNodeIds.length === 0) {
				state.posts = [];
				return;
			}

			const postArrays = await Promise.all(
				fontNodeIds.map((nodeId) => getPosts({ nodeId }))
			);
			state.posts = postArrays.flat().sort(
				(a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
			);
		} finally {
			state.loading = false;
		}
	},

	clear(): void {
		state.posts = [];
	}
};
