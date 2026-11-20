/**
 * TreePublication — the published snapshot of a ContentTree.
 *
 * Stored separately from ContentTree to avoid bloating the tree record
 * with a potentially large TreeExport blob. One record per tree (latest only).
 */

import type { TreeExport } from './tree-export.js';

export interface TreePublication {
	/** References ContentTree.metadata.id — one publication per tree */
	treeId: string;

	/** Publication version (incremented on each publish) */
	version: number;

	/** The immutable snapshot */
	snapshot: TreeExport;

	/** When this version was published */
	publishedAt: Date;
}

export interface TreePublicationRepository {
	getByTreeId(treeId: string): Promise<TreePublication | null>;
	save(publication: TreePublication): Promise<void>;
	delete(treeId: string): Promise<void>;
}
