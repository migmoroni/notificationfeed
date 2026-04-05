/**
 * Priority Resolver — resolves effective priority for a node using tree structure.
 *
 * Inheritance chain: fontNode → tree root → 3 (default)
 * In the flat path model, non-root nodes inherit from the root node
 * if they have no own priority set.
 *
 * Pure function module — no side effects, no state.
 */

import type { PriorityLevel } from '../user/priority-level.js';
import { DEFAULT_PRIORITY } from '../user/priority-level.js';
import type { NodeActivation } from '../user/user-consumer.js';
import type { ContentTree } from '../content-tree/content-tree.js';
import { getRootNodeId } from '../content-tree/content-tree.js';

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
 * Resolve effective priority for a single node following the tree inheritance chain.
 *
 * Walk order:
 * 1. Node's own priority (from NodeActivation)
 * 2. Root node's priority (tree root)
 * 3. DEFAULT_PRIORITY (3 = baixa)
 */
export function resolveEffectivePriority(
nodeId: string,
tree: ContentTree,
activationMap: Map<string, NodeActivation>
): PriorityLevel {
// 1. Check the node itself
const nodeActivation = activationMap.get(nodeId);
if (nodeActivation?.priority != null) return nodeActivation.priority;

// 2. Check root node
const rootId = getRootNodeId(tree);
if (rootId && rootId !== nodeId) {
const rootActivation = activationMap.get(rootId);
if (rootActivation?.priority != null) return rootActivation.priority;
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
// Only resolve if this node actually belongs to this tree
if (!(nodeId in tree.nodes)) continue;
const resolved = resolveEffectivePriority(nodeId, tree, activationMap);
const existing = map.get(nodeId);
if (existing == null || resolved < existing) {
map.set(nodeId, resolved);
}
}
}
return map;
}
