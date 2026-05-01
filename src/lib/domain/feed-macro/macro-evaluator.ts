/**
 * Feed-macro evaluator — pure isomorphic functions that decide whether
 * a given post matches a saved macro's filters.
 *
 * Used both by the feed (when we want to verify a saved macro still
 * matches the current state) and by the notification engine, which
 * runs in the service worker and has no access to svelte stores.
 *
 * Notifications never define their own filter logic — they reference
 * a feed-macro by id and call into here. This keeps the macro's
 * semantics owned by the macro itself.
 */

import type { CanonicalPost } from '$lib/normalization/canonical-post.js';
import type { ContentTree } from '$lib/domain/content-tree/content-tree.js';
import { getFontNodes } from '$lib/domain/content-tree/content-tree.js';
import type { FeedMacro } from './feed-macro.js';
import type { CategoryTreeId } from '$lib/domain/category/category.js';

const TREE_IDS: readonly CategoryTreeId[] = [
	'subject',
	'content',
	'media',
	'region',
	'language'
] as const;

/**
 * For one node, the categories assigned per category-tree. Built
 * once from the loaded `ContentTree`s and reused across many
 * `postMatchesMacro` calls — building the index per call would be
 * O(trees · nodes) for every post.
 */
export type NodeCategoryIndex = Map<string, Map<CategoryTreeId, Set<string>>>;

/**
 * Build a lookup of `nodeId → treeId → categoryIds` from the trees
 * the user has loaded. Iterates only font nodes (the producers of
 * posts).
 */
export function buildNodeCategoryIndex(trees: ContentTree[]): NodeCategoryIndex {
	const out: NodeCategoryIndex = new Map();
	for (const tree of trees) {
		for (const fontNode of getFontNodes(tree)) {
			const perTree = new Map<CategoryTreeId, Set<string>>();
			for (const a of fontNode.data.header.categoryAssignments) {
				perTree.set(a.treeId, new Set(a.categoryIds));
			}
			out.set(fontNode.metadata.id, perTree);
		}
	}
	return out;
}

/**
 * Whether `post` matches `macro`'s saved filters.
 *
 * Matching rules — kept faithful to what the feed UI does today:
 *
 *   - **NodeIds:** when `filters.nodeIds` is non-empty the post's
 *     `nodeId` must be in the list. Empty list ⇒ no node-level
 *     restriction.
 *   - **Categories:** for each tree, every selected category must be
 *     satisfied. Each category has a per-category mode:
 *     - `'any'` (default) ⇒ the node has at least the selected
 *       category. (Multiple `'any'` selections in the same tree act
 *       as OR: the node must have at least *one* of them.)
 *     - `'all'` ⇒ the node has all `'all'`-mode selections in that
 *       tree.
 *   - **Priority** is sort-only and never filters.
 *
 * When the post's `nodeId` is missing from the index (e.g. tree not
 * loaded yet) the post is treated as not matching any category-based
 * filter — same as the feed, which only knows about loaded trees.
 */
export function postMatchesMacro(
	post: CanonicalPost,
	macro: FeedMacro,
	index: NodeCategoryIndex
): boolean {
	const f = macro.filters;

	// 1. NodeId allow-list.
	if (f.nodeIds.length > 0 && !f.nodeIds.includes(post.nodeId)) {
		return false;
	}

	// 2. Category filters per tree.
	const nodeCats = index.get(post.nodeId);
	for (const treeId of TREE_IDS) {
		const selected = f.categoryIdsByTree[treeId] ?? [];
		if (selected.length === 0) continue;

		const modes = f.categoryModesByTree?.[treeId] ?? {};
		const anySelected: string[] = [];
		const allSelected: string[] = [];
		for (const catId of selected) {
			const mode = modes[catId] ?? 'any';
			if (mode === 'all') allSelected.push(catId);
			else anySelected.push(catId);
		}

		const assigned = nodeCats?.get(treeId);
		if (anySelected.length > 0) {
			if (!assigned) return false;
			if (!anySelected.some((c) => assigned.has(c))) return false;
		}
		if (allSelected.length > 0) {
			if (!assigned) return false;
			if (!allSelected.every((c) => assigned.has(c))) return false;
		}
	}

	return true;
}
