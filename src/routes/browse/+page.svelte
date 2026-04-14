<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { goto } from '$app/navigation';
	import { browse } from '$lib/stores/browse.svelte.js';
	import { browseEntityFilter } from '$lib/stores/browse-entity-filter.svelte.js';
	import { layout } from '$lib/stores/layout.svelte.js';
	import { sidebarSlot } from '$lib/stores/sidebar-slot.svelte.js';
	import EntityList from '$lib/components/shared/entity/EntityList.svelte';
	import { SearchBar } from '$lib/components/browse/index.js';
	import FilterSidebar from '$lib/components/shared/FilterSidebar.svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import X from '@lucide/svelte/icons/x';
	import Upload from '@lucide/svelte/icons/upload';
	import { t } from '$lib/i18n/t.js';
	import { tCat } from '$lib/i18n/category.js';

	let allowedFontNodeIds = $derived(
		browseEntityFilter.hasFilters ? [...browseEntityFilter.getAllowedFontNodeIds()] : []
	);

	// Load all nodes when entity filter is active without category filters,
	// or always ensure nodes are loaded for the default view.
	$effect(() => {
		if (browseEntityFilter.hasFilters && !browse.hasFilters) {
			browse.loadAllNodes();
		}
	});

	// Filter browse nodes by the entity filter when active
	let filteredNodes = $derived.by(() => {
		if (!browseEntityFilter.hasFilters) return browse.nodes;
		const fontSet = new Set(allowedFontNodeIds);
		const selectedCreators = new Set(browseEntityFilter.selectedCreatorIds);
		const selectedProfiles = new Set(browseEntityFilter.selectedProfileIds);
		return browse.nodes.filter((n) => {
			switch (n.role) {
				case 'font': return fontSet.has(n.metadata.id);
				case 'profile': return selectedProfiles.has(n.metadata.id);
				case 'creator': return selectedCreators.has(n.metadata.id);
				default: return true;
			}
		});
	});

	onMount(async () => {
		if (browse.categories.length === 0) {
			browse.loadCategories();
		}
		await browseEntityFilter.loadNodes();
		if (browse.hasFilters) {
			await browse.applyFilters();
		} else {
			await browse.loadAllNodes();
		}
		sidebarSlot.set(sidebarContent);
	});

	onDestroy(() => {
		sidebarSlot.set(null);
	});
</script>

{#snippet sidebarContent()}
	<div class="h-full overflow-hidden">
		<FilterSidebar entityStore={browseEntityFilter} categoryStore={browse} />
	</div>
{/snippet}

<svelte:head>
	<title>{t('page_title.browse')}</title>
</svelte:head>

<div class="mx-auto w-full h-full flex flex-col overflow-hidden py-4 px-4" class:max-w-8xl={layout.isExpanded} class:max-w-2xl={!layout.isExpanded}>
	<!-- Header -->
	<div class="mb-4 flex items-center justify-between pr-24">
		<h1 class="text-xl font-bold">{t('title.browse')}</h1>
		<Button variant="outline" size="sm" onclick={() => goto('/browse/import')}>
			<Upload class="mr-1.5 size-4" />
			{t('btn.import')}
		</Button>
	</div>

	<!-- Search bar (full width above content) -->
	<div class="mb-4 pr-24">
		<SearchBar />
	</div>

	<!-- Active filter badges -->
	{#if browse.getSelectedCount('subject') > 0 || browse.getSelectedCount('content_type') > 0 || browse.getSelectedCount('media_type') > 0 || browse.getSelectedCount('region') > 0}
		{@const allTrees = [
			{ treeId: 'subject' as const, ids: [...browse.modeByTree.subject.keys()] },
			{ treeId: 'content_type' as const, ids: [...browse.modeByTree.content_type.keys()] },
			{ treeId: 'media_type' as const, ids: [...browse.modeByTree.media_type.keys()] },
			{ treeId: 'region' as const, ids: [...browse.modeByTree.region.keys()] }
		]}
		<div class="flex flex-wrap gap-1.5 mb-3">
			{#each allTrees as { treeId, ids }}
				{#each ids as catId (catId)}
					{@const cat = browse.categories.find((c) => c.id === catId)}
					{@const mode = browse.getFilterMode(catId, treeId)}
					{#if cat}
						<button
							onclick={() => browse.toggleCategory(catId, treeId)}
							class="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors
								{mode === 'all'
									? 'bg-primary text-primary-foreground hover:bg-primary/80'
									: 'bg-accent text-accent-foreground hover:bg-accent/80 ring-1 ring-accent-foreground/20'}"
							title={mode === 'all' ? t('category_filter.mode_all') : t('category_filter.mode_any')}
						>
							{tCat(cat.id)}
							<X class="size-3" />
						</button>
					{/if}
				{/each}
			{/each}
			<button
				onclick={() => browse.clearAllCategories()}
				class="text-xs text-muted-foreground hover:text-foreground transition-colors underline"
			>
				{t('btn.clear_all')}
			</button>
		</div>
	{/if}

	<div class="grid gap-12 flex-1 min-h-0 overflow-hidden {layout.isExpanded ? '' : 'md:grid-cols-[265px_1fr]'}">
		{#if !layout.isExpanded}
		<!-- Sidebar only in compact mode (inline) -->
		<aside class="overflow-hidden h-full relative">
			<FilterSidebar entityStore={browseEntityFilter} categoryStore={browse} />
		</aside>
		{/if}

		<!-- Main: results -->
		<div class="overflow-y-auto pr-24">
			<EntityList nodes={filteredNodes} loading={browse.loading} />
		</div>
	</div>
</div>
