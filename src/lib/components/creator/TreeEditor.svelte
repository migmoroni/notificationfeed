<script lang="ts">
import type { TreeNode, NodeRole, NodeHeader, NodeBody } from '$lib/domain/content-tree/content-tree.js';
import type { ContentTree, TreeSection, FontBody, TreeLinkBody } from '$lib/domain/content-tree/content-tree.js';
import { getRootNode as domainGetRootNode } from '$lib/domain/content-tree/content-tree.js';
import { creator } from '$lib/stores/creator.svelte.js';
import { getMediaPreviewUrl } from '$lib/services/media.service.js';
import { Button } from '$lib/components/ui/button/index.js';
import { Badge } from '$lib/components/ui/badge/index.js';
import { Input } from '$lib/components/ui/input/index.js';
import { Separator } from '$lib/components/ui/separator/index.js';
import * as Collapsible from '$lib/components/ui/collapsible/index.js';
import NodeForm from './NodeForm.svelte';
import ConfirmDialog from '$lib/components/shared/dialog/ConfirmDialog.svelte';
import EmojiPicker from '$lib/components/shared/EmojiPicker.svelte';
import * as Dialog from '$lib/components/ui/dialog/index.js';
import Smile from '@lucide/svelte/icons/smile';
import Plus from '@lucide/svelte/icons/plus';
import ChevronDown from '@lucide/svelte/icons/chevron-down';
import ChevronRight from '@lucide/svelte/icons/chevron-right';
import Pencil from '@lucide/svelte/icons/pencil';
import Trash2 from '@lucide/svelte/icons/trash-2';
import Rss from '@lucide/svelte/icons/rss';
import Atom from '@lucide/svelte/icons/atom';
import Zap from '@lucide/svelte/icons/zap';
import User from '@lucide/svelte/icons/user';
import Link2 from '@lucide/svelte/icons/link-2';
import FolderPlus from '@lucide/svelte/icons/folder-plus';
import X from '@lucide/svelte/icons/x';
import ArrowUp from '@lucide/svelte/icons/arrow-up';
import ArrowDown from '@lucide/svelte/icons/arrow-down';

const SECTION_COLORS = [
'#e74c3c', '#e91e90', '#c0392b', '#ad1457',
'#f39c12', '#e67e22', '#d4a017', '#ff7043',
'#2ecc71', '#27ae60', '#0d9488', '#16a085',
'#3498db', '#2980b9', '#0284c7', '#06b6d4',
'#8e44ad', '#7c3aed', '#6366f1', '#a855f7'
];

interface Props {
treeId: string;
}

let { treeId }: Props = $props();

// ─── Derived state ───────────────────────────────────────────────

let tree = $derived(creator.allTrees.find((t) => t.metadata.id === treeId)!);

/** Root role determines what children this tree can have */
let rootRole = $derived.by(() => {
if (!tree) return 'creator' as NodeRole;
const root = domainGetRootNode(tree);
return root?.role ?? 'creator';
});

/**
 * Available trees for tree-link nodes:
 * - creator root → profile trees
 * - collection root → profile + creator trees
 * Excludes the current tree and trees already linked.
 */
let availableTreesForLink = $derived.by(() => {
if (!tree) return [];
const linkedTreeIds = new Set(
Object.values(tree.nodes)
.filter((n) => n.role === 'tree')
.map((n) => (n.data.body as TreeLinkBody).instanceTreeId)
);
const allowedRoles: NodeRole[] = rootRole === 'collection' ? ['profile', 'creator'] : ['profile'];
return creator.trees.filter((t) => {
if (t.metadata.id === treeId) return false;
if (linkedTreeIds.has(t.metadata.id)) return false;
const root = domainGetRootNode(t);
return root ? allowedRoles.includes(root.role) : false;
});
});

/** Get nodeIds in a path key, resolving to TreeNode entries */
function nodesInPath(pathKey: string): { nodeId: string; node: TreeNode }[] {
if (!tree) return [];
const ids = tree.paths[pathKey];
if (!Array.isArray(ids)) return [];
return ids
.map((id) => ({ nodeId: id, node: tree.nodes[id] }))
.filter((e): e is { nodeId: string; node: TreeNode } => !!e.node);
}

/** Profile nodes in a given path key */
function profilesInPath(pathKey: string): { nodeId: string; node: TreeNode }[] {
return nodesInPath(pathKey).filter((e) => e.node.role === 'profile');
}

/** Font nodes in a given path key */
function fontsInPath(pathKey: string): { nodeId: string; node: TreeNode }[] {
return nodesInPath(pathKey).filter((e) => e.node.role === 'font');
}

