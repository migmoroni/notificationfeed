/**
 * Import Service — handles importing .notfeed.json files and simple URL lists.
 *
 * Consumers use this to:
 * 1. Import a TreeExport (.notfeed.json) → persists ContentTree (with embedded nodes) + ContentMedias
 * 2. Import simple URLs (RSS/Atom) → creates a profile tree with font nodes
 */

import type { TreeExport } from '$lib/domain/tree-export/tree-export.js';
import type { ContentTree, TreeNode, NodeBody, FontBody } from '$lib/domain/content-tree/content-tree.js';
import { generateNodeId } from '$lib/domain/content-tree/content-tree.js';
import type { ContentMedia } from '$lib/domain/content-media/content-media.js';
import { createContentTreeStore } from '$lib/persistence/content-tree.store.js';
import { createContentMediaStore } from '$lib/persistence/content-media.store.js';
import { uuidv7 } from '$lib/domain/shared/uuidv7.js';
import { t } from '$lib/i18n/t.js';
import { currentLanguage } from '$lib/i18n/store.svelte.js';

export interface ImportResult {
success: boolean;
message: string;
treeId?: string;
nodeCount?: number;
mediaIds?: string[];
}

/**
 * Parse and validate a .notfeed.json file (TreeExport format).
 */
export function parseNotfeedJson(text: string): TreeExport | null {
try {
const data = JSON.parse(text);

// Basic structural validation
if (!data.exportId || !data.tree) {
return null;
}

if (!data.tree.nodes || !data.tree.metadata) {
return null;
}

return data as TreeExport;
} catch {
return null;
}
}

/**
 * Import a TreeExport into local IndexedDB.
 * IDs are preserved. Checks for duplicate tree by metadata.id.
 */
export async function importTreeExport(treeExport: TreeExport, consumerId: string): Promise<ImportResult> {
const treeRepo = createContentTreeStore();
const mediaRepo = createContentMediaStore();

// Check for existing tree with same ID
const existingTree = await treeRepo.getById(treeExport.tree.metadata.id);
if (existingTree) {
return {
success: false,
message: t('import.already_imported')
};
}

// Persist medias
const mediaIds: string[] = [];
for (const media of treeExport.medias ?? []) {
const existing = await mediaRepo.getById(media.metadata.id);
if (!existing) {
await mediaRepo.put(media);
mediaIds.push(media.metadata.id);
}
}

// Persist tree (nodes are embedded)
await treeRepo.put(treeExport.tree);

const nodeCount = Object.keys(treeExport.tree.nodes).length;
const rootNode = Object.values(treeExport.tree.nodes).find((n) => n.role === 'creator' || n.role === 'profile');
const title = rootNode?.data.header.title ?? t('import.without_title');

return {
success: true,
message: t('import.success', { title, nodeCount: String(nodeCount), mediaCount: String(mediaIds.length) }),
treeId: treeExport.tree.metadata.id,
nodeCount,
mediaIds
};
}

/**
 * Auto-detect protocol from a URL.
 */
function detectProtocol(url: string): 'rss' | 'atom' | null {
const lower = url.toLowerCase().trim();
if (lower.includes('atom')) return 'atom';
if (lower.endsWith('.xml') || lower.endsWith('/feed') || lower.includes('rss') || lower.includes('feed')) return 'rss';
if (lower.startsWith('http://') || lower.startsWith('https://')) return 'rss';
return null;
}

/**
 * Import a list of URLs as a new profile tree with font nodes.
 * Each URL becomes a font node under the profile root.
 */
export async function importSimpleUrls(urls: string[], consumerId: string): Promise<ImportResult> {
const treeRepo = createContentTreeStore();

const validUrls = urls
.map((u) => u.trim())
.filter((u) => u && (u.startsWith('http://') || u.startsWith('https://')));

if (validUrls.length === 0) {
return {
success: false,
message: t('import.no_valid_urls')
};
}

const now = new Date();
const treeId = uuidv7();

// Create root profile node
const rootNodeId = generateNodeId(treeId, uuidv7());
const rootNode: TreeNode = {
role: 'profile',
data: {
header: {
title: t('import.tree_title', { date: now.toLocaleDateString(currentLanguage()) }),
categoryAssignments: []
},
body: { role: 'profile', links: [] }
},
metadata: { id: rootNodeId, versionSchema: 1, createdAt: now, updatedAt: now }
};

// Create font nodes for each URL
const nodes: Record<string, TreeNode> = { [rootNodeId]: rootNode };
const unsectionedIds: string[] = [];

for (const url of validUrls) {
const protocol = detectProtocol(url) ?? 'rss';

let title: string;
try {
const parsed = new URL(url);
title = parsed.hostname.replace('www.', '');
} catch {
title = url.slice(0, 50);
}

const fontBody: FontBody = { role: 'font', protocol, config: { url }, defaultEnabled: true };
const fontNodeId = generateNodeId(treeId, uuidv7());
const fontNode: TreeNode = {
role: 'font',
data: {
header: { title, categoryAssignments: [] },
body: fontBody
},
metadata: { id: fontNodeId, versionSchema: 1, createdAt: now, updatedAt: now }
};
nodes[fontNodeId] = fontNode;
unsectionedIds.push(fontNodeId);
}

// Create tree
const tree: ContentTree = {
nodes,
paths: { '/': rootNodeId, '*': unsectionedIds },
sections: [],
metadata: { id: treeId, versionSchema: 1, createdAt: now, updatedAt: now, author: consumerId }
};
await treeRepo.put(tree);

return {
success: true,
message: t('import.font_count', { count: String(unsectionedIds.length) }),
treeId: tree.metadata.id,
nodeCount: Object.keys(nodes).length
};
}
