/**
 * Creator Store — reactive state for the active UserCreator.
 *
 * Manages ContentTrees (with embedded nodes) and ContentMedias.
 * Nodes live inside tree.nodes and are addressed by composite IDs (treeId:localUuid).
 *
 * Pattern: module-level $state + exported read-only accessor + init() lifecycle.
 */

import type { UserCreator } from '$lib/domain/user/user-creator.js';
import type {
ContentTree,
TreeNode,
TreeSection,
TreePaths,
NodeHeader,
NodeBody,
NodeRole
} from '$lib/domain/content-tree/content-tree.js';
import {
getAllNodeIds,
getRootNode as domainGetRootNode,
getRootNodeId,
getNode,
generateNodeId,
getNodesByRole as domainGetNodesByRole
} from '$lib/domain/content-tree/content-tree.js';
import type { ContentMedia } from '$lib/domain/content-media/content-media.js';
import type { TreeExport } from '$lib/domain/tree-export/tree-export.js';
import type { TreePublication } from '$lib/domain/tree-export/tree-publication.js';
import { createContentTreeStore } from '$lib/persistence/content-tree.store.js';
import { createContentMediaStore } from '$lib/persistence/content-media.store.js';
import { createTreePublicationStore } from '$lib/persistence/tree-publication.store.js';
import { processAndCreateMedia, replaceMediaFile, deleteMedia as deleteMediaService } from '$lib/services/media.service.js';
import { uuidv7 } from '$lib/domain/shared/uuidv7.js';
import type { ImageSlot } from '$lib/domain/shared/image-asset.js';

// ── Internal reactive state ────────────────────────────────────────────

interface CreatorStoreState {
user: UserCreator | null;
trees: ContentTree[];
medias: ContentMedia[];
loading: boolean;
}

let state = $state<CreatorStoreState>({
user: null,
trees: [],
medias: [],
loading: false
});

const treeRepo = createContentTreeStore();
const mediaRepo = createContentMediaStore();
const pubRepo = createTreePublicationStore();

// ── Helpers ────────────────────────────────────────────────────────────

async function loadCreatorData(userId: string): Promise<void> {
const [trees, medias] = await Promise.all([
treeRepo.getByAuthor(userId),
mediaRepo.getByAuthor(userId)
]);

state.trees = trees;
state.medias = medias;
}

function findTree(treeId: string): ContentTree {
const tree = state.trees.find((t) => t.metadata.id === treeId);
if (!tree) throw new Error(`Tree not found: ${treeId}`);
return tree;
}

function findNodeInTree(tree: ContentTree, nodeId: string): TreeNode {
const node = getNode(tree, nodeId);
if (!node) throw new Error(`Node not found: ${nodeId}`);
return node;
}

/** Persist an updated tree and replace it in state */
async function persistTree(updated: ContentTree): Promise<void> {
await treeRepo.put(updated);
state.trees = state.trees.map((t) =>
t.metadata.id === updated.metadata.id ? updated : t
);
}

// ── Exported accessor ──────────────────────────────────────────────────

