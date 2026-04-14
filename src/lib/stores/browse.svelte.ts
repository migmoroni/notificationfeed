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
import type { CategoryFilterMode } from '$lib/stores/category-tree.types.js';
import { createCategoryStore } from '$lib/persistence/category.store.js';
import { createContentTreeStore } from '$lib/persistence/content-tree.store.js';
import { getEffectiveNodeCategories } from '$lib/domain/shared/category-aggregation.js';
import { consumer } from '$lib/stores/consumer.svelte.js';

// ── Internal reactive state ────────────────────────────────────────────

type TreeModes = Record<CategoryTreeId, Map<string, CategoryFilterMode>>;

function emptyTreeModes(): TreeModes {
return { subject: new Map(), content_type: new Map(), media_type: new Map(), region: new Map() };
}

interface BrowseStoreState {
categories: Category[];
modeByTree: TreeModes;
nodes: TreeNode[];
trees: ContentTree[];
searchQuery: string;
loading: boolean;
}

let state = $state<BrowseStoreState>({
categories: [],
modeByTree: emptyTreeModes(),
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
if (cat.parentId === catId) {
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

/** ALL mode: every selected category must be present in the node's assignments. */
function assignmentsMatchTreeAll(
assignments: { treeId: string; categoryIds: string[] }[],
treeId: CategoryTreeId,
expandedIds: Set<string>
): boolean {
if (expandedIds.size === 0) return true;
const assignment = assignments.find((a) => a.treeId === treeId);
if (!assignment) return false;
return [...expandedIds].every((cid) => assignment.categoryIds.includes(cid));
}

function nodeMatchesQuery(node: TreeNode, query: string): boolean {
if (!query.trim()) return true;
const h = node.data.header;
const nodeId = node.metadata.id;
const tagNames = consumer.getNodeTagNames(nodeId);
return (
matchesQuery(h.title, query) ||
tagNames.some((t) => matchesQuery(t, query)) ||
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
get modeByTree() { return state.modeByTree; },
get nodes() { return state.nodes; },
get trees() { return state.trees; },
get searchQuery() { return state.searchQuery; },
get loading() { return state.loading; },

get supportsFilterMode(): true { return true; },

getFilterMode(categoryId: string, treeId: CategoryTreeId): CategoryFilterMode | undefined {
return state.modeByTree[treeId].get(categoryId);
},

get hasFilters() {
return (
state.modeByTree.subject.size > 0 ||
state.modeByTree.content_type.size > 0 ||
state.modeByTree.media_type.size > 0 ||
state.modeByTree.region.size > 0 ||
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
.filter((c) => c.parentId === null && c.treeId === treeId)
.sort((a, b) => a.order - b.order);
},

getChildren(parentId: string): Category[] {
return state.categories
.filter((c) => c.parentId === parentId)
.sort((a, b) => a.order - b.order);
},

isSelected(categoryId: string, treeId: CategoryTreeId): boolean {
return state.modeByTree[treeId].has(categoryId);
},

getSelectedCount(treeId: CategoryTreeId): number {
return state.modeByTree[treeId].size;
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
const current = state.modeByTree[treeId];
const next = new Map(current);
const mode = next.get(categoryId);

if (mode === undefined) {
next.set(categoryId, 'any');
} else if (mode === 'any') {
next.set(categoryId, 'all');
} else {
next.delete(categoryId);
}

state.modeByTree = { ...state.modeByTree, [treeId]: next };
await this.applyFilters();
},

async clearTree(treeId: CategoryTreeId): Promise<void> {
state.modeByTree = { ...state.modeByTree, [treeId]: new Map() };
await this.applyFilters();
},

async clearAllCategories(): Promise<void> {
state.modeByTree = emptyTreeModes();
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
state.modeByTree.subject.size > 0 ||
state.modeByTree.content_type.size > 0 ||
state.modeByTree.media_type.size > 0 ||
state.modeByTree.region.size > 0;
const hasSearch = state.searchQuery.trim().length > 0;

if (!hasCategories && !hasSearch) {
await this.loadAllNodes();
return;
}

state.loading = true;
try {
const allTrees = await treeRepo.getAll();
state.trees = allTrees;

const allNodes = extractAllNodes(allTrees);

// Split selected IDs by mode per tree, then expand for children
const treeKeys = ['subject', 'content_type', 'media_type', 'region'] as const;

const anyExpanded: Record<CategoryTreeId, Set<string>> = { subject: new Set(), content_type: new Set(), media_type: new Set(), region: new Set() };
const allExpanded: Record<CategoryTreeId, Set<string>> = { subject: new Set(), content_type: new Set(), media_type: new Set(), region: new Set() };

for (const tk of treeKeys) {
const anyIds = new Set<string>();
const allIds = new Set<string>();
for (const [id, mode] of state.modeByTree[tk]) {
if (mode === 'any') anyIds.add(id);
else allIds.add(id);
}
anyExpanded[tk] = expandCategoryIds(anyIds, state.categories);
allExpanded[tk] = expandCategoryIds(allIds, state.categories);
}

let matched = allNodes;

if (hasCategories) {
matched = matched.filter((node) => {
const tree = allTrees.find((t) => node.metadata.id in t.nodes);
const effective = tree
? getEffectiveNodeCategories(node.metadata.id, tree)
: node.data.header.categoryAssignments;

for (const tk of treeKeys) {
const hasAny = anyExpanded[tk].size > 0;
const hasAll = allExpanded[tk].size > 0;
if (!hasAny && !hasAll) continue;

if (hasAny && !assignmentsMatchTree(effective, tk, anyExpanded[tk])) return false;
if (hasAll && !assignmentsMatchTreeAll(effective, tk, allExpanded[tk])) return false;
}
return true;
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
