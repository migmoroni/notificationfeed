/**
 * Export Service — builds and downloads .notfeed.json files using TreeExport format.
 *
 * Only exports from published snapshots. The tree must be published first.
 */

import type { TreeExport } from '$lib/domain/tree-export/tree-export.js';
import { TREE_EXPORT_EXTENSION, TREE_EXPORT_MIME } from '$lib/domain/tree-export/tree-export.js';
import { createTreePublicationStore } from '$lib/persistence/tree-publication.store.js';
import { getRootNode } from '$lib/domain/content-tree/content-tree.js';

/**
 * Download a TreeExport as a .notfeed.json file.
 */
export function downloadTreeExport(treeExport: TreeExport): void {
const json = JSON.stringify(treeExport, null, 2);
const blob = new Blob([json], { type: TREE_EXPORT_MIME });
const url = URL.createObjectURL(blob);

const rootNode = getRootNode(treeExport.tree);
const title = rootNode?.data.header.title ?? 'export';
const slug = title
.toLowerCase()
.replace(/[^a-z0-9]+/g, '-')
.replace(/(^-|-$)/g, '');

const filename = `${slug || 'tree'}-v${treeExport.version}${TREE_EXPORT_EXTENSION}`;

const a = document.createElement('a');
a.href = url;
a.download = filename;
document.body.appendChild(a);
a.click();
document.body.removeChild(a);
URL.revokeObjectURL(url);
}

/**
 * Export a tree: uses its published snapshot to trigger a download.
 * Throws if the tree is not published.
 */
export async function exportTree(treeId: string): Promise<void> {
const pubRepo = createTreePublicationStore();
const publication = await pubRepo.getByTreeId(treeId);

if (!publication) {
throw new Error('A árvore precisa ser publicada antes de exportar.');
}

downloadTreeExport(publication.snapshot);
}