/** All profile nodes across all paths (excluding root) */
let allProfiles = $derived.by(() => {
if (!tree) return [];
const result: { nodeId: string; node: TreeNode; pathKey: string }[] = [];
for (const [key, value] of Object.entries(tree.paths)) {
if (key === '/') continue;
if (!Array.isArray(value)) continue;
for (const nid of value) {
const node = tree.nodes[nid];
if (node?.role === 'profile') result.push({ nodeId: nid, node, pathKey: key });
}
}
return result;
});

/** Font nodes that share the same pathKey as a given profile */
function fontsForProfile(profilePathKey: string): { nodeId: string; node: TreeNode }[] {
return fontsInPath(profilePathKey);
}

/** Tree-link nodes in a given path key */
function treeLinksInPath(pathKey: string): { nodeId: string; node: TreeNode }[] {
return nodesInPath(pathKey).filter((e) => e.node.role === 'tree');
}

/** All tree-link nodes across all paths (for creator/collection root) */
let allTreeLinks = $derived.by(() => {
if (!tree) return [];
const result: { nodeId: string; node: TreeNode; pathKey: string }[] = [];
for (const [key, value] of Object.entries(tree.paths)) {
if (key === '/') continue;
if (!Array.isArray(value)) continue;
for (const nid of value) {
const node = tree.nodes[nid];
if (node?.role === 'tree') result.push({ nodeId: nid, node, pathKey: key });
}
}
return result;
});

/** All font nodes across all paths (for profile root) */
let allFonts = $derived.by(() => {
if (!tree) return [];
const result: { nodeId: string; node: TreeNode; pathKey: string }[] = [];
for (const [key, value] of Object.entries(tree.paths)) {
if (key === '/') continue;
if (!Array.isArray(value)) continue;
for (const nid of value) {
const node = tree.nodes[nid];
if (node?.role === 'font') result.push({ nodeId: nid, node, pathKey: key });
}
}
return result;
});

/** Resolve the linked tree's root node title for display */
function getLinkedTreeTitle(node: TreeNode): string {
const body = node.data.body as TreeLinkBody;
const linkedTree = creator.trees.find((t) => t.metadata.id === body.instanceTreeId);
if (!linkedTree) return node.data.header.title || '(não encontrada)';
const root = domainGetRootNode(linkedTree);
return root?.data.header.title ?? node.data.header.title;
}

/** The child role name for display depending on root role */
let childLabel = $derived(
rootRole === 'profile' ? 'Fonts' :
rootRole === 'creator' ? 'Links' :
rootRole === 'collection' ? 'Links' : 'Itens'
);

/** What items count to show in the header */
let childCount = $derived(
rootRole === 'profile' ? allFonts.length :
(rootRole === 'creator' || rootRole === 'collection') ? allTreeLinks.length :
allProfiles.length
);

// ─── UI state ────────────────────────────────────────────────────

let showAddProfile = $state(false);
let showAddChild = $state(false);
let addToSectionId = $state<string | null>(null);
let editingNodeId = $state<string | null>(null);
let addFontToPath = $state<string | null>(null);
let deleteConfirm = $state<{ type: 'node' | 'section'; nodeId?: string; sectionId?: string; title: string } | null>(null);
let expandedProfiles = $state<Set<string>>(new Set());
let saving = $state(false);

// Section inline creation state
let addingSection = $state(false);
let newSectionTitle = $state('');
let newSectionColor = $state(SECTION_COLORS[0]);
let newSectionEmoji = $state('🗂️');
let newSectionHideTitle = $state(false);

let emojiDialogTarget = $state<'new' | 'edit' | null>(null);
let pendingSectionEmoji = $state('');

// Section editing state
let editingSectionId = $state<string | null>(null);
let editSectionTitle = $state('');
let editSectionColor = $state('');
let editSectionEmoji = $state('🗂️');
let editSectionHideTitle = $state(false);

function toggleExpand(nodeId: string) {
const next = new Set(expandedProfiles);
if (next.has(nodeId)) next.delete(nodeId);
else next.add(nodeId);
expandedProfiles = next;
}

function getNodeAvatar(node: TreeNode): { type: 'image'; url: string } | { type: 'emoji'; emoji: string } | null {
if (node.data.header.coverEmoji) return { type: 'emoji', emoji: node.data.header.coverEmoji };
if (!node.data.header.coverMediaId) return null;
const media = creator.getMediaById(node.data.header.coverMediaId);
return media ? { type: 'image', url: getMediaPreviewUrl(media) } : null;
}

