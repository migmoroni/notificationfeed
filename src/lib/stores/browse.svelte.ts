/**
 * Browse Store — reactive state for category-based navigation.
 *
 * Supports simultaneous filtering by category trees (subject + content_type + region)
 * with multi-select within each tree. Text search combined with category filters.
 *
 * Entities are TreeNode[] extracted from ContentTrees.
 *
 * Pattern: module-level $state + exported read-only accessor + actions.
 */

import type { Category, CategoryTreeId } from '$lib/domain/category/category.js';
import type { ContentTree, TreeNode } from '$lib/domain/content-tree/content-tree.js';
import { createCategoryStore } from '$lib/persistence/category.store.js';
import { createContentTreeStore } from '$lib/persistence/content-tree.store.js';
import { getEffectiveNodeCategories } from '$lib/domain/shared/category-aggregation.js';

// ── Internal reactive state ────────────────────────────────────────────

interface BrowseStoreState {
categories: Category[];
selectedByTree: Record<CategoryTreeId, Set<string>>;
nodes: TreeNode[];
trees: ContentTree[];
searchQuery: string;
loading: boolean;
}

let state = $state<BrowseStoreState>({
categories: [],
selectedByTree: { subject: new Set(), content_type: new Set(), media_type: new Set(), region: new Set() },
nodes: [],
trees: [],
searchQuery: '',
loading: false
});

const categoryRepo = createCategoryStore();
const treeRepo = createContentTreeStore();

// ── Helpers ────────────────────────────────────────────────────────────

function matchesQuery(text: string, query: string): boolean {
return text.toLowerCase().includes(query.toLowerCase());
}

function expandCategoryIds(selectedIds: Set<string>, allCategories: Category[]): Set<string> {
const expanded = new Set(selectedIds);
for (const catId of selectedIds) {
for (const cat of allCategories) {
if (cat.parentId === catId && cat.isActive) {
expanded.add(cat.id);
}
}
}
return expanded;
}

function assignmentsMatchTree(
assignments: { treeId: string; categoryIds: string[] }[],
treeId: CategoryTreeId,
expandedIds: Set<string>
): boolean {
if (expandedIds.size === 0) return true;
const assignment = assignments.find((a) => a.treeId === treeId);
if (!assignment) return false;
return assignment.categoryIds.some((cid) => expandedIds.has(cid));
}

function nodeMatchesQuery(node: TreeNode, query: string): boolean {
if (!query.trim()) return true;
const h = node.data.header;
return (
matchesQuery(h.title, query) ||
h.tags.some((t) => matchesQuery(t, query)) ||
(h.subtitle ? matchesQuery(h.subtitle, query) : false) ||
(h.summary ? matchesQuery(h.summary, query) : false)
);
}

/** Extract all nodes from all trees */
function extractAllNodes(trees: ContentTree[]): TreeNode[] {
const nodes: TreeNode[] = [];
for (const tree of trees) {
for (const node of Object.values(tree.nodes)) {
nodes.push(node);
}
}
return nodes;
}

// ── Exported accessor ──────────────────────────────────────────────────

