/**
 * Category Aggregation — merges categories upward through content trees.
 *
 * In the unified model, categories propagate UPWARD:
 *   Font node (leaf)  → only its own header.categoryAssignments
 *   Root node          → own + union of all child node assignments
 *
 * Uses ContentTree.nodes directly (embedded nodes) instead of
 * separate ContentNode lookups.
 */

import type { CategoryAssignment } from './category-assignment.js';
import type { CategoryTreeId } from '$lib/domain/category/category.js';
import type { ContentTree, TreeNode } from '../content-tree/content-tree.js';
import { getRootNodeId } from '../content-tree/content-tree.js';

/**
 * Merge multiple lists of CategoryAssignment into one.
 * Within each treeId, categoryIds are unioned and deduplicated.
 */
export function mergeAssignments(...sources: CategoryAssignment[][]): CategoryAssignment[] {
const byTree = new Map<CategoryTreeId, Set<string>>();

for (const assignments of sources) {
for (const a of assignments) {
const existing = byTree.get(a.treeId);
if (existing) {
for (const id of a.categoryIds) existing.add(id);
} else {
byTree.set(a.treeId, new Set(a.categoryIds));
}
}
}

const result: CategoryAssignment[] = [];
for (const [treeId, ids] of byTree) {
if (ids.size > 0) {
result.push({ treeId, categoryIds: [...ids] });
}
}
return result;
}

/**
 * Get effective categories for a node, aggregating from its tree context.
 *
 * For a non-root node: just its own assignments.
 * For the root node: own + union of all child node assignments in the tree.
 */
export function getEffectiveNodeCategories(
nodeId: string,
tree: ContentTree
): CategoryAssignment[] {
const node = tree.nodes[nodeId];
if (!node) return [];

const ownAssignments = node.data.header.categoryAssignments;
const rootId = getRootNodeId(tree);

// Non-root nodes just return their own assignments
if (nodeId !== rootId) return ownAssignments;

// Root node: aggregate from all children
const childAssignments: CategoryAssignment[][] = [];
for (const [id, childNode] of Object.entries(tree.nodes)) {
if (id === rootId) continue;
childAssignments.push(childNode.data.header.categoryAssignments);
}

return mergeAssignments(ownAssignments, ...childAssignments);
}
