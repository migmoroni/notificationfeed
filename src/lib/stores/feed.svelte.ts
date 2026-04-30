/**
 * Feed Store — reactive state for the post feed.
 *
 * Loads posts from font-nodes embedded in subscribed trees.
 * Priority resolution uses tree-based inheritance.
 *
 * Pattern: module-level $state + exported read-only accessor + actions.
 */

import type { CanonicalPost } from '$lib/normalization/canonical-post.js';
import type { ContentTree, TreeNode } from '$lib/domain/content-tree/content-tree.js';
import { getFontNodes, getNode } from '$lib/domain/content-tree/content-tree.js';
import type { CategoryTreeId } from '$lib/domain/category/category.js';
import { sortByPriority, EMPTY_PRIORITY_MAP, type SortedPost } from '$lib/domain/shared/feed-sorter.js';
import { mergeAssignments } from '$lib/domain/shared/category-aggregation.js';
import { getPostsForUser, markRead as persistMarkRead, setSaved as persistSetSaved, setTrashed as persistSetTrashed } from '$lib/persistence/post.store.js';
import { createContentTreeStore } from '$lib/persistence/content-tree.store.js';
import { activeUser } from './active-user.svelte.js';
import { consumer } from './consumer.svelte.js';

// ── Internal reactive state ────────────────────────────────────────────

interface FeedStoreState {
posts: CanonicalPost[];
trees: ContentTree[];
loading: boolean;
lastRefresh: Date | null;
}

let state = $state<FeedStoreState>({
posts: [],
trees: [],
loading: false,
lastRefresh: null
});

const treeRepo = createContentTreeStore();

// ── Helpers ────────────────────────────────────────────────────────────


// ── Priority pipeline ──────────────────────────────────────────────────

function computePrioritized(
	priorityByNodeId: Record<string, 'high'>
): SortedPost<CanonicalPost>[] {
	if (state.posts.length === 0) return [];
	return sortByPriority(state.posts, priorityByNodeId);
}

// ── Category filtering helpers ─────────────────────────────────────────

function nodeIdsMatchingCategories(
treeId: CategoryTreeId,
categoryIds: string[]
): Set<string> {
if (categoryIds.length === 0) return new Set();

const catSet = new Set(categoryIds);
const matching = new Set<string>();

for (const tree of state.trees) {
for (const fontNode of getFontNodes(tree)) {
const effective = fontNode.data.header.categoryAssignments;
const assignment = effective.find((a) => a.treeId === treeId);
if (assignment && assignment.categoryIds.some((cid) => catSet.has(cid))) {
matching.add(fontNode.metadata.id);
}
}
}
return matching;
}

/** Returns node IDs that have ALL of the given categoryIds for a tree. */
function nodeIdsMatchingAllCategories(
treeId: CategoryTreeId,
categoryIds: string[]
): Set<string> {
if (categoryIds.length === 0) return new Set();

const matching = new Set<string>();

for (const tree of state.trees) {
for (const fontNode of getFontNodes(tree)) {
const effective = fontNode.data.header.categoryAssignments;
const assignment = effective.find((a) => a.treeId === treeId);
if (assignment && categoryIds.every((cid) => assignment.categoryIds.includes(cid))) {
matching.add(fontNode.metadata.id);
}
}
}
return matching;
}

// ── Exported accessor ──────────────────────────────────────────────────

