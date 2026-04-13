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
}

export interface EntityFilterOptions {
	/** When true, only one page (tree) can be selected at a time. */
	singlePageSelect?: boolean;
}

// ── Factory ────────────────────────────────────────────────────────────

export function createEntityFilter(source: EntityFilterDataSource, options?: EntityFilterOptions): EntityFilterStore {
const singlePageSelect = options?.singlePageSelect ?? false;
let pageTypeFilter = $state<Set<PageType>>(new Set(ALL_PAGE_TYPES));
let selectedPageIds = $state<Set<string>>(new Set());
let selectedFontIds = $state<Set<string>>(new Set());

// ── Internal helpers ───────────────────────────────────────────────

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
return selectedPageIds.size > 0 || selectedFontIds.size > 0;
},

get totalSelected(): number {
return selectedPageIds.size + selectedFontIds.size;
},

async loadNodes(): Promise<void> {
await source.load();
},

setPageTypeFilter(types: Set<PageType>): void {
pageTypeFilter = new Set(types);
// Deselect pages that no longer match the type filter
const next = new Set(selectedPageIds);
const nextFonts = new Set(selectedFontIds);
for (const pid of next) {
const role = pageRootRole(pid);
if (role !== null && !types.has(role)) {
next.delete(pid);
// Also remove fonts from this page
const treeId = parseTreeId(pid);
for (const fid of fontIdsForTree(treeId)) {
nextFonts.delete(fid);
}
}
}
selectedPageIds = next;
selectedFontIds = nextFonts;
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
				if (source.isNodeActivated && !source.isNodeActivated(rootId)) continue;
				const pt = rootPageType(tree);
				if (!pt) continue;
				const activeFontCount = source.isNodeActivated
					? getFontNodes(tree).filter((n) => source.isNodeActivated!(n.metadata.id)).length
					: getFontNodes(tree).length;
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
			if (source.isNodeActivated && !source.isNodeActivated(fontNode.metadata.id)) continue;
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
				.filter((node) => !source.isNodeActivated || source.isNodeActivated(node.metadata.id))
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
				if (source.isNodeActivated && !source.isNodeActivated(linkedRootId)) continue;
				const pt = rootPageType(linkedTree);
				const activeFontCount = source.isNodeActivated
					? getFontNodes(linkedTree).filter((n) => source.isNodeActivated!(n.metadata.id)).length
					: getFontNodes(linkedTree).length;
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
const next = new Set(selectedFontIds);
if (next.has(nodeId)) {
next.delete(nodeId);
} else {
next.add(nodeId);
}
selectedFontIds = next;
},

clearAll(): void {
selectedPageIds = new Set();
selectedFontIds = new Set();
},

getAllowedFontNodeIds(): Set<string> {
if (!this.hasFilters) return new Set();

const allowed = new Set<string>();

// Collect fonts from selected pages
for (const pageId of selectedPageIds) {
const treeId = parseTreeId(pageId);
const pageFontIds = fontIdsForTree(treeId);
// If there are font-level selections within this page, use them
const selectedInPage = [...pageFontIds].filter((fid) => selectedFontIds.has(fid));
if (selectedInPage.length > 0) {
for (const fid of selectedInPage) allowed.add(fid);
} else {
// No font-level refinement: all fonts in page
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
