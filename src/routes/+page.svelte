<script lang="ts">
	import { onMount } from 'svelte';
	import { feed } from '$lib/stores/feed.svelte.js';
	import { feedCategories } from '$lib/stores/feed-categories.svelte.js';
	import { feedEntityFilter } from '$lib/stores/feed-entity-filter.svelte.js';
	import { feedMacros } from '$lib/stores/feed-macros.svelte.js';
	import { layout } from '$lib/stores/layout.svelte.js';
	import { FeedList, PriorityFilter } from '$lib/components/feed/index.js';
	import EntityTreeFilter from '$lib/components/feed/EntityTreeFilter.svelte';
	import FeedMacros from '$lib/components/feed/FeedMacros.svelte';
	import { TreeSelector } from '$lib/components/browse/index.js';
	import * as Collapsible from '$lib/components/ui/collapsible/index.js';
	import type { PriorityFilterValue } from '$lib/components/feed/index.js';
	import { formatRelativeDate } from '$lib/utils/date.js';
	import RefreshCw from '@lucide/svelte/icons/refresh-cw';
	import X from '@lucide/svelte/icons/x';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import Filter from '@lucide/svelte/icons/filter';

	let filter: PriorityFilterValue = $state('all');
	let refreshing = $state(false);
	let advancedFiltersOpen = $state(false);

	let selectedSubjects = $derived(feedCategories.getSelectedIds('subject'));
	let selectedContentTypes = $derived(feedCategories.getSelectedIds('content_type'));
	let selectedRegions = $derived(feedCategories.getSelectedIds('region'));
	let allowedFontIds = $derived(feedEntityFilter.hasFilters ? [...feedEntityFilter.getAllowedFontIds()] : []);

	onMount(async () => {
		feedCategories.loadCategories();
		feedEntityFilter.loadPages();
		await feedMacros.init();
	});

	$effect(() => {
		// Track filter changes to clear active macro if needed
		selectedSubjects;
		selectedContentTypes;
		selectedRegions;
		feedEntityFilter.selectedPageIds;
		feedEntityFilter.selectedProfileIds;
		feedEntityFilter.selectedFontIds;
		feedMacros.clearActiveMacroIfChanged();
	});

	async function handleRefresh() {
		refreshing = true;
		try {
			await feed.refreshFeed();
		} finally {
			refreshing = false;
		}
	}
</script>

<svelte:head>
	<title>Notfeed — Feed</title>
</svelte:head>

<div class="mx-auto w-full py-4" class:max-w-8xl={layout.isExpanded} class:max-w-2xl={!layout.isExpanded} class:px-4={!layout.isExpanded} class:pl-4={layout.isExpanded} class:pr-24={layout.isExpanded}>
	<!-- Header -->
	<div class="flex items-center justify-between mb-4 gap-3">
		<div class="flex items-center gap-3 min-w-0">
			<h1 class="text-xl font-bold shrink-0">Feed</h1>
			{#if feed.lastRefresh}
				<span class="text-xs text-muted-foreground truncate hidden sm:inline">
					{formatRelativeDate(feed.lastRefresh)}
				</span>
			{/if}
		</div>
		<button
			onclick={handleRefresh}
			disabled={refreshing}
			class="inline-flex items-center justify-center size-8 rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors disabled:opacity-50"
			aria-label="Atualizar feed"
		>
			<RefreshCw class="size-4 {refreshing ? 'animate-spin' : ''}" />
		</button>
	</div>

	<!-- Priority filter + active category badges -->
	<div class="flex items-center gap-3 mb-4 flex-wrap">
		<PriorityFilter value={filter} onchange={(v) => (filter = v)} />

		{#if feedCategories.getSelectedCount('subject') > 0 || feedCategories.getSelectedCount('content_type') > 0 || feedCategories.getSelectedCount('region') > 0}
			{#each selectedSubjects as catId (catId)}
				{@const cat = feedCategories.categories.find((c) => c.id === catId)}
				{#if cat}
					<button
						onclick={() => feedCategories.toggleCategory(catId, 'subject')}
						class="inline-flex items-center gap-1 rounded-full bg-accent px-2.5 py-0.5 text-xs font-medium text-accent-foreground hover:bg-accent/80 transition-colors"
					>
						{cat.label}
						<X class="size-3" />
					</button>
				{/if}
			{/each}
			{#each selectedContentTypes as catId (catId)}
				{@const cat = feedCategories.categories.find((c) => c.id === catId)}
				{#if cat}
					<button
						onclick={() => feedCategories.toggleCategory(catId, 'content_type')}
						class="inline-flex items-center gap-1 rounded-full bg-accent px-2.5 py-0.5 text-xs font-medium text-accent-foreground hover:bg-accent/80 transition-colors"
					>
						{cat.label}
						<X class="size-3" />
					</button>
				{/if}
			{/each}
			{#each selectedRegions as catId (catId)}
				{@const cat = feedCategories.categories.find((c) => c.id === catId)}
				{#if cat}
					<button
						onclick={() => feedCategories.toggleCategory(catId, 'region')}
						class="inline-flex items-center gap-1 rounded-full bg-accent px-2.5 py-0.5 text-xs font-medium text-accent-foreground hover:bg-accent/80 transition-colors"
					>
						{cat.label}
						<X class="size-3" />
					</button>
				{/if}
			{/each}
			<button
				onclick={() => feedCategories.clearAll()}
				class="text-xs text-muted-foreground hover:text-foreground transition-colors underline"
			>
				Limpar todos
			</button>
		{/if}
	</div>

	<div class="grid gap-12 {layout.isExpanded ? 'lg:grid-cols-[295px_1fr]' : ''}">
		<!-- Sidebar: entity tree + category trees (only in expanded layout) -->
		{#if layout.isExpanded}
			<aside class="lg:sticky lg:top-4 lg:self-start lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto flex flex-col gap-4">
				<FeedMacros />

				<div class="border-t border-border pt-4">
					<Collapsible.Root bind:open={advancedFiltersOpen}>
						<Collapsible.Trigger
							class="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
						>
							<div class="flex items-center gap-2">
								<Filter class="size-4" />
								Filtros Avançados
							</div>
							<ChevronRight
								class="size-4 transition-transform duration-200 {advancedFiltersOpen ? 'rotate-90' : ''}"
							/>
						</Collapsible.Trigger>
						<Collapsible.Content class="pt-3 flex flex-col gap-3">
							<EntityTreeFilter />
							<div class="border-t border-border pt-3">
								<TreeSelector store={feedCategories} />
							</div>
						</Collapsible.Content>
					</Collapsible.Root>
				</div>
			</aside>
		{/if}

		<!-- Feed list -->
		<div>
			<FeedList {filter} subjectIds={selectedSubjects} contentTypeIds={selectedContentTypes} regionIds={selectedRegions} fontIds={allowedFontIds} />
		</div>
	</div>
</div>
