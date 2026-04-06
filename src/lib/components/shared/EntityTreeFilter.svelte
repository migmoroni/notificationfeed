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
import ChevronDown from '@lucide/svelte/icons/chevron-down';
import MoreHorizontal from '@lucide/svelte/icons/more-horizontal';
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
const pageTypeMeta: Record<PageType, { label: string; pluralLabel: string; icon: typeof FileText }> = {
creator: { label: 'Creator', pluralLabel: 'Creators', icon: FileText },
profile: { label: 'Profile', pluralLabel: 'Profiles', icon: User },
collection: { label: 'Collection', pluralLabel: 'Collections', icon: FolderOpen }
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
let isFocused = $derived(store.pageTypeFilter.size === 1);
let expandedGroups = $state<Set<PageType>>(new Set());
const PAGE_LIMIT = 5;

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
			groups.push({ type: t, label: pageTypeMeta[t].pluralLabel, pages: arr });
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
class="ml-5 flex flex-1 min-w-0 items-center gap-2 rounded-md px-2 py-1.5 text-[13px] transition-colors text-left
{isSelected
? 'bg-accent text-accent-foreground font-medium'
: 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'}"
>
<svelte:component this={fontProtocolIcon(node)} class="size-4 shrink-0" />
<span class="truncate">{node.data.header.title}</span>
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
<div class="flex items-center min-w-0">
{#if hasChildren}
<button
type="button"
onclick={() => toggleBranch(page.id)}
class="flex items-center justify-center size-6 shrink-0 rounded text-muted-foreground hover:text-foreground transition-colors"
>
{#if isOpen}
<ChevronDown class="size-3.5" />
{:else}
<ChevronRight class="size-3.5" />
{/if}
</button>
{:else}
<div class="size-6 shrink-0"></div>
{/if}
<button
onclick={() => store.togglePage(page.id)}
class="flex flex-1 min-w-0 items-center gap-2 rounded-md px-2 py-1.5 text-[13px] transition-colors text-left
{isSelected
? 'bg-accent text-accent-foreground font-medium'
: 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'}"
>
<PageIcon class="size-4 shrink-0" />
<span class="truncate">{page.title}</span>
{#if childCount > 0}
<span class="ml-auto text-xs tabular-nums text-muted-foreground shrink-0">{childCount}</span>
{/if}
</button>
</div>

{#if hasChildren}
<Collapsible.Content>
<div class="ml-3 flex flex-col border-l border-border pl-2 py-0.5">
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
<div class="flex flex-col gap-1 min-w-0 overflow-x-hidden">
<!-- Page type filter — segmented row -->
<div class="flex items-center gap-1 px-2 py-1">
{#each (['creator', 'profile', 'collection'] as const) as pt (pt)}
{@const isActive = store.pageTypeFilter.has(pt)}
<button
onclick={() => store.togglePageType(pt)}
class="flex-1 flex items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium transition-colors
{isActive
? 'bg-accent text-accent-foreground'
: 'text-muted-foreground hover:bg-accent/40 hover:text-foreground'}"
>
<svelte:component this={pageTypeMeta[pt].icon} class="size-3.5" />
{pageTypeMeta[pt].label}
</button>
{/each}
{#if totalSelected > 0}
<button
onclick={() => store.clearAll()}
class="flex items-center justify-center size-7 shrink-0 rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
aria-label="Limpar filtro"
>
<X class="size-3.5" />
</button>
{/if}
</div>

<!-- Page list grouped by type -->
{#if groupedPages.length > 0}
<div class="flex flex-col gap-2 px-1">
{#each groupedPages as group (group.type)}
{@const isExpanded = isFocused || expandedGroups.has(group.type)}
{@const visiblePages = isExpanded ? group.pages : group.pages.slice(0, PAGE_LIMIT)}
{@const hasMore = !isExpanded && group.pages.length > PAGE_LIMIT}
{@const GroupIcon = pageTypeMeta[group.type].icon}
<div class="flex flex-col">
{#if groupedPages.length > 1}
<div class="flex items-center gap-2 px-2 py-1">
<GroupIcon class="size-3.5 text-muted-foreground" />
<span class="text-xs font-medium text-muted-foreground">{group.label}</span>
<span class="text-xs tabular-nums text-muted-foreground/60">{group.pages.length}</span>
</div>
{/if}
{#each visiblePages as page (page.id)}
{@render pageNode(page)}
{/each}
{#if hasMore}
<button
onclick={() => { expandedGroups = new Set([...expandedGroups, group.type]); }}
class="flex items-center gap-2 px-8 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
>
<MoreHorizontal class="size-4" />
Mais {group.pages.length - PAGE_LIMIT}
</button>
{/if}
</div>
{/each}
</div>
{:else}
<p class="px-3 py-4 text-xs text-muted-foreground text-center">Nenhuma página disponível.</p>
{/if}
</div>
