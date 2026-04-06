/**
 * ContentTree — the single source of truth for content in Notfeed.
 *
 * A tree contains:
 *   - nodes: embedded content (replaces the old separate ContentNode entity)
 *   - paths: flat routing from "/" (root), "*" (unsectioned), "/secId" (sectioned)
 *   - sections: visual groupings (color, emoji, title)
 *   - metadata: system fields (id, timestamps, author)
 *
 * Node IDs are composite: `treeId:localUuid` — guarantees global uniqueness
 * and implicit tree membership.
 *
 * The root node (at path "/") defines the tree's identity:
 *   - role=profile    → editorial page containing fonts
 *   - role=creator    → aggregator page containing tree-link nodes
 *   - role=collection → generic aggregator containing tree-link nodes
 */

import type { CategoryAssignment } from '../shared/category-assignment.js';

// ---------------------------------------------------------------------------
// Node Roles
// ---------------------------------------------------------------------------

export type NodeRole = 'profile' | 'font' | 'creator' | 'collection' | 'tree';

// ---------------------------------------------------------------------------
// Node Header (shared across all roles)
// ---------------------------------------------------------------------------

export interface NodeHeader {
title: string;
subtitle?: string;
summary?: string;
/** Reference to a ContentMedia id */
coverMediaId?: string;
/** Emoji used as avatar (alternative to coverMediaId) */
coverEmoji?: string;
/** Reference to a ContentMedia id (primarily for root nodes) */
bannerMediaId?: string;
tags: string[];
categoryAssignments: CategoryAssignment[];
}

// ---------------------------------------------------------------------------
// Node Body variants (discriminated by role)
// ---------------------------------------------------------------------------

export type FontProtocol = 'nostr' | 'rss' | 'atom';

export interface FontNostrConfig {
relays: string[];
pubkey: string;
kinds?: number[];
}

export interface FontRssConfig {
url: string;
}

export interface FontAtomConfig {
url: string;
}

export type FontConfig = FontNostrConfig | FontRssConfig | FontAtomConfig;

/** A simple external link (website, linktree, etc.) */
export interface ExternalLink {
	title: string;
	url: string;
}

/** Body for role = 'creator' — user's aggregator page */
export interface CreatorBody {
role: 'creator';
links: ExternalLink[];
}

/** Body for role = 'profile' — editorial page with fonts */
export interface ProfileBody {
role: 'profile';
links: ExternalLink[];
}

/** Body for role = 'font' — feed source */
export interface FontBody {
role: 'font';
protocol: FontProtocol;
config: FontConfig;
defaultEnabled: boolean;
}

/** Body for role = 'tree' — cross-link to another tree */
export interface TreeLinkBody {
role: 'tree';
instanceTreeId: string;
}

/** Body for role = 'collection' — generic aggregator page */
export interface CollectionBody {
role: 'collection';
}

export type NodeBody = CreatorBody | ProfileBody | FontBody | TreeLinkBody | CollectionBody;

// ---------------------------------------------------------------------------
// TreeNode — embedded in ContentTree.nodes
// ---------------------------------------------------------------------------

export interface TreeNodeMetadata {
/** Composite: `treeId:localUuid` */
id: string;
versionSchema: number;
createdAt: Date;
updatedAt: Date;
}

export interface TreeNode {
role: NodeRole;
data: {
header: NodeHeader;
body: NodeBody;
};
metadata: TreeNodeMetadata;
}

// ---------------------------------------------------------------------------
// Tree Sections
// ---------------------------------------------------------------------------

export interface TreeSection {
id: string;
order: number;
symbol?: string;
title: string;
hideTitle: boolean;
color: string;
}

// ---------------------------------------------------------------------------
// Tree Paths
// ---------------------------------------------------------------------------

/**
 * Flat path mapping:
 *   "/" → root nodeId (string)
 *   "*" → unsectioned nodeIds (string[])
 *   any other key → section nodeIds (string[]), key = sectionId
 */
export interface TreePaths {
'/': string;
'*': string[];
[sectionId: string]: string | string[];
}

// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------

