<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { browse } from '$lib/stores/browse.svelte.js';
	import { browseEntityFilter } from '$lib/stores/browse-entity-filter.svelte.js';
	import { layout } from '$lib/stores/layout.svelte.js';
	import { EntityList } from '$lib/components/shared/entity/index.js';
	import { SearchBar } from '$lib/components/browse/index.js';
	import FilterSidebar from '$lib/components/shared/FilterSidebar.svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import X from '@lucide/svelte/icons/x';
	import Upload from '@lucide/svelte/icons/upload';

	let allowedFontIds = $derived(
		browseEntityFilter.hasFilters ? [...browseEntityFilter.getAllowedFontIds()] : []
	);
	let allowedProfileIds = $derived(
		browseEntityFilter.hasFilters ? browseEntityFilter.getAllowedProfileIds() : new Set<string>()
	);

	let hasAnyFilter = $derived(browse.hasFilters || browseEntityFilter.hasFilters);

	// When entity filter becomes active but browse has no own filters, load all entities.
	// When entity filter is cleared and browse has no own filters, clear entities.
	$effect(() => {
		if (browseEntityFilter.hasFilters && !browse.hasFilters) {
			browse.loadAllEntities();
		} else if (!browseEntityFilter.hasFilters && !browse.hasFilters) {
			browse.clearEntities();
		}
	});

	// Filter browse entities by the entity filter when active
	let filteredEntities = $derived.by(() => {
		if (!browseEntityFilter.hasFilters) return browse.entities;
		const fontSet = new Set(allowedFontIds);
		return browse.entities.filter((e) => {
			if (e.type === 'font') return fontSet.has(e.data.id);
			if (e.type === 'profile') {
				return allowedProfileIds.has(e.data.id);
			}
			if (e.type === 'creator_page') {
				return browse.entities.some(
					(p) =>
						p.type === 'profile' &&
						p.data.creatorPageId === e.data.id &&
						allowedProfileIds.has(p.data.id)
				);
			}
			return true;
		});
	});

	onMount(() => {
		if (browse.categories.length === 0) {
			browse.loadCategories();
		}
		browseEntityFilter.loadPages();
	});
</script>

<svelte:head>
	<title>Notfeed — Browse</title>
</svelte:head>

<div class="mx-auto w-full h-full flex flex-col overflow-hidden py-4" class:max-w-8xl={layout.isExpanded} class:max-w-2xl={!layout.isExpanded} class:px-4={!layout.isExpanded} class:pl-4={layout.isExpanded}>
	<!-- Header -->
	<div class="mb-4 flex items-center justify-between pr-24">
		<h1 class="text-xl font-bold">Browse</h1>
		<Button variant="outline" size="sm" onclick={() => goto('/browse/import')}>
			<Upload class="mr-1.5 size-4" />
			Importar
		</Button>
	</div>

	<!-- Search bar (full width above content) -->
	<div class="mb-4 pr-24">
		<SearchBar />
	</div>

	<!-- Active filter badges -->
	{#if browse.getSelectedCount('subject') > 0 || browse.getSelectedCount('content_type') > 0 || browse.getSelectedCount('region') > 0}
		<div class="flex flex-wrap gap-1.5 mb-3">
			{#each [...browse.selectedByTree.subject] as catId (catId)}
				{@const cat = browse.categories.find((c) => c.id === catId)}
				{#if cat}
					<button
						onclick={() => browse.toggleCategory(catId, 'subject')}
						class="inline-flex items-center gap-1 rounded-full bg-accent px-2.5 py-0.5 text-xs font-medium text-accent-foreground hover:bg-accent/80 transition-colors"
					>
						{cat.label}
						<X class="size-3" />
					</button>
				{/if}
			{/each}
			{#each [...browse.selectedByTree.content_type] as catId (catId)}
				{@const cat = browse.categories.find((c) => c.id === catId)}
				{#if cat}
					<button
						onclick={() => browse.toggleCategory(catId, 'content_type')}
						class="inline-flex items-center gap-1 rounded-full bg-accent px-2.5 py-0.5 text-xs font-medium text-accent-foreground hover:bg-accent/80 transition-colors"
					>
						{cat.label}
						<X class="size-3" />
					</button>
				{/if}
			{/each}
			{#each [...browse.selectedByTree.region] as catId (catId)}
				{@const cat = browse.categories.find((c) => c.id === catId)}
				{#if cat}
					<button
						onclick={() => browse.toggleCategory(catId, 'region')}
						class="inline-flex items-center gap-1 rounded-full bg-accent px-2.5 py-0.5 text-xs font-medium text-accent-foreground hover:bg-accent/80 transition-colors"
					>
						{cat.label}
						<X class="size-3" />
					</button>
				{/if}
			{/each}
			<button
				onclick={() => browse.clearAllCategories()}
				class="text-xs text-muted-foreground hover:text-foreground transition-colors underline"
			>
				Limpar todos
			</button>
		</div>
	{/if}

	<div class="grid gap-12 flex-1 min-h-0 overflow-hidden {layout.isExpanded ? 'lg:grid-cols-[295px_1fr]' : 'md:grid-cols-[265px_1fr]'}">
		<!-- Sidebar -->
		<aside class="overflow-y-auto">
			<FilterSidebar entityStore={browseEntityFilter} categoryStore={browse} />
		</aside>

		<!-- Main: filtered results -->
		<div class="overflow-y-auto pr-24">
			{#if hasAnyFilter}
				<EntityList entities={filteredEntities} loading={browse.loading} />
			{:else}
				<div class="flex flex-col items-center justify-center py-12 text-center">
					<p class="text-sm text-muted-foreground">
						Selecione categorias ou pesquise para descobrir conteúdo.
					</p>
				</div>
			{/if}
		</div>
	</div>
</div>
