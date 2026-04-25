/**
 * Entity Filter Factory — creates independent EntityFilterStore instances.
 *
 * Each call returns a store with its own selection state ($state).
 * The data source (how trees are loaded) is injected,
 * so the same code powers Feed, Browse and Preview filters.
 *
 * New model: flat page-based filtering.
 *   Page = any tree whose root is creator, profile, or collection.
 *   Users choose which page types to display, then select pages and
 *   optionally narrow to specific fonts within them.
 */

import type { ContentTree, TreeSection, TreeNode } from '$lib/domain/content-tree/content-tree.js';
import {
getRootNode,
getRootNodeId,
isCreatorNode,
isProfileNode,
isCollectionNode,
isTreeLinkNode,
isFontNode,
getFontNodes,
getNodeSection,
parseTreeId
} from '$lib/domain/content-tree/content-tree.js';
import type { NodeActivation } from '$lib/domain/user/user-consumer.js';
import { SYSTEM_ALL_LIBRARY_TAB_ID, SYSTEM_ONLY_FAVORITES_TAB_ID } from '$lib/domain/user/user-consumer.js';
import type { EntityFilterStore, PageEntry, NodeEntry, PageType } from './entity-filter.types.js';
import { ALL_PAGE_TYPES } from './entity-filter.types.js';

// ── Data source interface ──────────────────────────────────────────────

export interface EntityFilterDataSource {
/** Load all trees needed for this filter. */
load(): Promise<{ trees: ContentTree[] }>;
/** Return currently loaded trees. */
getTrees(): ContentTree[];
	/** Optional: check if a node is activated by the consumer. When provided, inactive nodes are hidden. */
	isNodeActivated?: (nodeId: string) => boolean;
	/** Optional: access the consumer activation for a node (favorite + library tab memberships). */
	getActivation?: (nodeId: string) => NodeActivation | undefined;
}

export interface EntityFilterOptions {
	/** When true, only one page (tree) can be selected at a time. */
	singlePageSelect?: boolean;
	/** When true, only one font can be selected at a time. */
	singleFontSelect?: boolean;
}

// ── Factory ────────────────────────────────────────────────────────────