export interface ContentTreeMetadata {
id: string;
versionSchema: number;
createdAt: Date;
updatedAt: Date;
author?: string;
/** ID of a creator-type tree used to sign this tree's nodes */
authorTreeId?: string;
/** When set, the tree is soft-deleted (hidden from UI). ISO date string YYYY-MM-DD. */
removedAt?: string;
}

// ---------------------------------------------------------------------------
// ContentTree (assembled)
// ---------------------------------------------------------------------------

export interface ContentTree {
nodes: Record<string, TreeNode>;
paths: TreePaths;
sections: TreeSection[];
metadata: ContentTreeMetadata;
}

// ---------------------------------------------------------------------------
// Repository contract
// ---------------------------------------------------------------------------

export interface ContentTreeRepository {
getAll(): Promise<ContentTree[]>;
getById(id: string): Promise<ContentTree | null>;
getByIds(ids: string[]): Promise<ContentTree[]>;
getByAuthor(authorId: string): Promise<ContentTree[]>;
put(tree: ContentTree): Promise<void>;
delete(id: string): Promise<void>;
}

// ---------------------------------------------------------------------------
// Type guards
// ---------------------------------------------------------------------------

export function isCreatorNode(node: TreeNode): node is TreeNode & { data: { body: CreatorBody } } {
return node.role === 'creator';
}

export function isProfileNode(node: TreeNode): node is TreeNode & { data: { body: ProfileBody } } {
return node.role === 'profile';
}

export function isFontNode(node: TreeNode): node is TreeNode & { data: { body: FontBody } } {
return node.role === 'font';
}

export function isTreeLinkNode(node: TreeNode): node is TreeNode & { data: { body: TreeLinkBody } } {
return node.role === 'tree';
}

export function isCollectionNode(node: TreeNode): node is TreeNode & { data: { body: CollectionBody } } {
return node.role === 'collection';
}

// ---------------------------------------------------------------------------
// Utility functions
// ---------------------------------------------------------------------------

/** Extract treeId from a composite nodeId (`treeId:localUuid`) */
export function parseTreeId(compositeNodeId: string): string {
const idx = compositeNodeId.indexOf(':');
if (idx === -1) return compositeNodeId;
return compositeNodeId.substring(0, idx);
}

/** Get a node by its composite ID */
export function getNode(tree: ContentTree, nodeId: string): TreeNode | null {
return tree.nodes[nodeId] ?? null;
}

/** Get the root node of the tree */
export function getRootNode(tree: ContentTree): TreeNode | null {
const rootId = tree.paths['/'];
if (!rootId || typeof rootId !== 'string') return null;
return tree.nodes[rootId] ?? null;
}

/** Get the root node ID */
export function getRootNodeId(tree: ContentTree): string {
return tree.paths['/'] as string;
}

/** Get all node IDs in a specific path key ("*" or a sectionId) */
export function getNodesInPath(tree: ContentTree, pathKey: string): string[] {
const value = tree.paths[pathKey];
if (Array.isArray(value)) return value;
return [];
}

/** Get all node IDs in the tree (root + all paths) */
export function getAllNodeIds(tree: ContentTree): string[] {
const ids = new Set<string>();
const rootId = tree.paths['/'];
if (typeof rootId === 'string') ids.add(rootId);
for (const [key, value] of Object.entries(tree.paths)) {
if (key === '/') continue;
if (Array.isArray(value)) {
for (const id of value) ids.add(id);
}
}
return [...ids];
}

/** Get all nodes matching a role */
export function getNodesByRole(tree: ContentTree, role: NodeRole): TreeNode[] {
return Object.values(tree.nodes).filter((n) => n.role === role);
}

/** Get all font nodes in the tree */
export function getFontNodes(tree: ContentTree): TreeNode[] {
return getNodesByRole(tree, 'font');
}

/** Get the section a node belongs to (null if unsectioned or root) */
export function getNodeSection(tree: ContentTree, nodeId: string): TreeSection | null {
for (const [key, value] of Object.entries(tree.paths)) {
if (key === '/' || key === '*') continue;
if (Array.isArray(value) && value.includes(nodeId)) {
return tree.sections.find((s) => s.id === key) ?? null;
}
}
return null;
}

/** Generate a composite nodeId for a tree */
export function generateNodeId(treeId: string, localUuid: string): string {
return `${treeId}:${localUuid}`;
}
