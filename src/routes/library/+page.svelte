<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { library, LIBRARY_HOME_ID } from '$lib/stores/library.svelte.js';
	import { layout } from '$lib/stores/layout.svelte.js';
	import { sidebarSlot } from '$lib/stores/sidebar-slot.svelte.js';
	import {
		TabSidebar,
		SelectionBar,
		TabAssignmentDialog,
		LibraryHome,
		LibrarySearchBar
	} from '$lib/components/library/index.js';
	import LibraryItemList from '$lib/components/library/LibraryItemList.svelte';
	import ConfirmUnfavoriteDialog from '$lib/components/shared/dialog/ConfirmUnfavoriteDialog.svelte';
	import { t } from '$lib/i18n/t.js';
import PageHeader from '$lib/components/shared/PageHeader.svelte';

	let showAssignment = $state(false);
	let showRemoveConfirm = $state(false);

	let isHome = $derived(library.activeTabId === LIBRARY_HOME_ID);

	onMount(async () => {
		await library.loadLibrary();
		sidebarSlot.set(sidebarContent);
	});

	onDestroy(() => {
		sidebarSlot.set(null);
	});

	async function handleConfirmRemove() {
		const ids = [...library.selectedItemIds];
		await library.removeFavorites(ids);
		showRemoveConfirm = false;
	}
</script>

{#snippet sidebarContent()}
	<div class="overflow-y-auto h-full p-3">
		<TabSidebar />
	</div>
{/snippet}

<svelte:head>
	<title>{t('page_title.library')}</title>
</svelte:head>

<div class="mx-auto w-full h-full flex flex-col pt-4" class:max-w-8xl={layout.isExpanded} class:max-w-2xl={!layout.isExpanded}>
	<div class="px-4 shrink-0">
		<PageHeader title={t('title.library')}>
			{#snippet bottomRow()}
				<div class="w-full">
					<LibrarySearchBar
						value={library.searchQuery}
						placeholderKey={isHome ? 'library.search_tabs_placeholder' : 'library.search_placeholder'}
						onchange={(v) => library.setSearchQuery(v)}
					/>
				</div>
			{/snippet}
		</PageHeader>
	</div>

	<div class="grid flex-1 min-h-0 overflow-hidden pl-4 {layout.isExpanded ? '' : 'gap-12 lg:grid-cols-[295px_1fr]'}">
		{#if !layout.isExpanded}
		<aside class="overflow-y-auto h-full relative pb-4">
			<TabSidebar />
		</aside>
		{/if}

		<!-- Main: filtered items or home grid -->
		<div class="overflow-y-auto h-full pb-24 pr-4 {library.isSelecting ? 'pb-20' : ''}">
			{#if isHome}
				<LibraryHome />
			{:else}
				<LibraryItemList items={library.filteredItems} loading={library.loading} />
			{/if}
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
	<TabAssignmentDialog onclose={() => { library.clearSelection(); showAssignment = false; }} />
{/if}

<!-- Remove confirm dialog -->
<ConfirmUnfavoriteDialog
	bind:open={showRemoveConfirm}
	count={library.selectedCount}
	onconfirm={handleConfirmRemove}
	oncancel={() => (showRemoveConfirm = false)}
/>