export function createEntityFilter(source: EntityFilterDataSource, options?: EntityFilterOptions): EntityFilterStore {
const singlePageSelect = options?.singlePageSelect ?? false;
const singleFontSelect = options?.singleFontSelect ?? false;
let pageTypeFilter = $state<Set<PageType>>(new Set(ALL_PAGE_TYPES));
let selectedPageIds = $state<Set<string>>(new Set());
let selectedFontIds = $state<Set<string>>(new Set());
let libraryTabFilter = $state<Set<string>>(new Set());
let priorityByNodeId = $state<Record<string, 'high'>>({});

// ── Internal helpers ───────────────────────────────────────────────

/**
 * Returns true if a node's OWN activation matches the current library-tab filter.
 * Empty filter = always true.
 * "All Library" tab = any activation matches.
 * "Only Favorites" tab = requires activation.favorite === true.
 * Custom tabs = activation.libraryTabIds must intersect selection.
 */
function activationMatchesLibraryTabs(nodeId: string): boolean {
	if (libraryTabFilter.size === 0) return true;
	const activation = source.getActivation?.(nodeId);
	if (!activation) return false;
	if (libraryTabFilter.has(SYSTEM_ALL_LIBRARY_TAB_ID)) return true;
	if (libraryTabFilter.has(SYSTEM_ONLY_FAVORITES_TAB_ID) && activation.favorite) return true;
	for (const tabId of activation.libraryTabIds) {
		if (libraryTabFilter.has(tabId)) return true;
	}
	return false;
}

/**
 * Returns true if a node should pass the library-tab filter.
 * Inheritance rules:
 *   - Fonts inherit from their tree root page (if the page is in a selected tab,
 *     all of its fonts match too).
 *   - Pages match if their own activation matches OR if any font descendant matches.
 */
function nodeMatchesLibraryTabs(nodeId: string): boolean {
	if (libraryTabFilter.size === 0) return true;
	if (activationMatchesLibraryTabs(nodeId)) return true;
	const treeId = parseTreeId(nodeId);
	const tree = buildTreeMap().get(treeId);
	if (!tree) return false;
	const rootId = getRootNodeId(tree);
	// Font → check parent page root
	if (rootId !== nodeId && activationMatchesLibraryTabs(rootId)) return true;
	// Page → check any font descendant
	if (rootId === nodeId) {
		for (const fn of getFontNodes(tree)) {
			if (activationMatchesLibraryTabs(fn.metadata.id)) return true;
		}
	}
	return false;
}

/** Combined visibility predicate: node must be activated AND match library-tab filter. */
function isNodeVisible(nodeId: string): boolean {
	if (source.isNodeActivated && !source.isNodeActivated(nodeId)) return false;
	return nodeMatchesLibraryTabs(nodeId);
}

/** Build a map of treeId → ContentTree */
function buildTreeMap(): Map<string, ContentTree> {
return new Map(source.getTrees().map((t) => [t.metadata.id, t]));
}

/** Root role → PageType mapping (only the 3 page roles) */
function rootPageType(tree: ContentTree): PageType | null {
const root = getRootNode(tree);
if (!root) return null;
if (root.role === 'creator') return 'creator';
if (root.role === 'profile') return 'profile';
if (root.role === 'collection') return 'collection';
return null;
}

/** All trees that qualify as pages (root = creator | profile | collection) */
function pageTrees(): ContentTree[] {
return source.getTrees().filter((t) => rootPageType(t) !== null);
}

/** Page trees filtered by the current pageTypeFilter */
function visiblePageTrees(): ContentTree[] {
return pageTrees().filter((t) => {
const pt = rootPageType(t);
return pt !== null && pageTypeFilter.has(pt);
});
}

/** Get font node IDs within a tree */
function fontIdsForTree(treeId: string): Set<string> {
const treeMap = buildTreeMap();
const tree = treeMap.get(treeId);
if (!tree) return new Set();
const ids = new Set<string>();
for (const node of getFontNodes(tree)) {
ids.add(node.metadata.id);
}
return ids;
}

/** Get the tree that owns a font (by parsing composite ID) */
function treeForFont(fontNodeId: string): ContentTree | null {
const treeId = parseTreeId(fontNodeId);
return buildTreeMap().get(treeId) ?? null;
}

/** Get the set of page (root) IDs linked FROM the given page via outgoing tree-link nodes (forward only). */
function getForwardLinkedPageIds(pageId: string): Set<string> {
const out = new Set<string>();
const treeMap = buildTreeMap();
const tree = treeMap.get(parseTreeId(pageId));
if (!tree) return out;
for (const n of Object.values(tree.nodes)) {
if (!isTreeLinkNode(n)) continue;
const linked = treeMap.get(n.data.body.instanceTreeId);
if (linked) out.add(getRootNodeId(linked));
}
return out;
}

/** Get the set of page (root) IDs that are linked to a given page via tree-link nodes (bidirectional). */
function getRelatedPageIds(pageId: string): Set<string> {
const related = new Set<string>();
const treeMap = buildTreeMap();
const targetTreeId = parseTreeId(pageId);

// Forward: trees linked FROM pageId's tree
const tree = treeMap.get(targetTreeId);
if (tree) {
for (const n of Object.values(tree.nodes)) {
if (!isTreeLinkNode(n)) continue;
const linked = treeMap.get(n.data.body.instanceTreeId);
if (linked) related.add(getRootNodeId(linked));
}
}

// Reverse: trees that link TO pageId's tree
for (const t of treeMap.values()) {
for (const n of Object.values(t.nodes)) {
if (!isTreeLinkNode(n)) continue;
if (n.data.body.instanceTreeId === targetTreeId) {
related.add(getRootNodeId(t));
}
}
}

return related;
}

/** Get the page type for a given page entry (root role, or 'font' for font pages) */
function pageRootRole(pageId: string): PageType | null {
const treeId = parseTreeId(pageId);
const tree = buildTreeMap().get(treeId);
if (!tree) return null;
// Check if this page entry is a font node (not the tree root)
const node = tree.nodes[pageId];
if (node && isFontNode(node)) return 'font';
return rootPageType(tree);
}

// ── Store implementation ─────────────────────────────────────────

return {
get pageTypeFilter() { return pageTypeFilter; },
get selectedPageIds() { return selectedPageIds; },
get selectedFontIds() { return selectedFontIds; },
get libraryTabFilter() { return libraryTabFilter; },

get selectedCreatorIds(): Set<string> {
const ids = new Set<string>();
for (const pid of selectedPageIds) {
if (pageRootRole(pid) === 'creator') ids.add(pid);
}
return ids;
},

get selectedProfileIds(): Set<string> {
const ids = new Set<string>();
for (const pid of selectedPageIds) {
if (pageRootRole(pid) === 'profile') ids.add(pid);
}
return ids;
},

get hasFilters(): boolean {
return selectedPageIds.size > 0 || selectedFontIds.size > 0 || libraryTabFilter.size > 0;
},

get totalSelected(): number {
return selectedPageIds.size + selectedFontIds.size;
},

async loadNodes(): Promise<void> {
await source.load();
},

setPageTypeFilter(types: Set<PageType>): void {
		pageTypeFilter = new Set(types);
		// Changing the visible page-type filter must NOT drop current selections:
		// the user may narrow the sidebar view without losing what they picked.
	},
togglePageType(type: PageType): void {
const onlyThis = pageTypeFilter.size === 1 && pageTypeFilter.has(type);
if (onlyThis) {
// Clicking the already-focused one → show all
this.setPageTypeFilter(new Set(ALL_PAGE_TYPES));
} else {
// Focus on just this one
this.setPageTypeFilter(new Set([type]));
}
},

getPages(): PageEntry[] {
const entries: PageEntry[] = [];

// Tree-based pages (creator, profile, collection)
for (const tree of visiblePageTrees()) {
const root = getRootNode(tree);
if (!root) continue;
				const rootId = getRootNodeId(tree);
				if (!isNodeVisible(rootId)) continue;
				const pt = rootPageType(tree);
				if (!pt) continue;
				const activeFontCount = getFontNodes(tree).filter((n) => isNodeVisible(n.metadata.id)).length;
				entries.push({
					id: rootId,
					treeId: tree.metadata.id,
					title: root.data.header.title,
					coverMediaId: root.data.header.coverMediaId ?? null,
					coverEmoji: root.data.header.coverEmoji ?? null,
					pageType: pt,
					fontCount: activeFontCount
				});
}

// Font entries (when 'font' type is in the filter)
if (pageTypeFilter.has('font')) {
	for (const tree of pageTrees()) {
		for (const fontNode of getFontNodes(tree)) {
				if (!isNodeVisible(fontNode.metadata.id)) continue;
			entries.push({
				id: fontNode.metadata.id,
				treeId: tree.metadata.id,
				title: fontNode.data.header.title,
				coverMediaId: fontNode.data.header.coverMediaId ?? null,
				coverEmoji: fontNode.data.header.coverEmoji ?? null,
				pageType: 'font',
				fontCount: 0
			});
		}
	}
}

return entries.sort((a, b) => a.title.localeCompare(b.title));
},

getFonts(pageId: string): NodeEntry[] {
const treeId = parseTreeId(pageId);
const treeMap = buildTreeMap();
const tree = treeMap.get(treeId);
if (!tree) return [];

return getFontNodes(tree)
				.filter((node) => isNodeVisible(node.metadata.id))
.map((node) => ({
node,
section: getNodeSection(tree, node.metadata.id)
}))
.sort((a, b) => a.node.data.header.title.localeCompare(b.node.data.header.title));
},

getSections(treeId: string): TreeSection[] {
const tree = source.getTrees().find((t) => t.metadata.id === treeId);
if (!tree) return [];
return [...tree.sections].sort((a, b) => a.order - b.order);
},

getLinkedPages(pageId: string): PageEntry[] {
const treeId = parseTreeId(pageId);
const treeMap = buildTreeMap();
const tree = treeMap.get(treeId);
if (!tree) return [];

const linked: PageEntry[] = [];
for (const treeNode of Object.values(tree.nodes)) {
if (!isTreeLinkNode(treeNode)) continue;
const linkedTree = treeMap.get(treeNode.data.body.instanceTreeId);
if (!linkedTree) continue;
const root = getRootNode(linkedTree);
if (!root) continue;
				const linkedRootId = getRootNodeId(linkedTree);
				if (!isNodeVisible(linkedRootId)) continue;
				const pt = rootPageType(linkedTree);
				const activeFontCount = getFontNodes(linkedTree).filter((n) => isNodeVisible(n.metadata.id)).length;
				linked.push({
					id: linkedRootId,
					treeId: linkedTree.metadata.id,
					title: root.data.header.title,
					coverMediaId: root.data.header.coverMediaId ?? null,
					coverEmoji: root.data.header.coverEmoji ?? null,
					pageType: pt ?? 'profile',
					fontCount: activeFontCount
				});
}
return linked.sort((a, b) => a.title.localeCompare(b.title));
},

// ── Selection ────────────────────────────────────────────────

isPageSelected(pageId: string): boolean {
// Font-type pages use selectedFontIds (same set as nested fonts)
if (pageRootRole(pageId) === 'font') return selectedFontIds.has(pageId);
return selectedPageIds.has(pageId);
},

isFontSelected(nodeId: string): boolean {
return selectedFontIds.has(nodeId);
},

togglePage(pageId: string): void {
			// Font-type pages route through font selection
			if (pageRootRole(pageId) === 'font') {
				this.toggleFont(pageId);
				return;
			}
			if (singlePageSelect) {
				if (selectedPageIds.has(pageId)) {
					// Deselect this page; keep only related pages that are still selected
					const next = new Set(selectedPageIds);
					next.delete(pageId);
					// Remove fonts from deselected page
					const nextFonts = new Set(selectedFontIds);
					for (const fid of fontIdsForTree(parseTreeId(pageId))) {
						nextFonts.delete(fid);
					}
					selectedPageIds = next;
					selectedFontIds = nextFonts;
				} else {
					// Select new page; keep currently selected pages that are related to it
					const related = getRelatedPageIds(pageId);
					const next = new Set<string>([pageId]);
					const nextFonts = new Set<string>();
					for (const pid of selectedPageIds) {
						if (related.has(pid)) {
							next.add(pid);
							// Keep fonts of related pages
							for (const fid of selectedFontIds) {
								if (fontIdsForTree(parseTreeId(pid)).has(fid)) {
									nextFonts.add(fid);
								}
							}
						}
					}
					selectedPageIds = next;
					selectedFontIds = nextFonts;
				}
				return;
			}
			const next = new Set(selectedPageIds);
if (next.has(pageId)) {
next.delete(pageId);
// Cascade: deselect fonts within this page
const treeId = parseTreeId(pageId);
const nextFonts = new Set(selectedFontIds);
for (const fid of fontIdsForTree(treeId)) {
nextFonts.delete(fid);
}
// Cascade: deselect linked pages (and their fonts) for creator/collection trees
const treeMap = buildTreeMap();
const tree = treeMap.get(treeId);
if (tree) {
for (const treeNode of Object.values(tree.nodes)) {
if (!isTreeLinkNode(treeNode)) continue;
const linkedTree = treeMap.get(treeNode.data.body.instanceTreeId);
if (!linkedTree) continue;
const linkedRootId = getRootNodeId(linkedTree);
next.delete(linkedRootId);
for (const fid of fontIdsForTree(linkedTree.metadata.id)) {
nextFonts.delete(fid);
}
}
}
selectedFontIds = nextFonts;
} else {
next.add(pageId);
}
selectedPageIds = next;
},

		toggleFont(nodeId: string): void {
			if (selectedFontIds.has(nodeId)) {
				if (singleFontSelect) {
					selectedFontIds = new Set();
				} else {
					const next = new Set(selectedFontIds);
					next.delete(nodeId);
					selectedFontIds = next;
				}
			} else {
				if (singleFontSelect) {
					selectedFontIds = new Set([nodeId]);
					// Keep pages that own this font directly or are linked (via tree-links)
					// to the tree that owns the font. Bidirectional: creators linking to the
					// font's profile tree are preserved, just like profiles selecting their own font.
					const fontTreeId = parseTreeId(nodeId);
					const next = new Set<string>();
					for (const pid of selectedPageIds) {
						if (parseTreeId(pid) === fontTreeId) { next.add(pid); continue; }
						let keep = false;
						for (const relatedRootId of getRelatedPageIds(pid)) {
							if (parseTreeId(relatedRootId) === fontTreeId) { keep = true; break; }
						}
						if (keep) next.add(pid);
					}
					selectedPageIds = next;
				} else {
					const next = new Set(selectedFontIds);
					next.add(nodeId);
					selectedFontIds = next;
				}
			}
		},

		clearAll(): void {
selectedPageIds = new Set();
selectedFontIds = new Set();
			libraryTabFilter = new Set();
			priorityByNodeId = {};
},

		// ── Per-node priority ──────────────────────────────────────────

		get priorityByNodeId() { return priorityByNodeId; },

		/**
		 * Effective priority map: own 'high' entries plus inherited 'high' for
		 * descendants. Inheritance rules:
		 *   - profile high → all its fonts.
		 *   - creator/collection high → all linked profile pages AND all fonts of those profiles.
		 * Used at feed-sort time so a "high" flag propagates downward.
		 */
		get effectivePriorityByNodeId(): Record<string, 'high'> {
			const out: Record<string, 'high'> = { ...priorityByNodeId };
			const treeMap = buildTreeMap();

			const propagateProfileFonts = (profileId: string) => {
				const tree = treeMap.get(parseTreeId(profileId));
				if (!tree) return;
				for (const fn of getFontNodes(tree)) out[fn.metadata.id] = 'high';
			};

			for (const id of Object.keys(priorityByNodeId)) {
				const role = pageRootRole(id);
				if (role === 'profile') {
					propagateProfileFonts(id);
				} else if (role === 'creator' || role === 'collection') {
					// Linked profiles + their fonts
					for (const linkedPageId of getForwardLinkedPageIds(id)) {
						out[linkedPageId] = 'high';
						propagateProfileFonts(linkedPageId);
					}
					// Also include fonts directly inside the creator/collection tree (rare but possible)
					propagateProfileFonts(id);
				}
			}
			return out;
		},

		getNodePriority(nodeId: string): 'default' | 'high' {
			return priorityByNodeId[nodeId] === 'high' ? 'high' : 'default';
		},

		/**
		 * True when a node does NOT have its own 'high' but inherits 'high' from
		 * an ancestor: its tree-root profile, or a creator/collection that links
		 * to its profile (for both fonts and linked profile pages).
		 */
		isHighInherited(nodeId: string): boolean {
			if (priorityByNodeId[nodeId] === 'high') return false;
			const treeMap = buildTreeMap();
			const treeId = parseTreeId(nodeId);
			const tree = treeMap.get(treeId);
			if (!tree) return false;
			const rootId = getRootNodeId(tree);

			// Font: its own profile root is high
			if (rootId !== nodeId && priorityByNodeId[rootId] === 'high') return true;

			// Find any creator/collection that links to this profile and is high.
			// `nodeId` could itself be a profile root (linked from a creator/collection)
			// or a font (whose tree-root profile is linked from a creator/collection).
			const profileRoot = rootId; // the profile that owns this font, or the page itself
			for (const ownerId of Object.keys(priorityByNodeId)) {
				const role = pageRootRole(ownerId);
				if (role !== 'creator' && role !== 'collection') continue;
				if (getForwardLinkedPageIds(ownerId).has(profileRoot)) return true;
			}
			return false;
		},

		toggleNodePriority(nodeId: string): void {
			// Inherited high cannot be toggled directly — only the source can clear it.
			if (this.isHighInherited(nodeId)) return;

			const next = { ...priorityByNodeId };
			if (next[nodeId] === 'high') {
				delete next[nodeId];
				priorityByNodeId = next;
				return;
			}
			next[nodeId] = 'high';
			priorityByNodeId = next;

			// Auto-select the node if not already selected, so the priority has effect.
			const role = pageRootRole(nodeId);
			if (role === 'creator' || role === 'profile' || role === 'collection') {
				if (!selectedPageIds.has(nodeId)) this.togglePage(nodeId);
			} else {
				// Font (or font-type page): both route through selectedFontIds.
				if (!selectedFontIds.has(nodeId)) this.toggleFont(nodeId);
			}
		},

		setPriorityByNodeId(map: Record<string, 'high'>): void {
			priorityByNodeId = { ...map };
		},

		clearPriorities(): void {
			priorityByNodeId = {};
		},

		toggleLibraryTab(tabId: string): void {
			const next = new Set(libraryTabFilter);
			if (next.has(tabId)) next.delete(tabId);
			else next.add(tabId);
			libraryTabFilter = next;
		},

		setLibraryTabFilter(ids: Set<string>): void {
			libraryTabFilter = new Set(ids);
		},

		clearLibraryTabFilter(): void {
			libraryTabFilter = new Set();
		},

		matchesLibraryTabFilter(nodeId: string): boolean {
			return nodeMatchesLibraryTabs(nodeId);
		},

getAllowedFontNodeIds(): Set<string> {
if (!this.hasFilters) return new Set();

const allowed = new Set<string>();

// If only the library-tab filter is active (no pages/fonts selected explicitly),
// allow every activated font node matching the selected tabs.
if (selectedPageIds.size === 0 && selectedFontIds.size === 0 && libraryTabFilter.size > 0) {
	for (const tree of pageTrees()) {
		for (const fontNode of getFontNodes(tree)) {
			if (isNodeVisible(fontNode.metadata.id)) allowed.add(fontNode.metadata.id);
		}
	}
	return allowed;
}

// Collect fonts from selected pages
for (const pageId of selectedPageIds) {
	const role = pageRootRole(pageId);

	// Creator/collection: expand to linked profiles, with optional profile narrowing.
	if (role === 'creator' || role === 'collection') {
		const linked = getForwardLinkedPageIds(pageId);
		// If any linked profile is itself selected, narrow to those.
		const explicitlySelected = [...linked].filter((pid) => selectedPageIds.has(pid));
		const profilesToInclude = explicitlySelected.length > 0 ? explicitlySelected : [...linked];

		for (const profileId of profilesToInclude) {
			const profileTreeId = parseTreeId(profileId);
			const profileFontIds = fontIdsForTree(profileTreeId);
			// If any font inside this profile is selected, narrow further.
			const selectedFontsInProfile = [...profileFontIds].filter((fid) => selectedFontIds.has(fid));
			if (selectedFontsInProfile.length > 0) {
				for (const fid of selectedFontsInProfile) allowed.add(fid);
			} else {
				for (const fid of profileFontIds) allowed.add(fid);
			}
		}

		// Also include fonts directly inside the creator/collection tree (rare).
		for (const fid of fontIdsForTree(parseTreeId(pageId))) allowed.add(fid);
		continue;
	}

	// Profile (or other) page: same behaviour as before.
	const treeId = parseTreeId(pageId);
	const pageFontIds = fontIdsForTree(treeId);
	const selectedInPage = [...pageFontIds].filter((fid) => selectedFontIds.has(fid));
	if (selectedInPage.length > 0) {
		for (const fid of selectedInPage) allowed.add(fid);
	} else {
		for (const fid of pageFontIds) allowed.add(fid);
	}
}

// Directly selected fonts not covered by any selected page
for (const fontId of selectedFontIds) {
const tree = treeForFont(fontId);
if (!tree) continue;
const rootId = getRootNodeId(tree);
if (selectedPageIds.has(rootId)) continue; // Already covered above
allowed.add(fontId);
}

return allowed;
}
};
}
