/**
 * Feed Store — reactive state for the post feed using ContentNode model.
 *
 * Loads posts from font-nodes that the consumer has activated.
 * Priority resolution uses tree-based inheritance instead of junction tables.
 *
 * Pattern: module-level $state + exported read-only accessor + actions.
 */

import type { CanonicalPost } from '$lib/normalization/canonical-post.js';
import type { PriorityLevel } from '$lib/domain/user/priority-level.js';
import type { ContentNode } from '$lib/domain/content-node/content-node.js';
import type { ContentTree } from '$lib/domain/content-tree/content-tree.js';
import { isFontNode } from '$lib/domain/content-node/content-node.js';
import { getNodeIds } from '$lib/domain/content-tree/content-tree.js';
import { buildPriorityMapMultiTree } from '$lib/domain/shared/priority-resolver.js';
import { sortByPriority, type SortedPost } from '$lib/domain/shared/feed-sorter.js';
import { mergeAssignments } from '$lib/domain/shared/category-aggregation.js';
import { getPosts, markAsRead as persistMarkRead } from '$lib/persistence/post.store.js';
import { createContentNodeStore } from '$lib/persistence/content-node.store.js';
import { createContentTreeStore } from '$lib/persistence/content-tree.store.js';
import { consumer } from './consumer.svelte.js';

// ── Internal reactive state ────────────────────────────────────────────

interface FeedStoreState {
	posts: CanonicalPost[];
	nodes: ContentNode[];
	trees: ContentTree[];
	loading: boolean;
	lastRefresh: Date | null;
}

let state = $state<FeedStoreState>({
	posts: [],
	nodes: [],
	trees: [],
	loading: false,
	lastRefresh: null
});

const nodeRepo = createContentNodeStore();
const treeRepo = createContentTreeStore();

// ── Helpers ────────────────────────────────────────────────────────────

function getFontNodeIds(): string[] {
	return state.nodes.filter(isFontNode).map((n) => n.metadata.id);
}

function getNodeMap(): Map<string, ContentNode> {
	return new Map(state.nodes.map((n) => [n.metadata.id, n]));
}

// ── Priority pipeline ──────────────────────────────────────────────────

function computePrioritized(): SortedPost<CanonicalPost>[] {
	if (state.posts.length === 0) return [];

	const fontNodeIds = getFontNodeIds();
	const priorityMap = buildPriorityMapMultiTree(
		fontNodeIds,
		state.trees,
		consumer.activationMap
	);

	return sortByPriority(state.posts, priorityMap);
}

// ── Category filtering helpers ─────────────────────────────────────────

function nodeIdsMatchingCategories(
	treeId: 'subject' | 'content_type' | 'region',
	categoryIds: string[]
): Set<string> {
	if (categoryIds.length === 0) return new Set();

	const catSet = new Set(categoryIds);
	const nodeMap = getNodeMap();
	const matching = new Set<string>();

	for (const node of state.nodes) {
		if (!isFontNode(node)) continue;

		// Get font node's own categories + aggregate from parent nodes in trees
		let effective = node.data.header.categoryAssignments;
		for (const tree of state.trees) {
			// Check this font's parent nodes for categories
			for (const [, treePath] of Object.entries(tree.root.paths)) {
				const resolution = tree.root.nodes[treePath.node];
				if (resolution?.['/'] === node.metadata.id) continue; // skip self
				if (resolution?.['/']) {
					const parentNode = nodeMap.get(resolution['/']);
					if (parentNode) {
						effective = mergeAssignments(effective, parentNode.data.header.categoryAssignments);
					}
				}
			}
		}

		const assignment = effective.find((a) => a.treeId === treeId);
		if (assignment && assignment.categoryIds.some((cid) => catSet.has(cid))) {
			matching.add(node.metadata.id);
		}
	}
	return matching;
}

// ── Exported accessor ──────────────────────────────────────────────────

export const feed = {
	get posts() { return state.posts; },
	get nodes() { return state.nodes; },
	get trees() { return state.trees; },
	get loading() { return state.loading; },
	get lastRefresh() { return state.lastRefresh; },
	get prioritized(): SortedPost<CanonicalPost>[] { return computePrioritized(); },
	get count() { return state.posts.length; },

	/** Get the ContentNode for a given nodeId */
	getNode(nodeId: string): ContentNode | undefined {
		return state.nodes.find((n) => n.metadata.id === nodeId);
	},

	filteredByCategories(subjectIds: string[], contentTypeIds: string[], regionIds: string[] = []): SortedPost<CanonicalPost>[] {
		let sorted = computePrioritized();

		if (subjectIds.length > 0) {
			const allowed = nodeIdsMatchingCategories('subject', subjectIds);
			sorted = sorted.filter((sp) => allowed.has(sp.post.nodeId));
		}

		if (contentTypeIds.length > 0) {
			const allowed = nodeIdsMatchingCategories('content_type', contentTypeIds);
			sorted = sorted.filter((sp) => allowed.has(sp.post.nodeId));
		}

		if (regionIds.length > 0) {
			const allowed = nodeIdsMatchingCategories('region', regionIds);
			sorted = sorted.filter((sp) => allowed.has(sp.post.nodeId));
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

			// Collect all referenced node IDs from activated trees
			const allNodeIds = new Set<string>();
			for (const tree of trees) {
				for (const id of getNodeIds(tree)) {
					allNodeIds.add(id);
				}
			}

			// Load the referenced nodes
			const nodes = allNodeIds.size > 0
				? await nodeRepo.getByIds([...allNodeIds])
				: [];

			// Load posts for enabled font nodes
			const fontNodeIds = nodes.filter(isFontNode).map((n) => n.metadata.id);
			const enabledFontIds = consumer.getEnabledFontNodeIds(fontNodeIds);

			const postArrays = await Promise.all(
				enabledFontIds.map((nodeId) => getPosts({ nodeId }))
			);
			const posts = postArrays.flat();

			state.posts = posts;
			state.nodes = nodes;
			state.trees = trees;
			state.lastRefresh = new Date();
		} finally {
			state.loading = false;
		}
	},

	async markRead(nodeId: string, postId: string): Promise<void> {
		await persistMarkRead(nodeId, postId);

		const idx = state.posts.findIndex((p) => p.id === postId);
		if (idx >= 0) {
			state.posts[idx] = { ...state.posts[idx], read: true };
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
