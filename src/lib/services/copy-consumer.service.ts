/**
 * Copy-from-Consumer Service — deep copies nodes from external trees into creator's tree.
 *
 * Creates new ContentNodes with the creator's author ID. The copies are fully
 * independent from the originals. Media referenced by nodes is also duplicated.
 */

import type { ContentNode, ContentNodeHeader, ContentNodeBody } from '$lib/domain/content-node/content-node.js';
import type { ContentMedia } from '$lib/domain/content-media/content-media.js';
import { createContentNodeStore } from '$lib/persistence/content-node.store.js';
import { createContentMediaStore } from '$lib/persistence/content-media.store.js';
import { uuidv7 } from '$lib/domain/shared/uuidv7.js';

const nodeRepo = createContentNodeStore();
const mediaRepo = createContentMediaStore();

export interface CopyResult {
	nodes: ContentNode[];
	medias: ContentMedia[];
}

/**
 * Deep-copy a single node, reassigning authorship and generating new IDs.
 * Also duplicates any referenced media (cover, banner).
 */
async function deepCopyNode(
	original: ContentNode,
	authorId: string
): Promise<{ node: ContentNode; copiedMediaIds: Map<string, string> }> {
	const now = new Date();
	const copiedMediaIds = new Map<string, string>();

	// Duplicate referenced media
	const headerPatch: Partial<ContentNodeHeader> = {};

	if (original.data.header.coverMediaId) {
		const media = await mediaRepo.getById(original.data.header.coverMediaId);
		if (media) {
			const newId = uuidv7();
			const copy: ContentMedia = {
				...media,
				metadata: { ...media.metadata, id: newId, author: authorId, createdAt: now, updatedAt: now }
			};
			await mediaRepo.put(copy);
			copiedMediaIds.set(original.data.header.coverMediaId, newId);
			headerPatch.coverMediaId = newId;
		}
	}

	if (original.data.header.bannerMediaId) {
		const media = await mediaRepo.getById(original.data.header.bannerMediaId);
		if (media) {
			const newId = uuidv7();
			const copy: ContentMedia = {
				...media,
				metadata: { ...media.metadata, id: newId, author: authorId, createdAt: now, updatedAt: now }
			};
			await mediaRepo.put(copy);
			copiedMediaIds.set(original.data.header.bannerMediaId, newId);
			headerPatch.bannerMediaId = newId;
		}
	}

	const node: ContentNode = {
		role: original.role,
		data: {
			header: {
				...original.data.header,
				...headerPatch,
				tags: [...original.data.header.tags],
				categoryAssignments: original.data.header.categoryAssignments.map((a) => ({
					treeId: a.treeId,
					categoryIds: [...a.categoryIds]
				}))
			},
			body: { ...original.data.body } as ContentNodeBody
		},
		metadata: {
			id: uuidv7(),
			versionSchema: original.metadata.versionSchema,
			createdAt: now,
			updatedAt: now,
			author: authorId
		}
	};

	await nodeRepo.put(node);
	return { node, copiedMediaIds };
}

/**
 * Deep copy a list of nodes (typically profiles + their child fonts) for use by the creator.
 * Returns the newly created nodes and media. The caller is responsible for linking them into a tree.
 */
export async function copyNodesToCreator(
	nodeIds: string[],
	authorId: string
): Promise<CopyResult> {
	const copiedNodes: ContentNode[] = [];
	const copiedMedias: ContentMedia[] = [];

	for (const nodeId of nodeIds) {
		const original = await nodeRepo.getById(nodeId);
		if (!original) continue;

		const { node, copiedMediaIds } = await deepCopyNode(original, authorId);
		copiedNodes.push(node);

		// Collect any media we copied
		for (const newMediaId of copiedMediaIds.values()) {
			const m = await mediaRepo.getById(newMediaId);
			if (m) copiedMedias.push(m);
		}
	}

	return { nodes: copiedNodes, medias: copiedMedias };
}
