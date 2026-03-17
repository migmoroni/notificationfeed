/**
 * Priority Resolver — resolves effective priority for a node using tree structure.
 *
 * Inheritance chain: fontNode → profileNode → creatorNode (tree root) → 3 (default)
 * Each level can define a priority or inherit (null) from its parent in the tree.
 *
 * Uses the ContentTree path structure to determine parent-child relationships.
 * Pure function module — no side effects, no state.
 */

import type { PriorityLevel } from '../user/priority-level.js';
import { DEFAULT_PRIORITY } from '../user/priority-level.js';
import type { NodeActivation } from '../user/user-consumer.js';
import type { ContentTree } from '../content-tree/content-tree.js';

/**
 * Build a lookup map from NodeActivation array for O(1) access by nodeId.
 */
export function buildNodeActivationMap(activations: NodeActivation[]): Map<string, NodeActivation> {
	const map = new Map<string, NodeActivation>();
	for (const a of activations) {
		map.set(a.nodeId, a);
	}
	return map;
}

/**
 * Resolve the parent chain for a node within a tree.
 * Returns node IDs from the given node up to the root (excluding itself).
 *
 * Example: for path "/tech/rss-feed", returns [nodeId of "/tech", nodeId of "/"]
 */
export function getAncestorNodeIds(tree: ContentTree, nodeId: string): string[] {
	// Find the path for this nodeId
	let targetPath: string | null = null;

	for (const [path, treePath] of Object.entries(tree.root.paths)) {
		const resolution = tree.root.nodes[treePath.node];
		if (resolution && resolution['/'] === nodeId) {
			targetPath = path;
			break;
		}
	}

	if (!targetPath) return [];

	const ancestors: string[] = [];

	// Walk up the path hierarchy
	let currentPath = targetPath;
	while (currentPath !== '/') {
		const lastSlash = currentPath.lastIndexOf('/');
		currentPath = lastSlash <= 0 ? '/' : currentPath.slice(0, lastSlash);

		const treePath = tree.root.paths[currentPath];
		if (treePath) {
			const resolution = tree.root.nodes[treePath.node];
			if (resolution?.['/']) {
				ancestors.push(resolution['/']);
			}
		}
	}

	return ancestors;
}

/**
 * Resolve effective priority for a single node following the tree inheritance chain.
 *
 * Walk order:
 * 1. Node's own priority (from NodeActivation)
 * 2. Parent node's priority (walking up the tree path)
 * 3. ... up to root
 * 4. DEFAULT_PRIORITY (3 = baixa)
 */
export function resolveEffectivePriority(
	nodeId: string,
	tree: ContentTree,
	activationMap: Map<string, NodeActivation>
): PriorityLevel {
	// 1. Check the node itself
	const nodeActivation = activationMap.get(nodeId);
	if (nodeActivation?.priority != null) return nodeActivation.priority;

	// 2. Walk up ancestors
	const ancestors = getAncestorNodeIds(tree, nodeId);
	for (const ancestorId of ancestors) {
		const ancestorActivation = activationMap.get(ancestorId);
		if (ancestorActivation?.priority != null) return ancestorActivation.priority;
	}

	// 3. Default
	return DEFAULT_PRIORITY;
}

/**
 * Build a complete map of nodeId → effective priority for font nodes.
 * Called once when the feed needs to be sorted.
 */
export function buildPriorityMap(
	fontNodeIds: string[],
	tree: ContentTree,
	activationMap: Map<string, NodeActivation>
): Map<string, PriorityLevel> {
	const map = new Map<string, PriorityLevel>();
	for (const nodeId of fontNodeIds) {
		map.set(nodeId, resolveEffectivePriority(nodeId, tree, activationMap));
	}
	return map;
}

/**
 * Build a priority map across multiple trees.
 * For nodes appearing in multiple trees, the highest priority (lowest number) wins.
 */
export function buildPriorityMapMultiTree(
	fontNodeIds: string[],
	trees: ContentTree[],
	activationMap: Map<string, NodeActivation>
): Map<string, PriorityLevel> {
	const map = new Map<string, PriorityLevel>();
	for (const tree of trees) {
		for (const nodeId of fontNodeIds) {
			const resolved = resolveEffectivePriority(nodeId, tree, activationMap);
			const existing = map.get(nodeId);
			if (existing == null || resolved < existing) {
				map.set(nodeId, resolved);
			}
		}
	}
	return map;
}
