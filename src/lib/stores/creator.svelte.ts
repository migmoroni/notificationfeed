/**
 * Creator Store — reactive state for the active UserCreator.
 *
 * Manages ContentNodes, ContentTrees, ContentMedias owned by the current creator.
 * Replaces the old creator.svelte.ts that used CreatorPage/Profile/Font/Section model.
 *
 * Pattern: module-level $state + exported read-only accessor + init() lifecycle.
 */

import type { UserCreator } from '$lib/domain/user/user-creator.js';
import type { ContentNode, ContentNodeHeader, ContentNodeBody, NodeRole } from '$lib/domain/content-node/content-node.js';
import type { ContentTree, TreeSection, TreePath } from '$lib/domain/content-tree/content-tree.js';
import { getNodeIds, resolveNodeId, getRootNodeId } from '$lib/domain/content-tree/content-tree.js';
import type { ContentMedia } from '$lib/domain/content-media/content-media.js';
import type { TreeExport } from '$lib/domain/tree-export/tree-export.js';
import type { TreePublication } from '$lib/domain/tree-export/tree-publication.js';
import { createContentNodeStore } from '$lib/persistence/content-node.store.js';
import { createContentTreeStore } from '$lib/persistence/content-tree.store.js';
import { createContentMediaStore } from '$lib/persistence/content-media.store.js';
import { createTreePublicationStore } from '$lib/persistence/tree-publication.store.js';
import { processAndCreateMedia, replaceMediaFile, deleteMedia as deleteMediaService } from '$lib/services/media.service.js';
import { uuidv7 } from '$lib/domain/shared/uuidv7.js';
import type { ImageSlot } from '$lib/domain/shared/image-asset.js';

// ── Internal reactive state ────────────────────────────────────────────

interface CreatorStoreState {
	user: UserCreator | null;
	nodes: ContentNode[];
	trees: ContentTree[];
	medias: ContentMedia[];
	loading: boolean;
}

let state = $state<CreatorStoreState>({
	user: null,
	nodes: [],
	trees: [],
	medias: [],
	loading: false
});

const nodeRepo = createContentNodeStore();
const treeRepo = createContentTreeStore();
const mediaRepo = createContentMediaStore();
const pubRepo = createTreePublicationStore();

// ── Helpers ────────────────────────────────────────────────────────────

async function loadCreatorData(userId: string): Promise<void> {
	const [nodes, trees, medias] = await Promise.all([
		nodeRepo.getByAuthor(userId),
		treeRepo.getByAuthor(userId),
		mediaRepo.getByAuthor(userId)
	]);

	state.nodes = nodes;
	state.trees = trees;
	state.medias = medias;
}

function findTree(treeId: string): ContentTree {
	const tree = state.trees.find((t) => t.metadata.id === treeId);
	if (!tree) throw new Error(`Tree not found: ${treeId}`);
	return tree;
}

function findNode(nodeId: string): ContentNode {
	const node = state.nodes.find((n) => n.metadata.id === nodeId);
	if (!node) throw new Error(`Node not found: ${nodeId}`);
	return node;
}

/** Generate a logical name from a node's title for use in tree paths */
function toLogicalName(title: string): string {
	return title
		.toLowerCase()
		.trim()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-|-$/g, '') || 'node';
}

/** Ensure a logical name is unique within a tree */
function uniqueLogicalName(tree: ContentTree, baseName: string): string {
	if (!(baseName in tree.root.nodes)) return baseName;
	let i = 2;
	while (`${baseName}-${i}` in tree.root.nodes) i++;
	return `${baseName}-${i}`;
}

// ── Exported accessor ──────────────────────────────────────────────────

