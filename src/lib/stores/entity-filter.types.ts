/**
 * EntityFilterStore — shared interface for tree-based node filters.
 *
 * Replaces the old Page/Profile/Font junction-based filter with
 * ContentTree path navigation. Selection is still three-level
 * (creator → profile → font) with cascading deselection, but
 * relationships are resolved from tree paths instead of junction tables.
 */

import type { ContentNode } from '$lib/domain/content-node/content-node.js';
import type { TreeSection } from '$lib/domain/content-tree/content-tree.js';

// ── View models ────────────────────────────────────────────────────────

export interface CreatorEntry {
	id: string;
	title: string;
	coverMediaId: string | null;
	profileCount: number;
}

export interface NodeEntry {
	node: ContentNode;
	/** Section from the tree path, if any */
	section: TreeSection | null;
}

// ── Interface ──────────────────────────────────────────────────────────

export interface EntityFilterStore {
	/** Node IDs of selected creators (role = 'creator') */
	readonly selectedCreatorIds: Set<string>;
	/** Node IDs of selected profiles (role = 'profile') */
	readonly selectedProfileIds: Set<string>;
	/** Node IDs of selected fonts (role = 'font') */
	readonly selectedFontIds: Set<string>;
	readonly hasFilters: boolean;
	readonly totalSelected: number;

	loadNodes(): Promise<void>;

	getCreators(): CreatorEntry[];
	getProfiles(creatorNodeId?: string): NodeEntry[];
	getFonts(profileNodeId: string): NodeEntry[];
	getStandaloneProfiles(): ContentNode[];
	getStandaloneFonts(): ContentNode[];
	getSections(treeId: string): TreeSection[];

	isCreatorSelected(nodeId: string): boolean;
	isProfileSelected(nodeId: string): boolean;
	isFontSelected(nodeId: string): boolean;

	toggleCreator(nodeId: string): void;
	toggleProfile(nodeId: string): void;
	toggleFont(nodeId: string): void;
	clearAll(): void;

	/**
	 * Resolved set of font node IDs allowed by the current selection.
	 * Empty set means "no filter active" (show all).
	 */
	getAllowedFontNodeIds(): Set<string>;
}
