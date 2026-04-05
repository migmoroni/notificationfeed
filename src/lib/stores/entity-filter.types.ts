/**
 * EntityFilterStore — shared interface for page-based node filters.
 *
 * "Pages" are trees whose root node is a creator, profile, or collection.
 * Users can filter which page types to display, then select individual
 * pages and optionally narrow to specific fonts within them.
 *
 * Selection is two-level: Page → Font (with optional font refinement).
 */

import type { TreeNode, NodeRole } from '$lib/domain/content-tree/content-tree.js';
import type { TreeSection } from '$lib/domain/content-tree/content-tree.js';

// ── Page types available for filtering ─────────────────────────────────

/** Root node roles that qualify a tree as a "page". */
export type PageType = 'creator' | 'profile' | 'collection';

export const ALL_PAGE_TYPES: readonly PageType[] = ['creator', 'profile', 'collection'] as const;

// ── View models ────────────────────────────────────────────────────────

export interface PageEntry {
	/** Root node composite ID (treeId:localUuid) */
	id: string;
	/** Tree metadata ID */
	treeId: string;
	title: string;
	coverMediaId: string | null;
	/** Root node role (creator, profile, or collection) */
	pageType: PageType;
	/** Number of font nodes in this tree */
	fontCount: number;
}

export interface NodeEntry {
	node: TreeNode;
	/** Section from the tree path, if any */
	section: TreeSection | null;
}

// ── Interface ──────────────────────────────────────────────────────────

export interface EntityFilterStore {
	/** Which page types are shown in the filter UI. */
	readonly pageTypeFilter: Set<PageType>;
	/** Root node IDs of selected pages. */
	readonly selectedPageIds: Set<string>;
	/** Node IDs of selected fonts (optional refinement within pages). */
	readonly selectedFontIds: Set<string>;
	readonly hasFilters: boolean;
	readonly totalSelected: number;

	loadNodes(): Promise<void>;

	/** Set which page types are visible in the filter list. */
	setPageTypeFilter(types: Set<PageType>): void;
	/** Toggle a single page type on/off. */
	togglePageType(type: PageType): void;

	/** Get all pages matching the current pageTypeFilter. */
	getPages(): PageEntry[];
	/** Get font nodes within a page's tree. */
	getFonts(pageId: string): NodeEntry[];
	/** Get linked profile/collection pages within a creator/collection tree. */
	getLinkedPages(pageId: string): PageEntry[];
	getSections(treeId: string): TreeSection[];

	isPageSelected(pageId: string): boolean;
	isFontSelected(nodeId: string): boolean;

	togglePage(pageId: string): void;
	toggleFont(nodeId: string): void;
	clearAll(): void;

	/**
	 * Resolved set of font node IDs allowed by the current selection.
	 * Empty set means "no filter active" (show all).
	 */
	getAllowedFontNodeIds(): Set<string>;

	// ── Compat accessors (derived from selectedPageIds) ──────────────

	/** Page IDs where root role = 'creator'. Subset of selectedPageIds. */
	readonly selectedCreatorIds: Set<string>;
	/** Page IDs where root role = 'profile'. Subset of selectedPageIds. */
	readonly selectedProfileIds: Set<string>;
}