export const feed = {
get posts() { return state.posts; },
get trees() { return state.trees; },
get loading() { return state.loading; },
get lastRefresh() { return state.lastRefresh; },

/** Sort all posts using a priority map (sparse: nodeId -> 'high'). */
prioritized(priorityByNodeId: Record<string, 'high'> = EMPTY_PRIORITY_MAP): SortedPost<CanonicalPost>[] {
	return computePrioritized(priorityByNodeId);
},
get count() { return state.posts.length; },

/** Get a TreeNode by its composite nodeId from loaded trees */
getNode(nodeId: string): TreeNode | undefined {
for (const tree of state.trees) {
const node = getNode(tree, nodeId);
if (node) return node;
}
return undefined;
},

filteredByCategories(
	anyIds: { subject: string[]; content: string[]; media: string[]; region: string[]; language: string[] },
	allIds: { subject: string[]; content: string[]; media: string[]; region: string[]; language: string[] },
	priorityByNodeId: Record<string, 'high'> = EMPTY_PRIORITY_MAP
): SortedPost<CanonicalPost>[] {
let sorted = computePrioritized(priorityByNodeId);
const treeKeys = ['subject', 'content', 'media', 'region', 'language'] as const;

for (const treeId of treeKeys) {
const any = anyIds[treeId];
const all = allIds[treeId];

if (any.length > 0 && all.length > 0) {
	// Both modes: must match ANY of the 'any' set AND ALL of the 'all' set
	const anyAllowed = nodeIdsMatchingCategories(treeId, any);
	const allAllowed = nodeIdsMatchingAllCategories(treeId, all);
	sorted = sorted.filter((sp) => anyAllowed.has(sp.post.nodeId) && allAllowed.has(sp.post.nodeId));
} else if (any.length > 0) {
	const allowed = nodeIdsMatchingCategories(treeId, any);
	sorted = sorted.filter((sp) => allowed.has(sp.post.nodeId));
} else if (all.length > 0) {
	const allowed = nodeIdsMatchingAllCategories(treeId, all);
	sorted = sorted.filter((sp) => allowed.has(sp.post.nodeId));
}
}

return sorted;
},

// ── Actions ──────────────────────────────────────────────────────

async loadFeed(): Promise<void> {
if (state.loading) return;
state.loading = true;

try {
// Load all trees the consumer has activated
const activatedTreeIds = consumer.activateTrees.map((t) => t.treeId);
const trees = activatedTreeIds.length > 0
? await treeRepo.getByIds(activatedTreeIds)
: [];

// Collect font nodes from loaded trees
const fontNodeIds: string[] = [];
for (const tree of trees) {
for (const node of getFontNodes(tree)) {
fontNodeIds.push(node.metadata.id);
}
}

// Filter to enabled fonts
const enabledFontIds = consumer.getEnabledFontNodeIds(fontNodeIds);

const userId = activeUser.current?.id ?? null;
const posts = userId
	? await getPostsForUser(userId, { nodeIds: enabledFontIds })
	: [];

state.posts = posts;
state.trees = trees;
state.lastRefresh = new Date();
} finally {
state.loading = false;
}
},

async markRead(nodeId: string, postId: string): Promise<void> {
const userId = activeUser.current?.id;
if (!userId) return;
await persistMarkRead(userId, nodeId, postId);

const idx = state.posts.findIndex((p) => p.id === postId);
if (idx >= 0) {
state.posts[idx] = { ...state.posts[idx], read: true };
}
},

async setSaved(nodeId: string, postId: string, value: boolean): Promise<void> {
const userId = activeUser.current?.id;
if (!userId) return;
await persistSetSaved(userId, nodeId, postId, value);
const idx = state.posts.findIndex((p) => p.id === postId);
if (idx >= 0) {
state.posts[idx] = {
...state.posts[idx],
savedAt: value ? Date.now() : null,
trashedAt: value ? null : state.posts[idx].trashedAt
};
}
},

async setTrashed(nodeId: string, postId: string, value: boolean): Promise<void> {
const userId = activeUser.current?.id;
if (!userId) return;
await persistSetTrashed(userId, nodeId, postId, value);
const idx = state.posts.findIndex((p) => p.id === postId);
if (idx >= 0) {
state.posts[idx] = {
...state.posts[idx],
trashedAt: value ? Date.now() : null
};
}
},

async refreshFeed(): Promise<void> {
await feed.loadFeed();
},

addPosts(newPosts: CanonicalPost[]): void {
const existingIds = new Set(state.posts.map((p) => p.id));
const unique = newPosts.filter((p) => !existingIds.has(p.id));
if (unique.length > 0) {
state.posts = [...unique, ...state.posts];
}
}
};
