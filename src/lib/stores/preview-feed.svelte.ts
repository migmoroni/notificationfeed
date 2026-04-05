/**
 * Preview Feed Store — loads posts for the creator's published trees.
 *
 * Resolves font node IDs from the creator's trees (embedded nodes),
 * then loads posts for those fonts.
 *
 * Pattern: module-level $state + exported read-only accessor.
 */

import type { CanonicalPost } from '$lib/normalization/canonical-post.js';
import type { ContentTree } from '$lib/domain/content-tree/content-tree.js';
import { getFontNodes } from '$lib/domain/content-tree/content-tree.js';
import { getPosts } from '$lib/persistence/post.store.js';

// ── Internal reactive state ────────────────────────────────────────────

interface PreviewFeedState {
posts: CanonicalPost[];
loading: boolean;
}

let state = $state<PreviewFeedState>({
posts: [],
loading: false
});

// ── Exported accessor ──────────────────────────────────────────────────

export const previewFeed = {
get posts() { return state.posts; },
get loading() { return state.loading; },

/**
 * Load posts for all font nodes in the given trees.
 */
async loadPreviewFeed(trees: ContentTree[]): Promise<void> {
if (state.loading) return;
state.loading = true;

try {
const fontNodeIds: string[] = [];
for (const tree of trees) {
for (const node of getFontNodes(tree)) {
fontNodeIds.push(node.metadata.id);
}
}

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
