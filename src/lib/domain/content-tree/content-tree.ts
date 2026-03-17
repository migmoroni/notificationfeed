/**
 * ContentTree — organizes content nodes into a navigable structure.
 *
 * A tree defines:
 *   - sections: optional visual groupings (color, emoji, title)
 *   - root.paths: named paths mapping to logical node references
 *   - root.nodes: resolution map from logical names to actual node IDs
 *
 * Navigation flow: path → logicalName → nodeId → ContentNode
 *
 * Example:
 *   paths: { "/": { node: "root" }, "/tech": { node: "tech-profile", section: "s1" } }
 *   nodes: { "root": { "/": "node-id-1" }, "tech-profile": { "/": "node-id-2" } }
 *
 * This structure allows a tree to organize nodes from any creator
 * into a browsable hierarchy, with sections for visual grouping.
 */

// ---------------------------------------------------------------------------
// Sections
// ---------------------------------------------------------------------------

export interface TreeSection {
	id: string;
	order: number;
	/** Emoji icon */
	symbol?: string;
	title: string;
	hideTitle: boolean;
	color: string;
}

// ---------------------------------------------------------------------------
// Path & Node resolution
// ---------------------------------------------------------------------------

export interface TreePath {
	/** Logical node name (key in root.nodes) */
	node: string;
	/** Reference to a TreeSection.id (null = no section) */
	section?: string | null;
}

/** Each logical name maps to a resolution entry: { "/": actualNodeId } */
export interface TreeNodeResolution {
	'/': string;
}

export interface ContentTreeRoot {
	/** Named paths in the tree (e.g., "/", "/tech", "/tech/rss-feed") */
	paths: Record<string, TreePath>;
	/** Resolution map: logicalName → { "/": nodeId } */
	nodes: Record<string, TreeNodeResolution>;
}

// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------

export interface ContentTreeMetadata {
	id: string;
	versionSchema: number;
	createdAt: Date;
	updatedAt: Date;
	/** ID of the creator user (if known) */
	author?: string;
}

// ---------------------------------------------------------------------------
// ContentTree (assembled)
// ---------------------------------------------------------------------------

export interface ContentTree {
	sections: TreeSection[];
	root: ContentTreeRoot;
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
// Utility functions
// ---------------------------------------------------------------------------

/**
 * Resolve a path to its actual node ID.
 * Returns null if the path or logical node is not found.
 */
export function resolveNodeId(tree: ContentTree, path: string): string | null {
	const treePath = tree.root.paths[path];
	if (!treePath) return null;

	const resolution = tree.root.nodes[treePath.node];
	if (!resolution) return null;

	return resolution['/'] ?? null;
}

/**
 * Get all unique node IDs referenced in the tree.
 */
export function getNodeIds(tree: ContentTree): string[] {
	const ids = new Set<string>();
	for (const resolution of Object.values(tree.root.nodes)) {
		if (resolution['/']) {
			ids.add(resolution['/']);
		}
	}
	return [...ids];
}

/**
 * Get the root node ID of the tree (the node at path "/").
 */
export function getRootNodeId(tree: ContentTree): string | null {
	return resolveNodeId(tree, '/');
}

/**
 * Get all paths that are direct children of a given parent path.
 *
 * Example: getChildPaths(tree, "/") returns ["/tech", "/news"]
 *          getChildPaths(tree, "/tech") returns ["/tech/rss", "/tech/nostr"]
 */
export function getChildPaths(tree: ContentTree, parentPath: string): string[] {
	const normalized = parentPath === '/' ? '/' : parentPath;
	const results: string[] = [];

	for (const path of Object.keys(tree.root.paths)) {
		if (path === normalized) continue;

		if (normalized === '/') {
			// Direct children of root: single segment after /
			const segments = path.split('/').filter(Boolean);
			if (segments.length === 1) results.push(path);
		} else {
			// Direct children: starts with parent + "/" and has exactly one more segment
			if (path.startsWith(normalized + '/')) {
				const remainder = path.slice(normalized.length + 1);
				if (remainder && !remainder.includes('/')) {
					results.push(path);
				}
			}
		}
	}

	return results;
}

/**
 * Get the section for a given path (if any).
 */
export function getPathSection(tree: ContentTree, path: string): TreeSection | null {
	const treePath = tree.root.paths[path];
	if (!treePath?.section) return null;
	return tree.sections.find((s) => s.id === treePath.section) ?? null;
}
