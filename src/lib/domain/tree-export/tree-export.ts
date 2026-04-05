/**
 * TreeExport — self-contained JSON snapshot of a ContentTree for offline sharing.
 *
 * Contains the full tree structure (with embedded nodes) and all referenced media.
 * IDs are preserved on import (deduplication by tree metadata.id or exportId).
 * The exportId is stable across re-exports to allow update-or-duplicate on reimport.
 *
 * Does NOT contain: user data, posts, consumer state, Nostr sync data.
 */

import type { ContentTree } from '../content-tree/content-tree.js';
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

/** The full tree structure (sections, paths, nodes, metadata) */
tree: ContentTree;

/** All media referenced by nodes in this tree (with embedded data URLs) */
medias: ContentMedia[];
}
