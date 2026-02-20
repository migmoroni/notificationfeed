<script lang="ts">
	import { onMount } from 'svelte';
	import { favorites } from '$lib/stores/favorites.svelte.js';
	import { layout } from '$lib/stores/layout.svelte.js';
	import {
		TabSidebar,
		FavoriteItemList,
		SelectionBar,
		TabAssignmentDialog
	} from '$lib/components/favorites/index.js';
	import ConfirmUnfavoriteDialog from '$lib/components/shared/ConfirmUnfavoriteDialog.svelte';

	let showAssignment = $state(false);
	let showRemoveConfirm = $state(false);

	onMount(() => {
		favorites.loadFavorites();
	});

	async function handleConfirmRemove() {
		const ids = [...favorites.selectedItemIds];
		await favorites.removeFavorites(ids);
		showRemoveConfirm = false;
	}
</script>

<svelte:head>
	<title>Notfeed — Favorites</title>
</svelte:head>

<div class="mx-auto w-full px-4 py-4" class:max-w-5xl={layout.isExpanded} class:max-w-2xl={!layout.isExpanded}>
	<div class="mb-4">
		<h1 class="text-xl font-bold mb-3">Favoritos</h1>
	</div>

	<div class="grid gap-4 {layout.isExpanded ? 'lg:grid-cols-[200px_1fr]' : ''}">
		<!-- Sidebar / Horizontal tabs -->
		<aside class={layout.isExpanded ? 'lg:sticky lg:top-4 lg:self-start' : ''}>
			<TabSidebar />
		</aside>

		<!-- Main: filtered items -->
		<div class={favorites.isSelecting ? 'pb-20' : ''}>
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
