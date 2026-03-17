/**
 * Entity Filter Factory — creates independent EntityFilterStore instances.
 *
 * Each call returns a store with its own selection state ($state).
 * The data source (how trees/nodes are loaded) is injected,
 * so the same code powers Feed, Browse and Preview filters.
 *
 * Relationships are resolved through ContentTree path navigation:
 *   "/" → creator (root)
 *   "/profile-x" → profile (child of root)
 *   "/profile-x/font-y" → font (child of profile)
 */

import type { ContentTree, TreeSection } from '$lib/domain/content-tree/content-tree.js';
import type { ContentNode } from '$lib/domain/content-node/content-node.js';
import { isCreatorNode, isProfileNode, isFontNode } from '$lib/domain/content-node/content-node.js';
import {
	resolveNodeId,
	getRootNodeId,
	getChildPaths,
	getPathSection
} from '$lib/domain/content-tree/content-tree.js';
import type { EntityFilterStore, CreatorEntry, NodeEntry } from './entity-filter.types.js';

// ── Data source interface ──────────────────────────────────────────────

export interface EntityFilterDataSource {
	/** Load all trees and nodes needed for this filter. */
	load(): Promise<{ trees: ContentTree[]; nodes: ContentNode[] }>;
	/** Return currently loaded trees. */
	getTrees(): ContentTree[];
	/** Return currently loaded nodes. */
	getNodes(): ContentNode[];
}

// ── Factory ────────────────────────────────────────────────────────────

