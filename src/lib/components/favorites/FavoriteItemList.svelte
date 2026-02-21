<script lang="ts">
	import type { FavoriteItem } from '$lib/stores/favorites.svelte.js';
	import type { BrowseEntity } from '$lib/stores/browse.svelte.js';
	import type { Profile } from '$lib/domain/profile/profile.js';
	import type { Font } from '$lib/domain/font/font.js';
	import { favorites } from '$lib/stores/favorites.svelte.js';
	import { EntityCard } from '$lib/components/browse/index.js';
	import { Separator } from '$lib/components/ui/separator/index.js';
	import Check from '@lucide/svelte/icons/check';

	interface Props {
		items: FavoriteItem[];
		loading?: boolean;
	}

	let { items, loading = false }: Props = $props();

	let longPressTimer: ReturnType<typeof setTimeout> | null = null;
	let longPressFired = false;

	// Group items by entity type
	let grouped = $derived.by(() => {
		const pages = items.filter((i) => i.entityType === 'creator_page' && i.entity);
		const profiles = items.filter((i) => i.entityType === 'profile' && i.entity);
		const fonts = items.filter((i) => i.entityType === 'font' && i.entity);
		return { pages, profiles, fonts };
	});

	function toBrowseEntity(item: FavoriteItem): BrowseEntity {
		return { type: item.entityType, data: item.entity! } as BrowseEntity;
	}

	/**
	 * Compute the /favorites/... href for a given favorite item.
	 */
	function itemHref(item: FavoriteItem): string {
		const entity = item.entity!;
		switch (item.entityType) {
			case 'creator_page':
				return `/favorites/creator/${entity.id}`;
			case 'profile': {
				const profile = entity as Profile;
				if (profile.creatorPageId) {
					return `/favorites/creator/${profile.creatorPageId}/profile/${profile.id}`;
				}
				return `/favorites/profile/${profile.id}`;
			}
			case 'font': {
				const font = entity as Font;
				return `/favorites/profile/${font.profileId}/font/${font.id}`;
			}
			default:
				return '#';
		}
	}

	function handlePointerDown(entityId: string) {
		longPressFired = false;
		longPressTimer = setTimeout(() => {
			longPressFired = true;
			// Activate selection mode and select this item
			if (!favorites.isSelecting) {
				favorites.toggleSelectItem(entityId);
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

	function handleCardClick(entityId: string, e: MouseEvent) {
		// Suppress click after a long-press that just activated selection
		if (longPressFired) {
			e.preventDefault();
			e.stopPropagation();
			longPressFired = false;
			return;
		}
		if (favorites.isSelecting) {
			e.preventDefault();
			e.stopPropagation();
			favorites.toggleSelectItem(entityId);
		}
	}
</script>

{#snippet groupSection(label: string, groupItems: FavoriteItem[])}
	{#if groupItems.length > 0}
		<div>
			<h3 class="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">
				{label} ({groupItems.length})
			</h3>
			<div class="flex flex-col gap-2">
				{#each groupItems as item (item.state.entityId)}
					{@const isSelected = favorites.selectedItemIds.has(item.state.entityId)}
					<!-- svelte-ignore a11y_no_static_element_interactions -->
					<div
						class="relative {favorites.isSelecting ? 'cursor-pointer' : ''}"
						onpointerdown={() => handlePointerDown(item.state.entityId)}
						onpointerup={handlePointerUp}
						onpointerleave={handlePointerUp}
						onclick={(e) => handleCardClick(item.state.entityId, e)}
					>
						{#if favorites.isSelecting}
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
						<div class={favorites.isSelecting ? 'pl-8' : ''}>
						<EntityCard entity={toBrowseEntity(item)} href={favorites.isSelecting ? null : itemHref(item)} />
						</div>
					</div>
				{/each}
			</div>
		</div>
	{/if}
{/snippet}

{#if loading}
	<div class="flex flex-col gap-3">
		{#each Array(3) as _}
			<div class="h-24 rounded-lg bg-muted animate-pulse"></div>
		{/each}
	</div>
{:else if items.length === 0}
	<div class="flex flex-col items-center justify-center py-12 text-center">
		<p class="text-sm text-muted-foreground">
			Nenhum favorito ainda. Favorite itens na tela Browse.
		</p>
	</div>
{:else}
	<div class="flex flex-col gap-4">
		{@render groupSection('Pages', grouped.pages)}
		{#if grouped.pages.length > 0 && (grouped.profiles.length > 0 || grouped.fonts.length > 0)}
			<Separator />
		{/if}
		{@render groupSection('Profiles', grouped.profiles)}
		{#if grouped.profiles.length > 0 && grouped.fonts.length > 0}
			<Separator />
		{/if}
		{@render groupSection('Fonts', grouped.fonts)}
	</div>
{/if}