// ─── Section CRUD ────────────────────────────────────────────────

async function handleCreateSection() {
const title = newSectionTitle.trim();
if (!title || title.length > 30) return;

saving = true;
try {
await creator.addSection(treeId, {
title,
color: newSectionColor,
symbol: newSectionEmoji,
hideTitle: newSectionHideTitle,
order: tree.sections.length
});
newSectionTitle = '';
newSectionColor = SECTION_COLORS[(tree.sections.length + 1) % SECTION_COLORS.length];
newSectionEmoji = '🗂️';
newSectionHideTitle = false;
addingSection = false;
} finally {
saving = false;
}
}

function startEditSection(section: TreeSection) {
editingSectionId = section.id;
editSectionTitle = section.title;
editSectionColor = section.color;
editSectionEmoji = section.symbol ?? '🗂️';
editSectionHideTitle = section.hideTitle;
}

async function handleUpdateSection() {
if (!editingSectionId) return;
const title = editSectionTitle.trim();
if (!title || title.length > 30) return;

saving = true;
try {
await creator.updateSection(treeId, editingSectionId, {
title,
color: editSectionColor,
symbol: editSectionEmoji,
hideTitle: editSectionHideTitle
});
editingSectionId = null;
} finally {
saving = false;
}
}

async function handleDeleteSection(sectionId: string) {
await creator.deleteSection(treeId, sectionId);
deleteConfirm = null;
}

async function handleMoveSectionUp(section: TreeSection) {
const idx = tree.sections.findIndex((s) => s.id === section.id);
if (idx <= 0) return;
const ids = tree.sections.map((s) => s.id);
[ids[idx - 1], ids[idx]] = [ids[idx], ids[idx - 1]];
await creator.reorderSections(treeId, ids);
}

async function handleMoveSectionDown(section: TreeSection) {
const idx = tree.sections.findIndex((s) => s.id === section.id);
if (idx < 0 || idx >= tree.sections.length - 1) return;
const ids = tree.sections.map((s) => s.id);
[ids[idx], ids[idx + 1]] = [ids[idx + 1], ids[idx]];
await creator.reorderSections(treeId, ids);
}

async function moveNodeToSection(nodeId: string, fromPath: string, toSectionId: string | null) {
const toPath = toSectionId ?? '*';
if (fromPath === toPath) return;
await creator.moveNodeToPath(treeId, nodeId, fromPath, toPath);
}

// ─── Node CRUD ───────────────────────────────────────────────────

async function handleAddProfile(data: { header: NodeHeader; body: NodeBody }) {
saving = true;
try {
const path = addToSectionId ?? '*';
await creator.createNode(treeId, 'profile', data.header, data.body, path);
showAddProfile = false;
addToSectionId = null;
} finally {
saving = false;
}
}

async function handleUpdateNode(nodeId: string, data: { header: NodeHeader; body: NodeBody }) {
saving = true;
try {
await creator.updateNodeHeader(treeId, nodeId, data.header);
await creator.updateNodeBody(treeId, nodeId, data.body);
editingNodeId = null;
} finally {
saving = false;
}
}

async function handleDeleteNode(nodeId: string) {
await creator.deleteNode(treeId, nodeId);
deleteConfirm = null;
}

async function handleAddFont(pathKey: string, data: { header: NodeHeader; body: NodeBody }) {
saving = true;
try {
await creator.createNode(treeId, 'font', data.header, data.body, pathKey);
addFontToPath = null;
} finally {
saving = false;
}
}

/** Add a tree-link child (for creator/collection roots) */
async function handleAddTreeLink(data: { header: NodeHeader; body: NodeBody }) {
saving = true;
try {
const path = addToSectionId ?? '*';
await creator.createNode(treeId, 'tree', data.header, data.body, path);
showAddChild = false;
addToSectionId = null;
} finally {
saving = false;
}
}

/** Add a font directly (for profile roots) */
async function handleAddFontDirect(data: { header: NodeHeader; body: NodeBody }) {
saving = true;
try {
const path = addToSectionId ?? '*';
await creator.createNode(treeId, 'font', data.header, data.body, path);
showAddChild = false;
addToSectionId = null;
} finally {
saving = false;
}
}
</script>