export function createEntityFilter(source: EntityFilterDataSource): EntityFilterStore {
	let selectedCreatorIds = $state<Set<string>>(new Set());
	let selectedProfileIds = $state<Set<string>>(new Set());
	let selectedFontIds = $state<Set<string>>(new Set());

	// ── Tree navigation helpers ──────────────────────────────────────

	function nodeMap(): Map<string, ContentNode> {
		return new Map(source.getNodes().map((n) => [n.metadata.id, n]));
	}

	/**
	 * Find all trees whose root node matches creatorNodeId.
	 */
	function treesForCreator(creatorNodeId: string): ContentTree[] {
		return source.getTrees().filter((t) => getRootNodeId(t) === creatorNodeId);
	}

	/**
	 * Get profile node IDs under a given creator.
	 * Walks child paths of "/" across all trees rooted at that creator.
	 */
	function profileIdsForCreator(creatorNodeId: string): Set<string> {
		const ids = new Set<string>();
		for (const tree of treesForCreator(creatorNodeId)) {
			for (const childPath of getChildPaths(tree, '/')) {
				const nodeId = resolveNodeId(tree, childPath);
				if (nodeId) {
					const node = nodeMap().get(nodeId);
					if (node && isProfileNode(node)) ids.add(nodeId);
				}
			}
		}
		return ids;
	}

	/**
	 * Get font node IDs under a given profile.
	 * Finds all tree paths referencing profileNodeId, then gets their children.
	 */
	function fontIdsForProfile(profileNodeId: string): Set<string> {
		const ids = new Set<string>();
		for (const tree of source.getTrees()) {
			for (const [path, treePath] of Object.entries(tree.root.paths)) {
				const resolution = tree.root.nodes[treePath.node];
				if (resolution?.['/'] === profileNodeId) {
					for (const childPath of getChildPaths(tree, path)) {
						const nodeId = resolveNodeId(tree, childPath);
						if (nodeId) {
							const node = nodeMap().get(nodeId);
							if (node && isFontNode(node)) ids.add(nodeId);
						}
					}
				}
			}
		}
		return ids;
	}

	/**
	 * Get creator node IDs that own a given profile via tree paths.
	 */
	function creatorIdsForProfile(profileNodeId: string): Set<string> {
		const ids = new Set<string>();
		for (const tree of source.getTrees()) {
			for (const [, treePath] of Object.entries(tree.root.paths)) {
				const resolution = tree.root.nodes[treePath.node];
				if (resolution?.['/'] === profileNodeId) {
					const rootId = getRootNodeId(tree);
					if (rootId) ids.add(rootId);
				}
			}
		}
		return ids;
	}

	/**
	 * Get profile node IDs that own a given font via tree paths.
	 */
	function profileIdsForFont(fontNodeId: string): Set<string> {
		const ids = new Set<string>();
		for (const tree of source.getTrees()) {
			for (const [path, treePath] of Object.entries(tree.root.paths)) {
				const resolution = tree.root.nodes[treePath.node];
				if (resolution?.['/'] === fontNodeId) {
					// Find the parent path
					const parentPath = path.includes('/') && path !== '/'
						? path.substring(0, path.lastIndexOf('/')) || '/'
						: null;
					if (parentPath) {
						const parentNodeId = resolveNodeId(tree, parentPath);
						if (parentNodeId) {
							const parentNode = nodeMap().get(parentNodeId);
							if (parentNode && isProfileNode(parentNode)) ids.add(parentNodeId);
						}
					}
				}
			}
		}
		return ids;
	}

	/** Set of all profile nodeIds that appear in any tree as a child of root */
	function linkedProfileIds(): Set<string> {
		const ids = new Set<string>();
		for (const tree of source.getTrees()) {
			for (const childPath of getChildPaths(tree, '/')) {
				const nodeId = resolveNodeId(tree, childPath);
				if (nodeId) {
					const node = nodeMap().get(nodeId);
					if (node && isProfileNode(node)) ids.add(nodeId);
				}
			}
		}
		return ids;
	}

	/** Set of all font nodeIds that appear in any tree under a profile */
	function linkedFontIds(): Set<string> {
		const ids = new Set<string>();
		const nMap = nodeMap();
		for (const tree of source.getTrees()) {
			for (const childPath of getChildPaths(tree, '/')) {
				for (const fontPath of getChildPaths(tree, childPath)) {
					const nodeId = resolveNodeId(tree, fontPath);
					if (nodeId) {
						const node = nMap.get(nodeId);
						if (node && isFontNode(node)) ids.add(nodeId);
					}
				}
			}
		}
		return ids;
	}

	/**
	 * Get the TreeSection for a node in any tree that contains it.
	 * Returns the first section found.
	 */
	function sectionForNode(nodeId: string): TreeSection | null {
		for (const tree of source.getTrees()) {
			for (const [path, treePath] of Object.entries(tree.root.paths)) {
				const resolution = tree.root.nodes[treePath.node];
				if (resolution?.['/'] === nodeId) {
					return getPathSection(tree, path);
				}
			}
		}
		return null;
	}

	// ── Store implementation ─────────────────────────────────────────

	return {
		get selectedCreatorIds() { return selectedCreatorIds; },
		get selectedProfileIds() { return selectedProfileIds; },
		get selectedFontIds() { return selectedFontIds; },

		get hasFilters(): boolean {
			return selectedCreatorIds.size > 0 || selectedProfileIds.size > 0 || selectedFontIds.size > 0;
		},

		get totalSelected(): number {
			return selectedCreatorIds.size + selectedProfileIds.size + selectedFontIds.size;
		},

		async loadNodes(): Promise<void> {
			await source.load();
		},

		getCreators(): CreatorEntry[] {
			const nMap = nodeMap();
			const creatorIds = new Set<string>();

			for (const tree of source.getTrees()) {
				const rootId = getRootNodeId(tree);
				if (rootId) creatorIds.add(rootId);
			}

			const entries: CreatorEntry[] = [];
			for (const id of creatorIds) {
				const node = nMap.get(id);
				if (!node || !isCreatorNode(node)) continue;
				entries.push({
					id,
					title: node.data.header.title,
					coverMediaId: node.data.header.coverMediaId ?? null,
					profileCount: profileIdsForCreator(id).size
				});
			}

			return entries.sort((a, b) => a.title.localeCompare(b.title));
		},

		getProfiles(creatorNodeId?: string): NodeEntry[] {
			const nMap = nodeMap();

			if (creatorNodeId) {
				const profileIds = profileIdsForCreator(creatorNodeId);
				const entries: NodeEntry[] = [];
				for (const id of profileIds) {
					const node = nMap.get(id);
					if (!node) continue;
					entries.push({ node, section: sectionForNode(id) });
				}
				return entries.sort((a, b) =>
					a.node.data.header.title.localeCompare(b.node.data.header.title)
				);
			}

			// All profile nodes
			return source.getNodes()
				.filter(isProfileNode)
				.map((node) => ({ node, section: sectionForNode(node.metadata.id) }))
				.sort((a, b) => a.node.data.header.title.localeCompare(b.node.data.header.title));
		},

		getFonts(profileNodeId: string): NodeEntry[] {
			const nMap = nodeMap();
			const fontIds = fontIdsForProfile(profileNodeId);

			const entries: NodeEntry[] = [];
			for (const id of fontIds) {
				const node = nMap.get(id);
				if (!node) continue;
				entries.push({ node, section: sectionForNode(id) });
			}
			return entries.sort((a, b) =>
				a.node.data.header.title.localeCompare(b.node.data.header.title)
			);
		},

		getStandaloneProfiles(): ContentNode[] {
			const linked = linkedProfileIds();
			return source.getNodes()
				.filter((n) => isProfileNode(n) && !linked.has(n.metadata.id))
				.sort((a, b) => a.data.header.title.localeCompare(b.data.header.title));
		},

		getStandaloneFonts(): ContentNode[] {
			const linked = linkedFontIds();
			return source.getNodes()
				.filter((n) => isFontNode(n) && !linked.has(n.metadata.id))
				.sort((a, b) => a.data.header.title.localeCompare(b.data.header.title));
		},

		getSections(treeId: string): TreeSection[] {
			const tree = source.getTrees().find((t) => t.metadata.id === treeId);
			if (!tree) return [];
			return [...tree.sections].sort((a, b) => a.order - b.order);
		},

		// ── Selection ────────────────────────────────────────────────

		isCreatorSelected(nodeId: string): boolean {
			return selectedCreatorIds.has(nodeId);
		},

		isProfileSelected(nodeId: string): boolean {
			return selectedProfileIds.has(nodeId);
		},

		isFontSelected(nodeId: string): boolean {
			return selectedFontIds.has(nodeId);
		},

		toggleCreator(nodeId: string): void {
			const next = new Set(selectedCreatorIds);
			if (next.has(nodeId)) {
				next.delete(nodeId);
				// Cascade: deselect child profiles and their fonts
				const childProfileIds = profileIdsForCreator(nodeId);
				const nextProfiles = new Set(selectedProfileIds);
				const nextFonts = new Set(selectedFontIds);
				for (const pid of childProfileIds) {
					nextProfiles.delete(pid);
					for (const fid of fontIdsForProfile(pid)) {
						nextFonts.delete(fid);
					}
				}
				selectedProfileIds = nextProfiles;
				selectedFontIds = nextFonts;
			} else {
				next.add(nodeId);
			}
			selectedCreatorIds = next;
		},

		toggleProfile(nodeId: string): void {
			const next = new Set(selectedProfileIds);
			if (next.has(nodeId)) {
				next.delete(nodeId);
				// Cascade: deselect child fonts
				const nextFonts = new Set(selectedFontIds);
				for (const fid of fontIdsForProfile(nodeId)) {
					nextFonts.delete(fid);
				}
				selectedFontIds = nextFonts;
			} else {
				next.add(nodeId);
			}
			selectedProfileIds = next;
		},

		toggleFont(nodeId: string): void {
			const next = new Set(selectedFontIds);
			if (next.has(nodeId)) {
				next.delete(nodeId);
			} else {
				next.add(nodeId);
			}
			selectedFontIds = next;
		},

		clearAll(): void {
			selectedCreatorIds = new Set();
			selectedProfileIds = new Set();
			selectedFontIds = new Set();
		},

		getAllowedFontNodeIds(): Set<string> {
			if (!this.hasFilters) return new Set();

			const allowed = new Set<string>();
			const nMap = nodeMap();

			/** Font IDs for a profile, narrowed by font selection if any. */
			const fontsForProfile = (profileId: string): string[] => {
				const pfIds = fontIdsForProfile(profileId);
				const pFonts = [...pfIds].filter((fid) => nMap.has(fid));
				const selected = pFonts.filter((fid) => selectedFontIds.has(fid));
				return selected.length > 0 ? selected : pFonts;
			};

			// Fonts from selected creators
			for (const creatorId of selectedCreatorIds) {
				const creatorProfileIds = profileIdsForCreator(creatorId);
				const selectedInCreator = [...creatorProfileIds].filter((pid) => selectedProfileIds.has(pid));
				const idsToUse = selectedInCreator.length > 0 ? selectedInCreator : [...creatorProfileIds];
				for (const pid of idsToUse) {
					for (const fid of fontsForProfile(pid)) allowed.add(fid);
				}
			}

			// Fonts from directly selected profiles (not covered by selected creators)
			for (const profileId of selectedProfileIds) {
				const ownerCreators = creatorIdsForProfile(profileId);
				const coveredByCreator = [...ownerCreators].some((cid) => selectedCreatorIds.has(cid));
				if (coveredByCreator) continue;
				for (const fid of fontsForProfile(profileId)) allowed.add(fid);
			}

			// Directly selected fonts not covered by profile or creator selection
			for (const fontId of selectedFontIds) {
				if (!nMap.has(fontId)) continue;
				const ownerProfiles = profileIdsForFont(fontId);
				const coveredByProfile = [...ownerProfiles].some((pid) => selectedProfileIds.has(pid));
				if (coveredByProfile) continue;
				const coveredByCreator = [...ownerProfiles].some((pid) => {
					const creators = creatorIdsForProfile(pid);
					return [...creators].some((cid) => selectedCreatorIds.has(cid));
				});
				if (coveredByCreator) continue;
				allowed.add(fontId);
			}

			return allowed;
		}
	};
}
