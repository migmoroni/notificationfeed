<script lang="ts">
	import { onMount } from 'svelte';
	import { feed } from '$lib/stores/feed.svelte.js';
	import { feedCategories } from '$lib/stores/feed-categories.svelte.js';
	import { layout } from '$lib/stores/layout.svelte.js';
	import { FeedList, PriorityFilter } from '$lib/components/feed/index.js';
	import { TreeSelector } from '$lib/components/browse/index.js';
	import type { PriorityFilterValue } from '$lib/components/feed/index.js';
	import { formatRelativeDate } from '$lib/utils/date.js';
	import RefreshCw from '@lucide/svelte/icons/refresh-cw';
	import X from '@lucide/svelte/icons/x';

	let filter: PriorityFilterValue = $state('all');
	let refreshing = $state(false);

	let selectedSubjects = $derived(feedCategories.getSelectedIds('subject'));
	let selectedContentTypes = $derived(feedCategories.getSelectedIds('content_type'));

	onMount(() => {
		feedCategories.loadCategories();
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

<div class="mx-auto w-full px-4 py-4" class:max-w-7xl={layout.isExpanded} class:max-w-2xl={!layout.isExpanded}>
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

		{#if feedCategories.getSelectedCount('subject') > 0 || feedCategories.getSelectedCount('content_type') > 0}
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
			<button
				onclick={() => feedCategories.clearAll()}
				class="text-xs text-muted-foreground hover:text-foreground transition-colors underline"
			>
				Limpar todos
			</button>
		{/if}
	</div>

	<div class="grid gap-6 {layout.isExpanded ? 'lg:grid-cols-[220px_1fr]' : ''}">
		<!-- Sidebar: category trees (only in expanded layout) -->
		{#if layout.isExpanded}
			<aside class="lg:sticky lg:top-4 lg:self-start lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto">
				<TreeSelector store={feedCategories} />
			</aside>
		{/if}

		<!-- Feed list -->
		<div>
			<FeedList {filter} subjectIds={selectedSubjects} contentTypeIds={selectedContentTypes} />
		</div>
	</div>
</div>
