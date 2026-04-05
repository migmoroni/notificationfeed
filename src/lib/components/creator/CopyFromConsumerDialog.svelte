<script lang="ts">
import type { TreeNode } from '$lib/domain/content-tree/content-tree.js';
import type { ContentTree } from '$lib/domain/content-tree/content-tree.js';
import { getFontNodes } from '$lib/domain/content-tree/content-tree.js';
import { creator } from '$lib/stores/creator.svelte.js';
import { createContentTreeStore } from '$lib/persistence/content-tree.store.js';
import * as Dialog from '$lib/components/ui/dialog/index.js';
import { Button } from '$lib/components/ui/button/index.js';
import { Badge } from '$lib/components/ui/badge/index.js';
import Copy from '@lucide/svelte/icons/copy';
import User from '@lucide/svelte/icons/user';
import Rss from '@lucide/svelte/icons/rss';
import Check from '@lucide/svelte/icons/check';

interface Props {
open: boolean;
treeId: string;
onclose: () => void;
}

let { open = $bindable(), treeId, onclose }: Props = $props();

interface ConsumerProfile {
node: TreeNode;
fontNodes: TreeNode[];
sourceTreeId: string;
}

let profiles = $state<ConsumerProfile[]>([]);
let selectedIds = $state<Set<string>>(new Set());
let loading = $state(true);
let copying = $state(false);

const treeRepo = createContentTreeStore();

$effect(() => {
if (open) loadConsumerProfiles();
});

async function loadConsumerProfiles() {
loading = true;
try {
// Find all trees NOT authored by the current creator
const allTrees = await treeRepo.getAll();
const creatorUserId = creator.user?.id;
const otherTrees = allTrees.filter((t) => t.metadata.author !== creatorUserId);

const result: ConsumerProfile[] = [];
for (const tree of otherTrees) {
// Find profile nodes embedded in the tree
for (const [nodeId, node] of Object.entries(tree.nodes)) {
if (node.role !== 'profile') continue;

// Gather font nodes from the same tree
const fonts = getFontNodes(tree);

result.push({
node,
fontNodes: fonts,
sourceTreeId: tree.metadata.id
});
}
}
profiles = result;
} finally {
loading = false;
}
}

function toggleSelect(nodeId: string) {
const next = new Set(selectedIds);
if (next.has(nodeId)) next.delete(nodeId);
else next.add(nodeId);
selectedIds = next;
}

async function handleCopy() {
if (selectedIds.size === 0) return;
copying = true;
try {
const selected = profiles.filter((p) => selectedIds.has(p.node.metadata.id));

for (const profile of selected) {
// Create a copy of the profile node under creator authorship
await creator.createNode(
treeId,
'profile',
{ ...profile.node.data.header },
{ ...profile.node.data.body }
);

// Copy font children into the same tree (unsectioned)
for (const fontNode of profile.fontNodes) {
await creator.createNode(
treeId,
'font',
{ ...fontNode.data.header },
{ ...fontNode.data.body }
);
}
}

await creator.reload();
selectedIds = new Set();
onclose();
} finally {
copying = false;
}
}
</script>

<Dialog.Root bind:open onOpenChange={(v) => { if (!v) onclose(); }}>
<Dialog.Content class="sm:max-w-lg max-h-[80vh] overflow-y-auto">
<Dialog.Header>
<Dialog.Title class="flex items-center gap-2">
<Copy class="size-5" />
Copiar do Consumer
</Dialog.Title>
<Dialog.Description>
Selecione profiles para copiar. Uma cópia independente será criada no espaço do creator.
</Dialog.Description>
</Dialog.Header>

{#if loading}
<div class="py-8 text-center">
<span class="text-sm text-muted-foreground animate-pulse">Carregando…</span>
</div>
{:else if profiles.length === 0}
<div class="py-8 text-center">
<p class="text-sm text-muted-foreground">Nenhum profile encontrado em árvores externas.</p>
</div>
{:else}
<div class="space-y-2 py-2">
{#each profiles as profile (profile.node.metadata.id)}
{@const isSelected = selectedIds.has(profile.node.metadata.id)}
<button
type="button"
class="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border text-left transition-colors {isSelected
? 'border-primary bg-primary/5'
: 'hover:bg-muted/50'}"
onclick={() => toggleSelect(profile.node.metadata.id)}
>
{#if isSelected}
<div class="size-5 rounded-full bg-primary flex items-center justify-center shrink-0">
<Check class="size-3 text-primary-foreground" />
</div>
{:else}
<div class="size-5 rounded-full border-2 shrink-0"></div>
{/if}

<div class="flex-1 min-w-0">
<div class="flex items-center gap-2">
<User class="size-3.5 text-muted-foreground" />
<span class="font-medium text-sm truncate">{profile.node.data.header.title}</span>
</div>
<div class="flex items-center gap-1 mt-0.5">
<Rss class="size-3 text-muted-foreground" />
<span class="text-xs text-muted-foreground">
{profile.fontNodes.length} font{profile.fontNodes.length !== 1 ? 's' : ''}
</span>
{#each profile.node.data.header.tags.slice(0, 3) as tag}
<Badge variant="outline" class="text-[10px] h-4">{tag}</Badge>
{/each}
</div>
</div>
</button>
{/each}
</div>
{/if}

<Dialog.Footer>
<Button variant="outline" onclick={onclose} disabled={copying}>Cancelar</Button>
<Button
disabled={selectedIds.size === 0 || copying}
onclick={handleCopy}
>
{#if copying}
Copiando…
{:else}
Copiar {selectedIds.size} profile{selectedIds.size !== 1 ? 's' : ''}
{/if}
</Button>
</Dialog.Footer>
</Dialog.Content>
</Dialog.Root>
