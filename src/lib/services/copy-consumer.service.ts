/**
 * Copy-from-Consumer Service — deep copies a tree with embedded nodes into creator's ownership.
 *
 * Creates a new ContentTree with new IDs and the creator's author.
 * Media referenced by nodes is also duplicated.
 */

import type { ContentTree, TreeNode, NodeHeader, NodeBody } from '$lib/domain/content-tree/content-tree.js';
import { generateNodeId } from '$lib/domain/content-tree/content-tree.js';
import type { ContentMedia } from '$lib/domain/content-media/content-media.js';
import { createContentTreeStore } from '$lib/persistence/content-tree.store.js';
import { createContentMediaStore } from '$lib/persistence/content-media.store.js';
import { uuidv7 } from '$lib/domain/shared/uuidv7.js';

const treeRepo = createContentTreeStore();
const mediaRepo = createContentMediaStore();

export interface CopyResult {
tree: ContentTree;
medias: ContentMedia[];
}

/**
 * Deep-copy a tree, reassigning authorship and generating new IDs.
 * Also duplicates any referenced media (cover, banner).
 */
export async function copyTreeToCreator(
originalTree: ContentTree,
authorId: string
): Promise<CopyResult> {
const now = new Date();
const newTreeId = uuidv7();
const copiedMedias: ContentMedia[] = [];

// Build a mapping from old nodeId → new nodeId
const idMap = new Map<string, string>();
for (const oldNodeId of Object.keys(originalTree.nodes)) {
idMap.set(oldNodeId, generateNodeId(newTreeId, uuidv7()));
}

// Deep-copy nodes with new IDs
const newNodes: Record<string, TreeNode> = {};
for (const [oldNodeId, original] of Object.entries(originalTree.nodes)) {
const newNodeId = idMap.get(oldNodeId)!;

// Duplicate referenced media
const headerPatch: Partial<NodeHeader> = {};

if (original.data.header.coverMediaId) {
const media = await mediaRepo.getById(original.data.header.coverMediaId);
if (media) {
const newMediaId = uuidv7();
const copy: ContentMedia = {
...media,
metadata: { ...media.metadata, id: newMediaId, author: authorId, createdAt: now, updatedAt: now }
};
await mediaRepo.put(copy);
copiedMedias.push(copy);
headerPatch.coverMediaId = newMediaId;
}
}

if (original.data.header.coverEmoji) {
headerPatch.coverEmoji = original.data.header.coverEmoji;
}

if (original.data.header.bannerMediaId) {
const media = await mediaRepo.getById(original.data.header.bannerMediaId);
if (media) {
const newMediaId = uuidv7();
const copy: ContentMedia = {
...media,
metadata: { ...media.metadata, id: newMediaId, author: authorId, createdAt: now, updatedAt: now }
};
await mediaRepo.put(copy);
copiedMedias.push(copy);
headerPatch.bannerMediaId = newMediaId;
}
}

const newNode: TreeNode = {
role: original.role,
data: {
header: {
...original.data.header,
...headerPatch,
categoryAssignments: original.data.header.categoryAssignments.map((a) => ({
treeId: a.treeId,
categoryIds: [...a.categoryIds]
}))
},
body: { ...original.data.body } as NodeBody
},
metadata: {
id: newNodeId,
versionSchema: original.metadata.versionSchema,
createdAt: now,
updatedAt: now
}
};

newNodes[newNodeId] = newNode;
}

// Remap paths
const remapId = (id: string): string => idMap.get(id) ?? id;

const newPaths: Record<string, string | string[]> = {};
for (const [key, value] of Object.entries(originalTree.paths)) {
if (key === '/') {
newPaths['/'] = remapId(value as string);
} else if (Array.isArray(value)) {
newPaths[key] = value.map(remapId);
}
}

const newTree: ContentTree = {
nodes: newNodes,
paths: newPaths as ContentTree['paths'],
sections: originalTree.sections.map((s) => ({ ...s })),
metadata: {
id: newTreeId,
versionSchema: originalTree.metadata.versionSchema,
createdAt: now,
updatedAt: now,
author: authorId
}
};

await treeRepo.put(newTree);
return { tree: newTree, medias: copiedMedias };
}
