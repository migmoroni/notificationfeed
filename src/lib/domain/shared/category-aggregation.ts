/**
 * Category Aggregation — merges categories upward through content trees.
 *
 * In the new model, categories propagate UPWARD through the tree structure:
 *   Font node      → only its own header.categoryAssignments
 *   Profile node   → own + union of child font node assignments
 *   Creator node   → own + union of child profile node effective assignments
 *
 * Uses ContentTree paths to determine parent-child relationships
 * instead of the old junction tables.
 */

import type { CategoryAssignment } from './category-assignment.js';
import type { CategoryTreeId } from '$lib/domain/category/category.js';
import type { ContentNode } from '../content-node/content-node.js';
import type { ContentTree } from '../content-tree/content-tree.js';
import { getChildPaths, resolveNodeId } from '../content-tree/content-tree.js';

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
 * Get effective categories for a node, aggregating upward from children in the tree.
 *
 * For a font node: just its own assignments.
 * For a profile node: own + union of child font assignments.
 * For a creator node: own + union of child effective assignments (recursive).
 */
export function getEffectiveNodeCategories(
	nodeId: string,
	tree: ContentTree,
	nodeMap: Map<string, ContentNode>,
	parentPath?: string
): CategoryAssignment[] {
	const node = nodeMap.get(nodeId);
	if (!node) return [];

	const ownAssignments = node.data.header.categoryAssignments;

	// Find the path for this nodeId in the tree
	const nodePath = findPathForNodeId(tree, nodeId, parentPath);
	if (!nodePath) return ownAssignments;

	// Get child paths and recursively aggregate
	const childPaths = getChildPaths(tree, nodePath);
	const childAssignments: CategoryAssignment[][] = [];

	for (const childPath of childPaths) {
		const childNodeId = resolveNodeId(tree, childPath);
		if (childNodeId) {
			childAssignments.push(
				getEffectiveNodeCategories(childNodeId, tree, nodeMap, nodePath)
			);
		}
	}

	return mergeAssignments(ownAssignments, ...childAssignments);
}

/**
 * Find the path in a tree that resolves to a given nodeId.
 * Optionally scoped to children of parentPath for disambiguation.
 */
function findPathForNodeId(tree: ContentTree, nodeId: string, parentPath?: string): string | null {
	for (const [path, treePath] of Object.entries(tree.root.paths)) {
		const resolution = tree.root.nodes[treePath.node];
		if (resolution && resolution['/'] === nodeId) {
			if (parentPath == null) return path;
			// Scoped: only match direct children of parentPath
			if (parentPath === '/') {
				const segments = path.split('/').filter(Boolean);
				if (segments.length >= 1) return path;
			} else if (path.startsWith(parentPath + '/')) {
				return path;
			}
		}
	}
	return null;
}
