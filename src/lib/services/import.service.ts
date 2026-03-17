/**
 * Import Service — handles importing .notfeed.json files (TreeExport) and simple URL lists.
 *
 * Consumers use this to:
 * 1. Import a TreeExport (.notfeed.json) → persists ContentTree + ContentNodes + ContentMedias
 * 2. Import simple URLs (RSS/Atom) → creates standalone profile node + font nodes in a new tree
 */

import type { TreeExport } from '$lib/domain/tree-export/tree-export.js';
import type { ContentNode, ContentNodeHeader, FontBody, ContentNodeBody } from '$lib/domain/content-node/content-node.js';
import type { ContentTree } from '$lib/domain/content-tree/content-tree.js';
import type { ContentMedia } from '$lib/domain/content-media/content-media.js';
import { createContentNodeStore } from '$lib/persistence/content-node.store.js';
import { createContentTreeStore } from '$lib/persistence/content-tree.store.js';
import { createContentMediaStore } from '$lib/persistence/content-media.store.js';
import { uuidv7 } from '$lib/domain/shared/uuidv7.js';

export interface ImportResult {
	success: boolean;
	message: string;
	treeId?: string;
	nodeIds?: string[];
	mediaIds?: string[];
}

/**
 * Parse and validate a .notfeed.json file (TreeExport format).
 */
export function parseNotfeedJson(text: string): TreeExport | null {
	try {
		const data = JSON.parse(text);

		// Basic structural validation
		if (!data.exportId || !data.tree || !Array.isArray(data.nodes)) {
			return null;
		}

		if (!data.tree.root || !data.tree.metadata) {
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
	const nodeRepo = createContentNodeStore();
	const treeRepo = createContentTreeStore();
	const mediaRepo = createContentMediaStore();

	// Check for existing tree with same ID
	const existingTree = await treeRepo.getById(treeExport.tree.metadata.id);
	if (existingTree) {
		return {
			success: false,
			message: `Esta árvore já foi importada anteriormente.`
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

	// Persist nodes
	const nodeIds: string[] = [];
	for (const node of treeExport.nodes) {
		const existing = await nodeRepo.getById(node.metadata.id);
		if (!existing) {
			await nodeRepo.put(node);
			nodeIds.push(node.metadata.id);
		}
	}

	// Persist tree
	await treeRepo.put(treeExport.tree);

	const rootNode = treeExport.nodes.find((n) => n.role === 'creator');
	const title = rootNode?.data.header.title ?? 'Importado';

	return {
		success: true,
		message: `Importado: "${title}" com ${nodeIds.length} nó(s) e ${mediaIds.length} mídia(s).`,
		treeId: treeExport.tree.metadata.id,
		nodeIds,
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
 * Import a list of URLs as a new tree with a profile + font nodes.
 * Each URL becomes a font node under a single profile node.
 */
export async function importSimpleUrls(urls: string[], consumerId: string): Promise<ImportResult> {
	const nodeRepo = createContentNodeStore();
	const treeRepo = createContentTreeStore();

	const validUrls = urls
		.map((u) => u.trim())
		.filter((u) => u && (u.startsWith('http://') || u.startsWith('https://')));

	if (validUrls.length === 0) {
		return {
			success: false,
			message: 'Nenhuma URL válida encontrada. URLs devem começar com http:// ou https://.'
		};
	}

	const now = new Date();

	// Create creator (root) node
	const rootNode: ContentNode = {
		role: 'creator',
		data: {
			header: {
				title: `Import (${now.toLocaleDateString('pt-BR')})`,
				tags: ['importado'],
				categoryAssignments: []
			},
			body: { role: 'creator' }
		},
		metadata: { id: uuidv7(), versionSchema: 1, createdAt: now, updatedAt: now, author: consumerId }
	};
	await nodeRepo.put(rootNode);

	// Create a profile node
	const profileNode: ContentNode = {
		role: 'profile',
		data: {
			header: {
				title: `Feeds importados`,
				tags: ['importado'],
				categoryAssignments: []
			},
			body: { role: 'profile', defaultEnabled: true }
		},
		metadata: { id: uuidv7(), versionSchema: 1, createdAt: now, updatedAt: now, author: consumerId }
	};
	await nodeRepo.put(profileNode);

	// Create font nodes for each URL
	const fontNodeIds: string[] = [];
	const paths: Record<string, { node: string; section?: string }> = {
		'/': { node: 'root' },
		'/feeds': { node: 'feeds' }
	};
	const nodes: Record<string, { '/': string }> = {
		root: { '/': rootNode.metadata.id },
		feeds: { '/': profileNode.metadata.id }
	};

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
		const fontNode: ContentNode = {
			role: 'font',
			data: {
				header: { title, tags: [], categoryAssignments: [] },
				body: fontBody
			},
			metadata: { id: uuidv7(), versionSchema: 1, createdAt: now, updatedAt: now, author: consumerId }
		};
		await nodeRepo.put(fontNode);
		fontNodeIds.push(fontNode.metadata.id);

		const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || `font-${fontNodeIds.length}`;
		paths[`/feeds/${slug}`] = { node: slug };
		nodes[slug] = { '/': fontNode.metadata.id };
	}

	// Create tree
	const tree: ContentTree = {
		sections: [],
		root: { paths, nodes },
		metadata: { id: uuidv7(), versionSchema: 1, createdAt: now, updatedAt: now, author: consumerId }
	};
	await treeRepo.put(tree);

	return {
		success: true,
		message: `Importadas ${fontNodeIds.length} font(s) em uma nova árvore.`,
		treeId: tree.metadata.id,
		nodeIds: [rootNode.metadata.id, profileNode.metadata.id, ...fontNodeIds]
	};
}