<!-- ═══ Font card snippet ═══ -->
{#snippet fontCard(entry: { nodeId: string; node: TreeNode; pathKey?: string })}
{@const node = entry.node}
{@const fontBody = node.data.body as FontBody}
{@const avatar = getNodeAvatar(node)}
<div class="flex items-center gap-2 px-3 py-2 rounded-md border bg-background text-sm">
{#if avatar?.type === 'image'}
<div class="shrink-0 w-7 h-7 rounded overflow-hidden bg-muted">
<img src={avatar.url} alt="" class="w-full h-full object-cover" />
</div>
{:else if avatar?.type === 'emoji'}
<div class="shrink-0 w-7 h-7 rounded bg-muted flex items-center justify-center text-base">
{avatar.emoji}
</div>
{:else}
<div class="shrink-0 w-7 h-7 rounded bg-muted flex items-center justify-center text-muted-foreground">
{#if fontBody.protocol === 'atom'}
<Atom class="size-3.5" />
{:else if fontBody.protocol === 'nostr'}
<Zap class="size-3.5" />
{:else}
<Rss class="size-3.5" />
{/if}
</div>
{/if}
<span class="flex-1 truncate">{node.data.header.title}</span>
<Badge variant="outline" class="text-[10px] uppercase">{fontBody.protocol}</Badge>
{#if entry.pathKey && tree.sections.length > 0}
<select
class="h-6 text-[10px] rounded border bg-background px-1"
value={entry.pathKey === '*' ? '' : entry.pathKey}
onclick={(e) => e.stopPropagation()}
onchange={(e) => { e.stopPropagation(); moveNodeToSection(entry.nodeId, entry.pathKey!, e.currentTarget.value || null); }}
>
<option value="">Sem seção</option>
{#each tree.sections as s}
<option value={s.id}>{s.title}</option>
{/each}
</select>
{/if}
<button type="button" class="p-1 hover:bg-accent rounded" onclick={() => (editingNodeId = entry.nodeId)}>
<Pencil class="size-3 text-muted-foreground" />
</button>
<button type="button" class="p-1 hover:bg-destructive/10 rounded" onclick={() => (deleteConfirm = { type: 'node', nodeId: entry.nodeId, title: node.data.header.title })}>
<Trash2 class="size-3 text-destructive" />
</button>
</div>

{#if editingNodeId === entry.nodeId}
<div class="border rounded-lg p-3 bg-muted/20">
<NodeForm
mode="edit"
role="font"
initialHeader={node.data.header}
initialBody={node.data.body}
onsave={(data) => handleUpdateNode(entry.nodeId, data)}
oncancel={() => (editingNodeId = null)}
{saving}
/>
</div>
{/if}
{/snippet}

<!-- ═══ Tree-link card snippet ═══ -->
{#snippet treeLinkCard(entry: { nodeId: string; node: TreeNode; pathKey?: string })}
{@const node = entry.node}
{@const linkBody = node.data.body as TreeLinkBody}
{@const linkedTitle = getLinkedTreeTitle(node)}
{@const linkedTree = creator.trees.find((t) => t.metadata.id === linkBody.instanceTreeId)}
{@const linkedRoot = linkedTree ? domainGetRootNode(linkedTree) : null}
{@const avatar = getNodeAvatar(node)}

<div class="flex items-center gap-2 px-3 py-2 rounded-md border bg-background text-sm">
{#if avatar?.type === 'image'}
<div class="shrink-0 w-7 h-7 rounded overflow-hidden bg-muted">
<img src={avatar.url} alt="" class="w-full h-full object-cover" />
</div>
{:else if avatar?.type === 'emoji'}
<div class="shrink-0 w-7 h-7 rounded bg-muted flex items-center justify-center text-base">
{avatar.emoji}
</div>
{:else}
<div class="shrink-0 w-7 h-7 rounded bg-muted flex items-center justify-center text-muted-foreground">
<Link2 class="size-3.5" />
</div>
{/if}
<span class="flex-1 truncate">{linkedTitle}</span>
{#if linkedRoot}
<Badge variant="outline" class="text-[10px] uppercase">{linkedRoot.role}</Badge>
{:else}
<Badge variant="destructive" class="text-[10px]">não encontrada</Badge>
{/if}
{#if entry.pathKey && tree.sections.length > 0}
<select
class="h-6 text-[10px] rounded border bg-background px-1"
value={entry.pathKey === '*' ? '' : entry.pathKey}
onclick={(e) => e.stopPropagation()}
onchange={(e) => { e.stopPropagation(); moveNodeToSection(entry.nodeId, entry.pathKey!, e.currentTarget.value || null); }}
>
<option value="">Sem seção</option>
{#each tree.sections as s}
<option value={s.id}>{s.title}</option>
{/each}
</select>
{/if}
<button type="button" class="p-1 hover:bg-accent rounded" onclick={() => (editingNodeId = entry.nodeId)}>
<Pencil class="size-3 text-muted-foreground" />
</button>
<button type="button" class="p-1 hover:bg-destructive/10 rounded" onclick={() => (deleteConfirm = { type: 'node', nodeId: entry.nodeId, title: linkedTitle })}>
<Trash2 class="size-3 text-destructive" />
</button>
</div>

{#if editingNodeId === entry.nodeId}
<div class="border rounded-lg p-3 bg-muted/20">
<NodeForm
mode="edit"
role="tree"
initialHeader={node.data.header}
initialBody={node.data.body}
availableTrees={availableTreesForLink}
onsave={(data) => handleUpdateNode(entry.nodeId, data)}
oncancel={() => (editingNodeId = null)}
{saving}
/>
</div>
{/if}
{/snippet}

<!-- ═══ Font list in a path key ═══ -->
{#snippet fontList(pathKey: string)}
{@const fonts = fontsInPath(pathKey)}

<div class="space-y-2">
<div class="flex items-center justify-between">
<span class="text-xs font-medium text-muted-foreground">Fonts ({fonts.length})</span>
<Button variant="ghost" size="sm" class="h-7 text-xs" onclick={() => (addFontToPath = pathKey)}>
<Plus class="size-3 mr-1" />
Font
</Button>
</div>

{#each fonts as entry (entry.nodeId)}
{@render fontCard(entry)}
{/each}

{#if addFontToPath === pathKey}
<div class="border rounded-lg p-3 bg-muted/20">
<NodeForm
mode="create"
role="font"
onsave={(data) => handleAddFont(pathKey, data)}
oncancel={() => (addFontToPath = null)}
{saving}
/>
</div>
{/if}

{#if fonts.length === 0 && addFontToPath !== pathKey}
<p class="text-xs text-muted-foreground text-center py-2">Nenhuma font. Adicione uma feed source.</p>
{/if}
</div>
{/snippet}

<!-- ═══ Profile card snippet ═══ -->
{#snippet profileCard(entry: { nodeId: string; node: TreeNode; pathKey: string })}
{@const node = entry.node}
{@const fonts = fontsForProfile(entry.pathKey)}
{@const isExpanded = expandedProfiles.has(entry.nodeId)}
{@const avatar = getNodeAvatar(node)}

<div class="border rounded-lg">
<div
role="button"
tabindex="0"
class="w-full flex items-center gap-2 px-4 py-3 text-left hover:bg-muted/50 transition-colors cursor-pointer"
onclick={() => toggleExpand(entry.nodeId)}
onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleExpand(entry.nodeId); } }}
>
{#if isExpanded}
<ChevronDown class="size-4 shrink-0 text-muted-foreground" />
{:else}
<ChevronRight class="size-4 shrink-0 text-muted-foreground" />
{/if}
{#if avatar?.type === 'image'}
<div class="shrink-0 w-8 h-8 rounded-md overflow-hidden bg-muted">
<img src={avatar.url} alt="" class="w-full h-full object-cover" />
</div>
{:else if avatar?.type === 'emoji'}
<div class="shrink-0 w-8 h-8 rounded-md bg-muted flex items-center justify-center text-lg">
{avatar.emoji}
</div>
{:else}
<div class="shrink-0 w-8 h-8 rounded-md bg-muted flex items-center justify-center text-muted-foreground">
<User class="size-4" />
</div>
{/if}
<span class="font-medium text-sm flex-1">{node.data.header.title}</span>
<Badge variant="outline" class="text-xs">{fonts.length} font{fonts.length !== 1 ? 's' : ''}</Badge>
{#if tree.sections.length > 0}
<select
class="h-6 text-[10px] rounded border bg-background px-1"
value={entry.pathKey === '*' ? '' : entry.pathKey}
onclick={(e) => e.stopPropagation()}
onchange={(e) => { e.stopPropagation(); moveNodeToSection(entry.nodeId, entry.pathKey, e.currentTarget.value || null); }}
>
<option value="">Sem seção</option>
{#each tree.sections as s}
<option value={s.id}>{s.title}</option>
{/each}
</select>
{/if}
<button
type="button"
class="p-1 hover:bg-accent rounded"
onclick={(e) => { e.stopPropagation(); editingNodeId = entry.nodeId; expandedProfiles = new Set([...expandedProfiles, entry.nodeId]); }}
>
<Pencil class="size-3.5 text-muted-foreground" />
</button>
<button
type="button"
class="p-1 hover:bg-destructive/10 rounded"
onclick={(e) => { e.stopPropagation(); deleteConfirm = { type: 'node', nodeId: entry.nodeId, title: node.data.header.title }; }}
>
<Trash2 class="size-3.5 text-destructive" />
</button>
</div>

{#if isExpanded}
<div class="px-4 pb-4 space-y-3">
<Separator />

{#if editingNodeId === entry.nodeId}
<NodeForm
mode="edit"
role="profile"
initialHeader={node.data.header}
initialBody={node.data.body}
onsave={(data) => handleUpdateNode(entry.nodeId, data)}
oncancel={() => (editingNodeId = null)}
{saving}
/>
{/if}

{@render fontList(entry.pathKey)}
</div>
{/if}
</div>
{/snippet}

<!-- ═══ Section editing snippet ═══ -->
{#snippet sectionEditor(section: TreeSection)}
<div class="border rounded-lg p-4 space-y-3" style="border-left: 4px solid {section.color};">
<p class="text-xs font-medium text-muted-foreground">Editar seção</p>
<div class="flex items-center gap-2">
<button type="button" class="text-xl shrink-0 w-8 h-8 flex items-center justify-center rounded hover:bg-accent" title="Escolher ícone" onclick={() => { pendingSectionEmoji = editSectionEmoji; emojiDialogTarget = 'edit'; }}>
{editSectionEmoji}
</button>
<Input class="h-8 text-sm flex-1" maxlength={30} bind:value={editSectionTitle} onkeydown={(e) => { if (e.key === 'Enter') handleUpdateSection(); }} />
<Button variant="outline" size="sm" disabled={saving || !editSectionTitle.trim()} onclick={() => handleUpdateSection()}>Salvar</Button>
<button type="button" class="p-1 hover:bg-accent rounded" onclick={() => (editingSectionId = null)}>
<X class="size-4" />
</button>
</div>
<div class="space-y-1.5">
<span class="text-xs text-muted-foreground">Cor</span>
<div class="flex flex-wrap gap-1.5">
{#each SECTION_COLORS as c}
<button type="button" aria-label="Cor {c}" class="w-6 h-6 rounded-full transition-all" style="background:{c}; {editSectionColor === c ? 'box-shadow:0 0 0 2px var(--background), 0 0 0 4px ' + c + '; transform:scale(1.15)' : ''}" onclick={() => (editSectionColor = c)}></button>
{/each}
</div>
</div>
<label class="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer select-none">
<input type="checkbox" class="rounded" bind:checked={editSectionHideTitle} />
Ocultar título na visualização
</label>
</div>
{/snippet}

<!-- ═══ Main template ═══ -->
<div class="space-y-4">
<!-- Header -->
<div class="flex items-center justify-between">
<h3 class="text-sm font-semibold">{childLabel} ({childCount})</h3>
<div class="flex gap-1">
<Button variant="outline" size="sm" onclick={() => (addingSection = true)}>
<FolderPlus class="size-4 mr-1" />
Seção
</Button>
{#if rootRole === 'creator' || rootRole === 'collection'}
<Button variant="outline" size="sm" onclick={() => { showAddChild = true; addToSectionId = null; }}>
<Plus class="size-4 mr-1" />
Link
</Button>
{:else if rootRole === 'profile'}
<Button variant="outline" size="sm" onclick={() => { showAddChild = true; addToSectionId = null; }}>
<Plus class="size-4 mr-1" />
Font
</Button>
{:else}
<Button variant="outline" size="sm" onclick={() => { showAddProfile = true; addToSectionId = null; }}>
<Plus class="size-4 mr-1" />
Profile
</Button>
{/if}
</div>
</div>

<!-- Inline section creation -->
{#if addingSection}
<div class="border rounded-lg p-4 bg-muted/20 space-y-3">
<p class="text-xs font-medium text-muted-foreground">Nova seção</p>
<div class="flex items-center gap-2">
<button type="button" class="text-xl shrink-0 w-8 h-8 flex items-center justify-center rounded hover:bg-accent" title="Escolher ícone" onclick={() => { pendingSectionEmoji = newSectionEmoji; emojiDialogTarget = 'new'; }}>
{newSectionEmoji}
</button>
<Input
class="h-8 text-sm flex-1"
placeholder="Nome da seção"
maxlength={30}
bind:value={newSectionTitle}
onkeydown={(e) => { if (e.key === 'Enter') handleCreateSection(); }}
/>
<Button variant="outline" size="sm" disabled={saving || !newSectionTitle.trim()} onclick={() => handleCreateSection()}>
Criar
</Button>
<button type="button" class="p-1 hover:bg-accent rounded" onclick={() => (addingSection = false)}>
<X class="size-4" />
</button>
</div>
<div class="space-y-1.5">
<span class="text-xs text-muted-foreground">Cor</span>
<div class="flex flex-wrap gap-1.5">
{#each SECTION_COLORS as c}
<button
type="button"
aria-label="Cor {c}"
class="w-6 h-6 rounded-full transition-all"
style="background:{c}; {newSectionColor === c ? 'box-shadow:0 0 0 2px var(--background), 0 0 0 4px ' + c + '; transform:scale(1.15)' : ''}"
onclick={() => (newSectionColor = c)}
></button>
{/each}
</div>
</div>
<label class="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer select-none">
<input type="checkbox" class="rounded" bind:checked={newSectionHideTitle} />
Ocultar título na visualização
</label>
</div>
{/if}

<!-- Add child form (role-aware) -->
{#if showAddChild}
<div class="border rounded-lg p-4 bg-muted/30">
{#if rootRole === 'creator' || rootRole === 'collection'}
<NodeForm
mode="create"
role="tree"
availableTrees={availableTreesForLink}
onsave={(data) => handleAddTreeLink(data)}
oncancel={() => (showAddChild = false)}
{saving}
/>
{:else if rootRole === 'profile'}
<NodeForm
mode="create"
role="font"
onsave={(data) => handleAddFontDirect(data)}
oncancel={() => (showAddChild = false)}
{saving}
/>
{/if}
</div>
{/if}

<!-- Add profile form (legacy for unsupported root roles) -->
{#if showAddProfile}
<div class="border rounded-lg p-4 bg-muted/30">
<NodeForm
mode="create"
role="profile"
onsave={(data) => handleAddProfile(data)}
oncancel={() => (showAddProfile = false)}
{saving}
/>
</div>
{/if}

{#if childCount === 0 && !showAddChild && !showAddProfile && tree.sections.length === 0}
<p class="text-sm text-muted-foreground text-center py-4">
{#if rootRole === 'profile'}
Nenhuma font ainda. Adicione uma feed source.
{:else if rootRole === 'creator' || rootRole === 'collection'}
Nenhum link ainda. Vincule uma página.
{:else}
Nenhum profile ainda. Adicione um para começar.
{/if}
</p>
{/if}

<!-- Sections with children -->
{#each tree.sections as section (section.id)}
{@const sectionItems = rootRole === 'profile'
? allFonts.filter((f) => f.pathKey === section.id)
: rootRole === 'creator' || rootRole === 'collection'
? allTreeLinks.filter((l) => l.pathKey === section.id)
: allProfiles.filter((p) => p.pathKey === section.id)}

{#if editingSectionId === section.id}
{@render sectionEditor(section)}
{:else}
<div class="rounded-lg border space-y-2" style="border-left: 4px solid {section.color};">
<div class="flex items-center gap-2 px-4 py-2">
{#if !section.hideTitle}
<span class="text-base">{section.symbol ?? '🗂️'}</span>
<span class="text-sm font-semibold flex-1">{section.title}</span>
{:else}
<span class="flex-1"></span>
{/if}
<Badge variant="outline" class="text-xs">{sectionItems.length}</Badge>
<button type="button" class="p-1 hover:bg-accent rounded" onclick={() => handleMoveSectionUp(section)}>
<ArrowUp class="size-3.5 text-muted-foreground" />
</button>
<button type="button" class="p-1 hover:bg-accent rounded" onclick={() => handleMoveSectionDown(section)}>
<ArrowDown class="size-3.5 text-muted-foreground" />
</button>
<button type="button" class="p-1 hover:bg-accent rounded" onclick={() => {
if (rootRole === 'profile') {
addToSectionId = section.id;
showAddChild = false;
} else {
showAddChild = true;
addToSectionId = section.id;
}
}}>
<Plus class="size-3.5 text-muted-foreground" />
</button>
<button type="button" class="p-1 hover:bg-accent rounded" onclick={() => startEditSection(section)}>
<Pencil class="size-3.5 text-muted-foreground" />
</button>
<button type="button" class="p-1 hover:bg-destructive/10 rounded" onclick={() => (deleteConfirm = { type: 'section', sectionId: section.id, title: section.title })}>
<Trash2 class="size-3.5 text-destructive" />
</button>
</div>
{#if sectionItems.length > 0}
<div class="px-3 pb-3 space-y-2">
{#if rootRole === 'profile'}
{#each sectionItems as entry (entry.nodeId)}
{@render fontCard(entry)}
{/each}
{:else if rootRole === 'creator' || rootRole === 'collection'}
{#each sectionItems as entry (entry.nodeId)}
{@render treeLinkCard(entry)}
{/each}
{:else}
{#each sectionItems as entry (entry.nodeId)}
{@render profileCard(entry)}
{/each}
{/if}
</div>
{:else}
{#if addToSectionId !== section.id}
<p class="text-xs text-muted-foreground text-center pb-3">Seção vazia.</p>
{/if}
{/if}
{#if rootRole === 'profile' && addToSectionId === section.id}
<div class="px-3 pb-3">
<div class="border rounded-lg p-3 bg-muted/20">
<NodeForm
mode="create"
role="font"
onsave={(data) => handleAddFontDirect(data)}
oncancel={() => { addToSectionId = null; }}
{saving}
/>
</div>
</div>
{/if}
</div>
{/if}
{/each}

<!-- Unsectioned children -->
{#if rootRole === 'profile'}
{@const unsectioned = allFonts.filter((f) => f.pathKey === '*')}
{#if unsectioned.length > 0 || tree.sections.length > 0}
{#if tree.sections.length > 0}
<div class="text-xs text-muted-foreground uppercase tracking-wider px-1 pt-1">Sem seção</div>
{/if}
{#each unsectioned as entry (entry.nodeId)}
{@render fontCard(entry)}
{/each}
{/if}
{:else if rootRole === 'creator' || rootRole === 'collection'}
{@const unsectioned = allTreeLinks.filter((l) => l.pathKey === '*')}
{#if unsectioned.length > 0}
{#if tree.sections.length > 0}
<div class="text-xs text-muted-foreground uppercase tracking-wider px-1 pt-1">Sem seção</div>
{/if}
{#each unsectioned as entry (entry.nodeId)}
{@render treeLinkCard(entry)}
{/each}
{/if}
{:else}
{@const unsectioned = allProfiles.filter((p) => p.pathKey === '*')}
{#if unsectioned.length > 0}
{#if tree.sections.length > 0}
<div class="text-xs text-muted-foreground uppercase tracking-wider px-1 pt-1">Sem seção</div>
{/if}
{#each unsectioned as entry (entry.nodeId)}
{@render profileCard(entry)}
{/each}
{/if}
{/if}
</div>

<!-- Delete confirmation -->
{#if deleteConfirm}
<ConfirmDialog
open={!!deleteConfirm}
title="Excluir {deleteConfirm.type === 'node' ? 'Nó' : 'Seção'}"
description="Tem certeza que deseja excluir &quot;{deleteConfirm.title}&quot;?{deleteConfirm.type === 'node' ? ' Se for um profile, todas as fonts filhas também serão removidas da árvore.' : ' Os itens dentro serão movidos para fora da seção.'}"
confirmLabel="Excluir"
onconfirm={() => {
if (deleteConfirm?.type === 'node' && deleteConfirm.nodeId) handleDeleteNode(deleteConfirm.nodeId);
else if (deleteConfirm?.type === 'section' && deleteConfirm.sectionId) handleDeleteSection(deleteConfirm.sectionId);
}}
oncancel={() => (deleteConfirm = null)}
/>
{/if}

<!-- Section emoji picker dialog -->
<Dialog.Root open={!!emojiDialogTarget} onOpenChange={(v) => { if (!v) emojiDialogTarget = null; }}>
<Dialog.Content class="sm:max-w-fit">
<div class="flex justify-center pt-2 pb-1">
<div class="flex items-center justify-center size-12 rounded-full bg-primary/10">
<Smile class="size-6 text-primary" />
</div>
</div>
<Dialog.Header class="text-center">
<Dialog.Title>Escolher Ícone</Dialog.Title>
<Dialog.Description>Selecione um emoji para a seção.</Dialog.Description>
</Dialog.Header>
<div class="flex flex-col gap-4 py-4">
<div class="flex items-center justify-center">
<div class="w-16 h-16 rounded-lg border bg-muted flex items-center justify-center text-4xl">
{pendingSectionEmoji || '?'}
</div>
</div>
<EmojiPicker value={pendingSectionEmoji} onselect={(e) => (pendingSectionEmoji = e)} />
</div>
<Dialog.Footer>
<Button variant="outline" onclick={() => (emojiDialogTarget = null)}>Cancelar</Button>
<Button disabled={!pendingSectionEmoji} onclick={() => {
if (emojiDialogTarget === 'new') newSectionEmoji = pendingSectionEmoji;
else if (emojiDialogTarget === 'edit') editSectionEmoji = pendingSectionEmoji;
emojiDialogTarget = null;
}}>Confirmar</Button>
</Dialog.Footer>
</Dialog.Content>
</Dialog.Root>
