/**
 * TreeExport — self-contained JSON snapshot of a ContentTree for offline sharing.
 *
 * Replaces the old PageExport format. Contains the full tree structure,
 * all referenced nodes, and all referenced media (with embedded data URLs).
 *
 * IDs are preserved on import (deduplication by tree metadata.id or exportId).
 * The exportId is stable across re-exports to allow update-or-duplicate on reimport.
 *
 * Does NOT contain: user data, posts, consumer state, Nostr sync data.
 */

import type { ContentTree } from '../content-tree/content-tree.js';
import type { ContentNode } from '../content-node/content-node.js';
import type { ContentMedia } from '../content-media/content-media.js';

/** File extension for exported trees */
export const TREE_EXPORT_EXTENSION = '.notfeed.json';

/** MIME type for export files */
export const TREE_EXPORT_MIME = 'application/json';

/** The exported file structure */
export interface TreeExport {
	/** Stable identifier — generated once on first export, preserved on re-exports */
	exportId: string;

	/** Incremented on every re-export */
	version: number;

	/** When this export was generated */
	exportedAt: Date;

	/** Creator's display name (informational, for import UI) */
	creatorDisplayName: string;

	/** The full tree structure (sections, paths, node resolution) */
	tree: ContentTree;

	/** All content nodes referenced by this tree */
	nodes: ContentNode[];

	/** All media referenced by nodes in this tree (with embedded data URLs) */
	medias: ContentMedia[];
}
