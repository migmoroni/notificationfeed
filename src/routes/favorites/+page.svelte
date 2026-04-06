<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { favorites } from '$lib/stores/favorites.svelte.js';
	import { layout } from '$lib/stores/layout.svelte.js';
	import { sidebarSlot } from '$lib/stores/sidebar-slot.svelte.js';
	import {
		TabSidebar,
		SelectionBar,
		TabAssignmentDialog
	} from '$lib/components/favorites/index.js';
	import FavoriteItemList from '$lib/components/favorites/FavoriteItemList.svelte';
	import ConfirmUnfavoriteDialog from '$lib/components/shared/dialog/ConfirmUnfavoriteDialog.svelte';

	let showAssignment = $state(false);
	let showRemoveConfirm = $state(false);

	onMount(() => {
		favorites.loadFavorites();
		sidebarSlot.set(sidebarContent);
	});

	onDestroy(() => {
		sidebarSlot.set(null);
	});

	async function handleConfirmRemove() {
		const ids = [...favorites.selectedItemIds];
		await favorites.removeFavorites(ids);
		showRemoveConfirm = false;
	}
</script>

{#snippet sidebarContent()}
	<div class="overflow-y-auto h-full p-3">
		<TabSidebar />
	</div>
{/snippet}

<svelte:head>
	<title>Notfeed — Favorites</title>
</svelte:head>

<div class="mx-auto w-full h-full flex flex-col overflow-hidden py-4 px-4" class:max-w-8xl={layout.isExpanded} class:max-w-2xl={!layout.isExpanded}>
	<div class="mb-4">
		<h1 class="text-xl font-bold mb-3">Favoritos</h1>
	</div>

	<div class="grid gap-12 flex-1 min-h-0 overflow-hidden {layout.isExpanded ? '' : 'lg:grid-cols-[295px_1fr]'}">
		{#if !layout.isExpanded}
		<aside class="overflow-y-auto gap-4">
			<TabSidebar />
		</aside>
		{/if}

		<!-- Main: filtered items -->
		<div class="overflow-y-auto pr-24 pb-24 pt-4 {favorites.isSelecting ? 'pb-20' : ''}">
			<FavoriteItemList items={favorites.filteredItems} loading={favorites.loading} />
		</div>
	</div>
</div>

<!-- Selection bar (fixed bottom) -->
<SelectionBar
	onopenAssignment={() => (showAssignment = true)}
	onopenRemoveConfirm={() => (showRemoveConfirm = true)}
/>

<!-- Tab assignment dialog -->
{#if showAssignment}
	<TabAssignmentDialog onclose={() => (showAssignment = false)} />
{/if}

<!-- Remove confirm dialog -->
<ConfirmUnfavoriteDialog
	bind:open={showRemoveConfirm}
	count={favorites.selectedCount}
	onconfirm={handleConfirmRemove}
	oncancel={() => (showRemoveConfirm = false)}
/>
