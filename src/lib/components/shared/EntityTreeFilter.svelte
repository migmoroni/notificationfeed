<!--
  EntityTreeFilter — page-based filter for ContentTrees.

  Shows a page-type selector (Creator / Profile / Collection)
  and a flat list of pages matching the active type(s),
  each expandable to show its font nodes.
-->
<script lang="ts">
import type { EntityFilterStore, NodeEntry, PageEntry } from '$lib/stores/entity-filter.types.js';
import type { PageType } from '$lib/stores/entity-filter.types.js';
import type { TreeNode } from '$lib/domain/content-tree/content-tree.js';
import { isFontNode } from '$lib/domain/content-tree/content-tree.js';
import * as Collapsible from '$lib/components/ui/collapsible/index.js';
import ChevronRight from '@lucide/svelte/icons/chevron-right';
import X from '@lucide/svelte/icons/x';
import Rss from '@lucide/svelte/icons/rss';
import Atom from '@lucide/svelte/icons/atom';
import Zap from '@lucide/svelte/icons/zap';
import User from '@lucide/svelte/icons/user';
import FileText from '@lucide/svelte/icons/file-text';
import FolderOpen from '@lucide/svelte/icons/folder-open';

interface Props {
store: EntityFilterStore;
}

let { store }: Props = $props();

// Page type labels & icons
const pageTypeMeta: Record<PageType, { label: string; icon: typeof FileText }> = {
creator: { label: 'Creator', icon: FileText },
profile: { label: 'Profile', icon: User },
collection: { label: 'Collection', icon: FolderOpen }
};

// Auto-open pages that have active selections
let openPages: Record<string, boolean> = $derived.by(() => {
const result: Record<string, boolean> = {};
for (const page of store.getPages()) {
if (store.isPageSelected(page.id)) result[page.id] = true;
}
return result;
});

let branchManual: Record<string, boolean> = $state({});

function isBranchOpen(key: string): boolean {
if (key in branchManual) return branchManual[key];
return openPages[key] ?? false;
}

function toggleBranch(key: string) {
branchManual[key] = !isBranchOpen(key);
}

let pages = $derived(store.getPages());
let groupedPages = $derived.by(() => {
	const groups: { type: PageType; label: string; pages: PageEntry[] }[] = [];
	const typeOrder: PageType[] = ['creator', 'profile', 'collection'];
	const byType = new Map<PageType, PageEntry[]>();
	for (const page of pages) {
		let arr = byType.get(page.pageType);
		if (!arr) { arr = []; byType.set(page.pageType, arr); }
		arr.push(page);
	}
	for (const t of typeOrder) {
		const arr = byType.get(t);
		if (arr && arr.length > 0) {
			groups.push({ type: t, label: pageTypeMeta[t].label + 's', pages: arr });
		}
	}
	return groups;
});
let totalSelected = $derived(store.totalSelected);

function fontProtocolIcon(node: TreeNode) {
if (!isFontNode(node)) return Rss;
const proto = node.data.body.protocol;
if (proto === 'atom') return Atom;
if (proto === 'nostr') return Zap;
return Rss;
}

function pageTypeIcon(pt: PageType) {
return pageTypeMeta[pt].icon;
}
</script>