export const browse = {
get categories() { return state.categories; },
get selectedByTree() { return state.selectedByTree; },
get nodes() { return state.nodes; },
get trees() { return state.trees; },
get searchQuery() { return state.searchQuery; },
get loading() { return state.loading; },
get hasFilters() {
return (
state.selectedByTree.subject.size > 0 ||
state.selectedByTree.content_type.size > 0 ||
state.selectedByTree.region.size > 0 ||
state.searchQuery.trim().length > 0
);
},

/** Nodes grouped by role for display */
get nodesByRole(): { creators: TreeNode[]; profiles: TreeNode[]; fonts: TreeNode[] } {
const creators: TreeNode[] = [];
const profiles: TreeNode[] = [];
const fonts: TreeNode[] = [];
for (const n of state.nodes) {
switch (n.role) {
case 'creator': creators.push(n); break;
case 'profile': profiles.push(n); break;
case 'font': fonts.push(n); break;
}
}
return { creators, profiles, fonts };
},

getRootCategories(treeId: CategoryTreeId): Category[] {
return state.categories
.filter((c) => c.parentId === null && c.treeId === treeId && c.isActive)
.sort((a, b) => a.order - b.order);
},

getChildren(parentId: string): Category[] {
return state.categories
.filter((c) => c.parentId === parentId && c.isActive)
.sort((a, b) => a.order - b.order);
},

isSelected(categoryId: string, treeId: CategoryTreeId): boolean {
return state.selectedByTree[treeId].has(categoryId);
},

getSelectedCount(treeId: CategoryTreeId): number {
return state.selectedByTree[treeId].size;
},

// ── Actions ──────────────────────────────────────────────────────

async loadCategories(): Promise<void> {
state.loading = true;
try {
state.categories = await categoryRepo.getAll();
} finally {
state.loading = false;
}
},

async toggleCategory(categoryId: string, treeId: CategoryTreeId): Promise<void> {
const current = state.selectedByTree[treeId];
const next = new Set(current);
if (next.has(categoryId)) {
next.delete(categoryId);
} else {
next.add(categoryId);
}
state.selectedByTree = { ...state.selectedByTree, [treeId]: next };
await this.applyFilters();
},

async clearTree(treeId: CategoryTreeId): Promise<void> {
state.selectedByTree = { ...state.selectedByTree, [treeId]: new Set() };
await this.applyFilters();
},

async clearAllCategories(): Promise<void> {
state.selectedByTree = { subject: new Set(), content_type: new Set(), media_type: new Set(), region: new Set() };
await this.applyFilters();
},

async setSearchQuery(query: string): Promise<void> {
state.searchQuery = query;
await this.applyFilters();
},

clearSearch(): void {
state.searchQuery = '';
this.applyFilters();
},

async applyFilters(): Promise<void> {
const hasCategories =
state.selectedByTree.subject.size > 0 ||
state.selectedByTree.content_type.size > 0 ||
state.selectedByTree.region.size > 0;
const hasSearch = state.searchQuery.trim().length > 0;

if (!hasCategories && !hasSearch) {
state.nodes = [];
return;
}

state.loading = true;
try {
const allTrees = await treeRepo.getAll();
state.trees = allTrees;

const allNodes = extractAllNodes(allTrees);

const subjectIds = expandCategoryIds(state.selectedByTree.subject, state.categories);
const contentTypeIds = expandCategoryIds(state.selectedByTree.content_type, state.categories);
const regionIds = expandCategoryIds(state.selectedByTree.region, state.categories);

let matched = allNodes;

if (hasCategories) {
matched = matched.filter((node) => {
// Find the tree this node belongs in
const tree = allTrees.find((t) => node.metadata.id in t.nodes);
const effective = tree
? getEffectiveNodeCategories(node.metadata.id, tree)
: node.data.header.categoryAssignments;

return (
assignmentsMatchTree(effective, 'subject', subjectIds) &&
assignmentsMatchTree(effective, 'content_type', contentTypeIds) &&
assignmentsMatchTree(effective, 'region', regionIds)
);
});
}

if (hasSearch) {
const query = state.searchQuery;
if (hasCategories) {
matched = matched.filter((n) => nodeMatchesQuery(n, query));
} else {
matched = allNodes.filter((n) => nodeMatchesQuery(n, query));
}
}

state.nodes = matched;
} finally {
state.loading = false;
}
},

async searchEntities(query: string): Promise<void> {
return this.setSearchQuery(query);
},

async loadAllNodes(): Promise<void> {
state.loading = true;
try {
const allTrees = await treeRepo.getAll();
state.trees = allTrees;
state.nodes = extractAllNodes(allTrees);
} finally {
state.loading = false;
}
},

clearNodes(): void {
state.nodes = [];
}
};