export const creator = {
// ── Getters ──────────────────────────────────────────────────────

get user() { return state.user; },
get trees() { return state.trees; },
get medias() { return state.medias; },
get loading() { return state.loading; },
get isReady() { return state.user !== null && !state.loading; },

// ── Lifecycle ────────────────────────────────────────────────────

async init(user: UserCreator): Promise<void> {
state.user = user;
state.loading = true;
try {
await loadCreatorData(user.id);
} finally {
state.loading = false;
}
},

async reload(): Promise<void> {
if (!state.user) return;
state.loading = true;
try {
await loadCreatorData(state.user.id);
} finally {
state.loading = false;
}
},

// ── Media CRUD ──────────────────────────────────────────────────

async createMedia(file: File, slot: ImageSlot): Promise<ContentMedia> {
const media = await processAndCreateMedia(file, slot, state.user?.id);
state.medias = [...state.medias, media];
return media;
},

async updateMedia(mediaId: string, file: File, slot: ImageSlot): Promise<ContentMedia> {
const updated = await replaceMediaFile(mediaId, file, slot);
state.medias = state.medias.map((m) => (m.metadata.id === mediaId ? updated : m));
return updated;
},

async deleteMedia(mediaId: string): Promise<void> {
await deleteMediaService(mediaId);
state.medias = state.medias.filter((m) => m.metadata.id !== mediaId);
},

getMediaById(mediaId: string): ContentMedia | null {
return state.medias.find((m) => m.metadata.id === mediaId) ?? null;
},

// ── Node CRUD (nodes live inside trees) ─────────────────────────

/**
 * Create a node inside a tree.
 * Generates a composite nodeId, adds to tree.nodes and optionally to a path.
 * @param path - "*" for unsectioned, or a sectionId to place in a section.
 *               Omit (or undefined) to add to unsectioned.
 */
async createNode(
treeId: string,
role: NodeRole,
header: NodeHeader,
body: NodeBody,
path?: string
): Promise<{ tree: ContentTree; nodeId: string }> {
const tree = findTree(treeId);
const now = new Date();
const nodeId = generateNodeId(treeId, uuidv7());

const node: TreeNode = {
role,
data: { header, body },
metadata: {
id: nodeId,
versionSchema: 1,
createdAt: now,
updatedAt: now
}
};

const targetPath = path ?? '*';
const updatedPaths = { ...tree.paths };

// Add to the appropriate path array
if (targetPath !== '/') {
const existing = updatedPaths[targetPath];
if (Array.isArray(existing)) {
updatedPaths[targetPath] = [...existing, nodeId];
} else {
updatedPaths[targetPath] = [nodeId];
}
}

const updated: ContentTree = {
...tree,
nodes: { ...tree.nodes, [nodeId]: node },
paths: updatedPaths,
metadata: { ...tree.metadata, updatedAt: now }
};

await persistTree(updated);
return { tree: updated, nodeId };
},

async updateNodeHeader(treeId: string, nodeId: string, header: NodeHeader): Promise<ContentTree> {
const tree = findTree(treeId);
const node = findNodeInTree(tree, nodeId);

const updatedNode: TreeNode = {
...node,
data: { ...node.data, header },
metadata: { ...node.metadata, updatedAt: new Date() }
};

const updated: ContentTree = {
...tree,
nodes: { ...tree.nodes, [nodeId]: updatedNode },
metadata: { ...tree.metadata, updatedAt: new Date() }
};

await persistTree(updated);
return updated;
},

async updateNodeBody(treeId: string, nodeId: string, body: NodeBody): Promise<ContentTree> {
const tree = findTree(treeId);
const node = findNodeInTree(tree, nodeId);

const updatedNode: TreeNode = {
...node,
data: { ...node.data, body },
metadata: { ...node.metadata, updatedAt: new Date() }
};

const updated: ContentTree = {
...tree,
nodes: { ...tree.nodes, [nodeId]: updatedNode },
metadata: { ...tree.metadata, updatedAt: new Date() }
};

await persistTree(updated);
return updated;
},

async deleteNode(treeId: string, nodeId: string): Promise<ContentTree> {
const tree = findTree(treeId);

// Remove from nodes
const updatedNodes = { ...tree.nodes };
delete updatedNodes[nodeId];

// Remove from all path arrays
const updatedPaths = { ...tree.paths };
for (const [key, value] of Object.entries(updatedPaths)) {
if (key === '/') continue;
if (Array.isArray(value)) {
const filtered = value.filter((id) => id !== nodeId);
updatedPaths[key] = filtered;
}
}

const updated: ContentTree = {
...tree,
nodes: updatedNodes,
paths: updatedPaths,
metadata: { ...tree.metadata, updatedAt: new Date() }
};

await persistTree(updated);
return updated;
},

getNodesByRole(treeId: string, role: NodeRole): TreeNode[] {
const tree = findTree(treeId);
return domainGetNodesByRole(tree, role);
},

// ── Tree CRUD ───────────────────────────────────────────────────

/**
 * Create a new tree with a root node.
 * @param rootRole — the role for the root node (e.g. 'creator', 'profile', 'collection')
 * @param title — display title for the root node
 */
async createTree(rootRole: NodeRole, title?: string): Promise<ContentTree> {
const now = new Date();
const treeId = uuidv7();
const rootNodeId = generateNodeId(treeId, uuidv7());

const rootNode: TreeNode = {
role: rootRole,
data: {
header: {
title: title ?? 'Nova Página',
tags: [],
categoryAssignments: []
},
body: { role: rootRole } as NodeBody
},
metadata: {
id: rootNodeId,
versionSchema: 1,
createdAt: now,
updatedAt: now
}
};

const tree: ContentTree = {
nodes: { [rootNodeId]: rootNode },
paths: { '/': rootNodeId, '*': [] },
sections: [],
metadata: {
id: treeId,
versionSchema: 1,
createdAt: now,
updatedAt: now,
author: state.user?.id
}
};

await treeRepo.put(tree);
state.trees = [...state.trees, tree];
return tree;
},

async deleteTree(treeId: string): Promise<void> {
await treeRepo.delete(treeId);
await pubRepo.delete(treeId);
state.trees = state.trees.filter((t) => t.metadata.id !== treeId);
},

// ── Node path management ────────────────────────────────────────

/**
 * Move a node from one path to another (e.g. from unsectioned to a section).
 */
async moveNodeToPath(treeId: string, nodeId: string, fromPath: string, toPath: string): Promise<ContentTree> {
const tree = findTree(treeId);
const updatedPaths = { ...tree.paths };

// Remove from source
const sourceArr = updatedPaths[fromPath];
if (Array.isArray(sourceArr)) {
updatedPaths[fromPath] = sourceArr.filter((id) => id !== nodeId);
}

// Add to target
const targetArr = updatedPaths[toPath];
if (Array.isArray(targetArr)) {
updatedPaths[toPath] = [...targetArr, nodeId];
} else {
updatedPaths[toPath] = [nodeId];
}

const updated: ContentTree = {
...tree,
paths: updatedPaths,
metadata: { ...tree.metadata, updatedAt: new Date() }
};

await persistTree(updated);
return updated;
},

// ── Tree sections ───────────────────────────────────────────────

async addSection(treeId: string, section: Omit<TreeSection, 'id'>): Promise<ContentTree> {
const tree = findTree(treeId);
const sectionId = uuidv7();
const newSection: TreeSection = { ...section, id: sectionId };

const updated: ContentTree = {
...tree,
paths: { ...tree.paths, [sectionId]: [] },
sections: [...tree.sections, newSection],
metadata: { ...tree.metadata, updatedAt: new Date() }
};

await persistTree(updated);
return updated;
},

async updateSection(treeId: string, sectionId: string, data: Partial<Omit<TreeSection, 'id'>>): Promise<ContentTree> {
const tree = findTree(treeId);

const updated: ContentTree = {
...tree,
sections: tree.sections.map((s) =>
s.id === sectionId ? { ...s, ...data } : s
),
metadata: { ...tree.metadata, updatedAt: new Date() }
};

await persistTree(updated);
return updated;
},

async deleteSection(treeId: string, sectionId: string): Promise<ContentTree> {
const tree = findTree(treeId);

// Move nodes from deleted section to unsectioned
const sectionNodes = (tree.paths as Record<string, string | string[]>)[sectionId];
const unsectioned = tree.paths['*'] ?? [];
const movedToUnsectioned = Array.isArray(sectionNodes)
? [...(Array.isArray(unsectioned) ? unsectioned : []), ...sectionNodes]
: (Array.isArray(unsectioned) ? unsectioned : []);

const updatedPaths: TreePaths = { ...tree.paths, '*': movedToUnsectioned };
delete (updatedPaths as Record<string, unknown>)[sectionId];

const updated: ContentTree = {
...tree,
sections: tree.sections.filter((s) => s.id !== sectionId),
paths: updatedPaths,
metadata: { ...tree.metadata, updatedAt: new Date() }
};

await persistTree(updated);
return updated;
},

async reorderSections(treeId: string, orderedIds: string[]): Promise<ContentTree> {
const tree = findTree(treeId);

const updated: ContentTree = {
...tree,
sections: orderedIds.map((id, i) => {
const section = tree.sections.find((s) => s.id === id);
if (!section) throw new Error(`Section not found: ${id}`);
return { ...section, order: i };
}),
metadata: { ...tree.metadata, updatedAt: new Date() }
};

await persistTree(updated);
return updated;
},

// ── Publishing ──────────────────────────────────────────────────

async publishTree(treeId: string, displayName?: string): Promise<TreeExport> {
const tree = findTree(treeId);

// Collect all media referenced by nodes in this tree
const mediaIds = new Set<string>();
for (const node of Object.values(tree.nodes)) {
if (node.data.header.coverMediaId) mediaIds.add(node.data.header.coverMediaId);
if (node.data.header.bannerMediaId) mediaIds.add(node.data.header.bannerMediaId);
}
const medias = state.medias.filter((m) => mediaIds.has(m.metadata.id));

// Get existing publication for version increment
const existing = await pubRepo.getByTreeId(treeId);
const version = (existing?.version ?? 0) + 1;

const treeExport: TreeExport = {
exportId: existing?.snapshot.exportId ?? uuidv7(),
version,
exportedAt: new Date(),
creatorDisplayName: displayName ?? state.user?.displayName ?? '',
tree,
medias
};

const publication: TreePublication = {
treeId,
version,
snapshot: treeExport,
publishedAt: new Date()
};

await pubRepo.save(publication);
return treeExport;
},

async getPublication(treeId: string): Promise<TreePublication | null> {
return pubRepo.getByTreeId(treeId);
},

// ── Derived helpers ─────────────────────────────────────────────

getTreeNodes(treeId: string): TreeNode[] {
const tree = findTree(treeId);
return Object.values(tree.nodes);
},

getRootNode(treeId: string): TreeNode | null {
const tree = findTree(treeId);
return domainGetRootNode(tree);
},

getNodeById(treeId: string, nodeId: string): TreeNode | null {
const tree = findTree(treeId);
return getNode(tree, nodeId);
},

/** Get all node IDs for a given tree */
getAllNodeIds(treeId: string): string[] {
const tree = findTree(treeId);
return getAllNodeIds(tree);
},

/** Get profile count for a tree (non-root nodes with role='profile') */
getProfileCount(treeId: string): number {
const tree = findTree(treeId);
return Object.values(tree.nodes).filter(
(n) => n.role === 'profile' && n.metadata.id !== getRootNodeId(tree)
).length;
}
};