<!-- ═══ Font node snippet ═══ -->
{#snippet fontNode(entry: NodeEntry)}
{@const node = entry.node}
{@const isSelected = store.isFontSelected(node.metadata.id)}
<button
onclick={() => store.toggleFont(node.metadata.id)}
class="ml-5 flex w-full items-stretch rounded-md overflow-hidden text-sm transition-colors text-left
{isSelected
? 'bg-accent text-accent-foreground font-medium'
: 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'}"
>
<div class="flex items-center justify-center shrink-0 px-1 py-2">
<svelte:component this={fontProtocolIcon(node)} class="size-3.5 shrink-0" />
</div>
<div class="flex items-center gap-2 flex-1 min-w-0 px-1 py-2">
<span class="truncate">{node.data.header.title}</span>
</div>
</button>
{/snippet}

<!-- ═══ Page node snippet ═══ -->
{#snippet pageNode(page: PageEntry)}
{@const isOpen = isBranchOpen(page.id)}
{@const isSelected = store.isPageSelected(page.id)}
{@const pageFonts = store.getFonts(page.id)}
{@const linkedPages = store.getLinkedPages(page.id)}
{@const hasChildren = pageFonts.length > 0 || linkedPages.length > 0}
{@const childCount = pageFonts.length > 0 ? pageFonts.length : linkedPages.length}
{@const PageIcon = pageTypeIcon(page.pageType)}

<Collapsible.Root open={isOpen}>
<div class="flex items-center gap-0.5">
{#if hasChildren}
<button
type="button"
onclick={() => toggleBranch(page.id)}
class="flex items-center gap-1 px-1 py-2 shrink-0"
>
<ChevronRight
class="size-3 shrink-0 transition-transform duration-200 {isOpen ? 'rotate-90' : ''}"
/>
</button>
{:else}
<div class="w-5 shrink-0"></div>
{/if}
<button
onclick={() => store.togglePage(page.id)}
class="flex w-full items-stretch rounded-md overflow-hidden text-sm transition-colors text-left
{isSelected
? 'bg-accent text-accent-foreground font-medium'
: 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'}"
>
<div class="flex items-center justify-center shrink-0 px-1 py-2">
<PageIcon class="size-3.5 shrink-0" />
</div>
<div class="flex items-center gap-2 flex-1 min-w-0 px-1 py-2">
<span class="truncate">{page.title}</span>
{#if childCount > 0}
<span class="ml-auto text-xs text-muted-foreground">{childCount}</span>
{/if}
</div>
</button>
</div>

{#if hasChildren}
<Collapsible.Content>
<div class="ml-4 flex flex-col gap-0.5 border-l border-border pl-2 py-0.5">
{#if linkedPages.length > 0}
{#each linkedPages as linked (linked.id)}
{@render pageNode(linked)}
{/each}
{:else}
{#each pageFonts as fontEntry (fontEntry.node.metadata.id)}
{@render fontNode(fontEntry)}
{/each}
{/if}
</div>
</Collapsible.Content>
{/if}
</Collapsible.Root>
{/snippet}

<!-- ═══ Main template ═══ -->
<div class="flex flex-col gap-0.5">
<div class="flex items-center justify-between px-2 mb-1">
<span class="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Páginas</span>
{#if totalSelected > 0}
<button
onclick={() => store.clearAll()}
class="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
aria-label="Limpar filtro de páginas"
>
<X class="size-3" />
{totalSelected}
</button>
{/if}
</div>

<!-- Page type selector chips -->
<div class="flex gap-1 px-2 mb-2 flex-wrap">
{#each (['creator', 'profile', 'collection'] as const) as pt (pt)}
{@const isActive = store.pageTypeFilter.has(pt)}
<button
onclick={() => store.togglePageType(pt)}
class="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors border
{isActive
? 'bg-accent text-accent-foreground border-accent'
: 'text-muted-foreground border-border hover:bg-accent/50'}"
>
<svelte:component this={pageTypeMeta[pt].icon} class="size-3" />
{pageTypeMeta[pt].label}
</button>
{/each}
</div>

<!-- Page list grouped by type -->
{#if groupedPages.length > 0}
<div class="flex flex-col gap-3">
{#each groupedPages as group (group.type)}
<div class="flex flex-col gap-0.5">
<span class="px-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{group.label}</span>
{#each group.pages as page (page.id)}
{@render pageNode(page)}
{/each}
</div>
{/each}
</div>
{:else}
<p class="px-2 text-xs text-muted-foreground">Nenhuma página disponível.</p>
{/if}
</div>
