/**
 * Browse Store — reactive state for category-based navigation.
 *
 * Supports simultaneous filtering by category trees (subject + content + region)
 * with multi-select within each tree. Text search combined with category filters.
 *
 * Category state is managed by browseCategories (CategoryFilterInstance).
 * This store owns: nodes, trees, search, and the applyFilters() pipeline.
 *
 * Entities are TreeNode[] extracted from ContentTrees.
 *
 * Pattern: module-level $state + exported read-only accessor + actions.
 */

import type { Category, CategoryTreeId } from '$lib/domain/category/category.js';
import type { ContentTree, TreeNode } from '$lib/domain/content-tree/content-tree.js';
import { createContentTreeStore } from '$lib/persistence/content-tree.store.js';
import { getEffectiveNodeCategories } from '$lib/domain/shared/category-aggregation.js';
import { browseCategories } from '$lib/stores/browse-categories.svelte.js';

// ── Internal reactive state ────────────────────────────────────────────

interface BrowseStoreState {
nodes: TreeNode[];
trees: ContentTree[];
searchQuery: string;
loading: boolean;
}

let state = $state<BrowseStoreState>({
nodes: [],
trees: [],
searchQuery: '',
loading: false
});

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
return (
matchesQuery(h.title, query) ||
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
get nodes() { return state.nodes; },
get trees() { return state.trees; },
get searchQuery() { return state.searchQuery; },
get loading() { return state.loading; },

get hasFilters() {
return browseCategories.hasFilters || state.searchQuery.trim().length > 0;
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

// ── Actions ──────────────────────────────────────────────────────

async setSearchQuery(query: string): Promise<void> {
state.searchQuery = query;
await this.applyFilters();
},

clearSearch(): void {
state.searchQuery = '';
this.applyFilters();
},

async applyFilters(): Promise<void> {
const hasCategories = browseCategories.hasFilters;
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

const treeKeys = ['subject', 'content', 'media', 'region', 'language'] as const;

const anyExpanded: Record<CategoryTreeId, Set<string>> = { subject: new Set(), content: new Set(), media: new Set(), region: new Set(), language: new Set() };
const allExpanded: Record<CategoryTreeId, Set<string>> = { subject: new Set(), content: new Set(), media: new Set(), region: new Set(), language: new Set() };

for (const tk of treeKeys) {
const anyIds = new Set<string>();
const allIds = new Set<string>();
for (const [id, mode] of browseCategories.modeByTree[tk]) {
if (mode === 'any') anyIds.add(id);
else allIds.add(id);
}
anyExpanded[tk] = expandCategoryIds(anyIds, browseCategories.categories);
allExpanded[tk] = expandCategoryIds(allIds, browseCategories.categories);
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