export const creator = {
	// ── Getters ──────────────────────────────────────────────────────

	get user() { return state.user; },
	get nodes() { return state.nodes; },
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

	// ── Node CRUD ───────────────────────────────────────────────────

	async createNode(role: NodeRole, header: ContentNodeHeader, body: ContentNodeBody): Promise<ContentNode> {
		const now = new Date();
		const node: ContentNode = {
			role,
			data: { header, body },
			metadata: {
				id: uuidv7(),
				versionSchema: 1,
				createdAt: now,
				updatedAt: now,
				author: state.user?.id
			}
		};

		await nodeRepo.put(node);
		state.nodes = [...state.nodes, node];
		return node;
	},

	async updateNodeHeader(nodeId: string, header: ContentNodeHeader): Promise<ContentNode> {
		const node = findNode(nodeId);
		const updated: ContentNode = {
			...node,
			data: { ...node.data, header },
			metadata: { ...node.metadata, updatedAt: new Date() }
		};
		await nodeRepo.put(updated);
		state.nodes = state.nodes.map((n) => (n.metadata.id === nodeId ? updated : n));
		return updated;
	},

	async updateNodeBody(nodeId: string, body: ContentNodeBody): Promise<ContentNode> {
		const node = findNode(nodeId);
		const updated: ContentNode = {
			...node,
			data: { ...node.data, body },
			metadata: { ...node.metadata, updatedAt: new Date() }
		};
		await nodeRepo.put(updated);
		state.nodes = state.nodes.map((n) => (n.metadata.id === nodeId ? updated : n));
		return updated;
	},

	async deleteNode(nodeId: string): Promise<void> {
		// Remove from all trees first
		for (const tree of state.trees) {
			const pathsToRemove: string[] = [];
			for (const [path, treePath] of Object.entries(tree.root.paths)) {
				const resolution = tree.root.nodes[treePath.node];
				if (resolution?.['/'] === nodeId) {
					pathsToRemove.push(path);
				}
			}

			if (pathsToRemove.length > 0) {
				const updatedTree = { ...tree, root: { ...tree.root, paths: { ...tree.root.paths }, nodes: { ...tree.root.nodes } } };

				for (const path of pathsToRemove) {
					const logicalName = updatedTree.root.paths[path].node;
					delete updatedTree.root.paths[path];
					// Remove logical node if no other path references it
					const stillUsed = Object.values(updatedTree.root.paths).some((tp) => tp.node === logicalName);
					if (!stillUsed) {
						delete updatedTree.root.nodes[logicalName];
					}
				}

				updatedTree.metadata = { ...updatedTree.metadata, updatedAt: new Date() };
				await treeRepo.put(updatedTree);
				state.trees = state.trees.map((t) => (t.metadata.id === tree.metadata.id ? updatedTree : t));
			}
		}

		// Then delete the node
		await nodeRepo.delete(nodeId);
		state.nodes = state.nodes.filter((n) => n.metadata.id !== nodeId);
	},

	getNodesByRole(role: NodeRole): ContentNode[] {
		return state.nodes.filter((n) => n.role === role);
	},

	// ── Tree CRUD ───────────────────────────────────────────────────

	async createTree(title?: string): Promise<{ tree: ContentTree; rootNode: ContentNode }> {
		const now = new Date();

		// Create root creator node
		const rootNode = await creator.createNode(
			'creator',
			{
				title: title ?? 'Nova Página',
				tags: [],
				categoryAssignments: []
			},
			{ role: 'creator' }
		);

		const logicalName = 'root';
		const tree: ContentTree = {
			sections: [],
			root: {
				paths: { '/': { node: logicalName } },
				nodes: { [logicalName]: { '/': rootNode.metadata.id } }
			},
			metadata: {
				id: uuidv7(),
				versionSchema: 1,
				createdAt: now,
				updatedAt: now,
				author: state.user?.id
			}
		};

		await treeRepo.put(tree);
		state.trees = [...state.trees, tree];
		return { tree, rootNode };
	},

	async deleteTree(treeId: string): Promise<void> {
		await treeRepo.delete(treeId);
		await pubRepo.delete(treeId);
		state.trees = state.trees.filter((t) => t.metadata.id !== treeId);
	},

	// ── Tree structure ──────────────────────────────────────────────

	async addNodeToTree(treeId: string, path: string, nodeId: string, sectionId?: string): Promise<ContentTree> {
		const tree = findTree(treeId);
		const node = findNode(nodeId);

		const logicalName = uniqueLogicalName(tree, toLogicalName(node.data.header.title));

		const treePath: TreePath = { node: logicalName };
		if (sectionId) treePath.section = sectionId;

		const updated: ContentTree = {
			...tree,
			root: {
				paths: { ...tree.root.paths, [path]: treePath },
				nodes: { ...tree.root.nodes, [logicalName]: { '/': nodeId } }
			},
			metadata: { ...tree.metadata, updatedAt: new Date() }
		};

		await treeRepo.put(updated);
		state.trees = state.trees.map((t) => (t.metadata.id === treeId ? updated : t));
		return updated;
	},

	async removeNodeFromTree(treeId: string, path: string): Promise<ContentTree> {
		const tree = findTree(treeId);

		if (!(path in tree.root.paths)) {
			throw new Error(`Path not found in tree: ${path}`);
		}

		const logicalName = tree.root.paths[path].node;
		const updatedPaths = { ...tree.root.paths };
		delete updatedPaths[path];

		// Also remove child paths
		for (const p of Object.keys(updatedPaths)) {
			if (p !== path && p.startsWith(path + '/')) {
				delete updatedPaths[p];
			}
		}

		// Clean up unused logical names
		const usedNames = new Set(Object.values(updatedPaths).map((tp) => tp.node));
		const updatedNodes = { ...tree.root.nodes };
		for (const name of Object.keys(updatedNodes)) {
			if (!usedNames.has(name)) {
				delete updatedNodes[name];
			}
		}

		const updated: ContentTree = {
			...tree,
			root: { paths: updatedPaths, nodes: updatedNodes },
			metadata: { ...tree.metadata, updatedAt: new Date() }
		};

		await treeRepo.put(updated);
		state.trees = state.trees.map((t) => (t.metadata.id === treeId ? updated : t));
		return updated;
	},

	async movePathInTree(treeId: string, oldPath: string, newPath: string): Promise<ContentTree> {
		const tree = findTree(treeId);

		if (!(oldPath in tree.root.paths)) {
			throw new Error(`Path not found in tree: ${oldPath}`);
		}

		const updatedPaths: Record<string, TreePath> = {};

		for (const [path, tp] of Object.entries(tree.root.paths)) {
			if (path === oldPath) {
				updatedPaths[newPath] = tp;
			} else if (path.startsWith(oldPath + '/')) {
				// Move child paths too
				updatedPaths[newPath + path.slice(oldPath.length)] = tp;
			} else {
				updatedPaths[path] = tp;
			}
		}

		const updated: ContentTree = {
			...tree,
			root: { ...tree.root, paths: updatedPaths },
			metadata: { ...tree.metadata, updatedAt: new Date() }
		};

		await treeRepo.put(updated);
		state.trees = state.trees.map((t) => (t.metadata.id === treeId ? updated : t));
		return updated;
	},

	async createNodeInTree(
		treeId: string,
		path: string,
		role: NodeRole,
		header: ContentNodeHeader,
		body: ContentNodeBody,
		sectionId?: string
	): Promise<{ tree: ContentTree; node: ContentNode }> {
		const node = await creator.createNode(role, header, body);
		const tree = await creator.addNodeToTree(treeId, path, node.metadata.id, sectionId);
		return { tree, node };
	},

	// ── Tree sections ───────────────────────────────────────────────

	async addSection(treeId: string, section: Omit<TreeSection, 'id'>): Promise<ContentTree> {
		const tree = findTree(treeId);
		const newSection: TreeSection = { ...section, id: uuidv7() };

		const updated: ContentTree = {
			...tree,
			sections: [...tree.sections, newSection],
			metadata: { ...tree.metadata, updatedAt: new Date() }
		};

		await treeRepo.put(updated);
		state.trees = state.trees.map((t) => (t.metadata.id === treeId ? updated : t));
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

		await treeRepo.put(updated);
		state.trees = state.trees.map((t) => (t.metadata.id === treeId ? updated : t));
		return updated;
	},

	async deleteSection(treeId: string, sectionId: string): Promise<ContentTree> {
		const tree = findTree(treeId);

		// Nullify section references in paths
		const updatedPaths: Record<string, TreePath> = {};
		for (const [path, tp] of Object.entries(tree.root.paths)) {
			if (tp.section === sectionId) {
				updatedPaths[path] = { ...tp, section: null };
			} else {
				updatedPaths[path] = tp;
			}
		}

		const updated: ContentTree = {
			...tree,
			sections: tree.sections.filter((s) => s.id !== sectionId),
			root: { ...tree.root, paths: updatedPaths },
			metadata: { ...tree.metadata, updatedAt: new Date() }
		};

		await treeRepo.put(updated);
		state.trees = state.trees.map((t) => (t.metadata.id === treeId ? updated : t));
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

		await treeRepo.put(updated);
		state.trees = state.trees.map((t) => (t.metadata.id === treeId ? updated : t));
		return updated;
	},

	// ── Publishing ──────────────────────────────────────────────────

	async publishTree(treeId: string, displayName?: string): Promise<TreeExport> {
		const tree = findTree(treeId);
		const referencedNodeIds = getNodeIds(tree);
		const nodes = state.nodes.filter((n) => referencedNodeIds.includes(n.metadata.id));

		// Collect all media referenced by these nodes
		const mediaIds = new Set<string>();
		for (const node of nodes) {
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
			nodes,
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

	getTreeNodes(treeId: string): ContentNode[] {
		const tree = findTree(treeId);
		const nodeIds = getNodeIds(tree);
		return state.nodes.filter((n) => nodeIds.includes(n.metadata.id));
	},

	getRootNode(treeId: string): ContentNode | null {
		const tree = findTree(treeId);
		const rootId = getRootNodeId(tree);
		if (!rootId) return null;
		return state.nodes.find((n) => n.metadata.id === rootId) ?? null;
	},

	getNodeForPath(treeId: string, path: string): ContentNode | null {
		const tree = findTree(treeId);
		const nodeId = resolveNodeId(tree, path);
		if (!nodeId) return null;
		return state.nodes.find((n) => n.metadata.id === nodeId) ?? null;
	},

	/** Get profile count for a tree (nodes linked at depth 1 with role='profile') */
	getProfileCount(treeId: string): number {
		const tree = findTree(treeId);
		let count = 0;
		for (const [path, tp] of Object.entries(tree.root.paths)) {
			if (path === '/') continue;
			// Depth-1 paths: single segment after /
			const segments = path.split('/').filter(Boolean);
			if (segments.length === 1) {
				const resolution = tree.root.nodes[tp.node];
				if (resolution) {
					const node = state.nodes.find((n) => n.metadata.id === resolution['/']);
					if (node?.role === 'profile') count++;
				}
			}
		}
		return count;
	}
};
