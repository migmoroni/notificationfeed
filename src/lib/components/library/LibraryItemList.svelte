<!--
  LibraryItemList — displays activated TreeNodes with tab grouping.

  Uses LibraryItem type (activation + TreeNode).
  Shows all activated nodes in "All Library" tab, filtered by favorite in "Only Favorites" tab.
-->
<script lang="ts">
	import type { LibraryItem } from '$lib/stores/library.svelte.js';
	import type { TreeNode } from '$lib/domain/content-tree/content-tree.js';
	import { library } from '$lib/stores/library.svelte.js';
	import { layout } from '$lib/stores/layout.svelte.js';
	import { t } from '$lib/i18n/t.js';
	import EntityCard from '$lib/components/shared/entity/EntityCard.svelte';
	import { Separator } from '$lib/components/ui/separator/index.js';
	import Check from '@lucide/svelte/icons/check';

	interface Props {
		items: LibraryItem[];
		loading?: boolean;
	}

	let { items, loading = false }: Props = $props();

	let longPressTimer: ReturnType<typeof setTimeout> | null = null;
	let longPressFired = false;

	// Group items by node role
	let grouped = $derived.by(() => {
		const collections = items.filter((i) => i.node?.role === 'collection' && i.node);
		const profiles = items.filter((i) => i.node?.role === 'profile' && i.node);
		const fonts = items.filter((i) => i.node?.role === 'font' && i.node);
		return { collections, profiles, fonts };
	});

	function itemHref(item: LibraryItem): string {
		if (!item.node) return '#';
		return `/library/node/${item.node.metadata.id}`;
	}

	function handlePointerDown(nodeId: string) {
		longPressFired = false;
		longPressTimer = setTimeout(() => {
			longPressFired = true;
			if (!library.isSelecting) {
				library.toggleItemSelection(nodeId);
			}
			longPressTimer = null;
		}, 500);
	}

	function handlePointerUp() {
		if (longPressTimer) {
			clearTimeout(longPressTimer);
			longPressTimer = null;
		}
	}

	function handleCardClick(nodeId: string, e: MouseEvent) {
		if (longPressFired) {
			e.preventDefault();
			e.stopPropagation();
			longPressFired = false;
			return;
		}
		if (library.isSelecting) {
			e.preventDefault();
			e.stopPropagation();
			library.toggleItemSelection(nodeId);
		}
	}
</script>

{#snippet groupSection(label: string, groupItems: LibraryItem[])}
	{#if groupItems.length > 0}
		<div>
			<h3 class="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 px-1">
				{label} ({groupItems.length})
			</h3>
			<div class="grid gap-3 {layout.isExpanded ? 'grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'}">
				{#each groupItems as item (item.activation.nodeId)}
					{@const nodeId = item.activation.nodeId}
					{@const isSelected = library.selectedItemIds.has(nodeId)}
					<!-- svelte-ignore a11y_no_static_element_interactions, a11y_click_events_have_key_events -->
					<div
						class="relative {library.isSelecting ? 'cursor-pointer' : ''}"
						onpointerdown={() => handlePointerDown(nodeId)}
						onpointerup={handlePointerUp}
						onpointerleave={handlePointerUp}
						onclick={(e) => handleCardClick(nodeId, e)}
					>
						{#if library.isSelecting}
							<div
								class="absolute left-0 top-0 bottom-0 w-8 z-10 flex items-center justify-center rounded-l-lg
									{isSelected ? 'bg-accent' : 'bg-muted/50'}"
							>
								{#if isSelected}
									<Check class="size-4 text-accent-foreground" />
								{:else}
									<div class="size-4 rounded border-2 border-muted-foreground/40"></div>
								{/if}
							</div>
						{/if}
						<div class={library.isSelecting ? 'pl-8' : ''}>
							{#if item.node}
								<EntityCard
									node={item.node}
									href={library.isSelecting ? null : itemHref(item)}
								/>
							{/if}
						</div>
					</div>
				{/each}
			</div>
		</div>
	{/if}
{/snippet}

{#if loading}
	<div class="grid gap-3 {layout.isExpanded ? 'grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'}">
		{#each Array(6) as _}
			<div class="h-20 rounded-lg bg-muted animate-pulse"></div>
		{/each}
	</div>
{:else if items.length === 0}
	<div class="flex flex-col items-center justify-center py-12 text-center">
		<p class="text-sm text-muted-foreground">
			{t('library.empty')}
		</p>
	</div>
{:else}
	<div class="flex flex-col gap-4">
		{@render groupSection(t('entity.collection_plural'), grouped.collections)}
		{#if grouped.collections.length > 0 && (grouped.profiles.length > 0 || grouped.fonts.length > 0)}
			<Separator />
		{/if}
		{@render groupSection(t('entity.profile_plural'), grouped.profiles)}
		{#if grouped.profiles.length > 0 && grouped.fonts.length > 0}
			<Separator />
		{/if}
		{@render groupSection(t('entity.font_plural'), grouped.fonts)}
	</div>
{/if}
