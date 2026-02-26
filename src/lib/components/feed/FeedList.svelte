<script lang="ts">
	import { onMount } from 'svelte';
	import type { PriorityFilterValue } from './PriorityFilter.svelte';
	import { feed } from '$lib/stores/feed.svelte.js';
	import { layout } from '$lib/stores/layout.svelte.js';
	import PostCard from './PostCard.svelte';
	import Newspaper from '@lucide/svelte/icons/newspaper';

	interface Props {
		filter?: PriorityFilterValue;
		subjectIds?: string[];
		contentTypeIds?: string[];
		regionIds?: string[];
		fontIds?: string[];
	}

	let { filter = 'all', subjectIds = [], contentTypeIds = [], regionIds = [], fontIds = [] }: Props = $props();

	const PAGE_SIZE = 20;
	let visibleCount = $state(PAGE_SIZE);
	let sentinel: HTMLDivElement | undefined = $state();

	// Get base posts (with category filtering if applicable)
	let basePosts = $derived(
		(subjectIds.length > 0 || contentTypeIds.length > 0 || regionIds.length > 0)
			? feed.filteredByCategories(subjectIds, contentTypeIds, regionIds)
			: feed.prioritized
	);

	// Apply entity (font) filter
	let entityFiltered = $derived(
		fontIds.length > 0
			? (() => { const allowed = new Set(fontIds); return basePosts.filter((sp) => allowed.has(sp.post.fontId)); })()
			: basePosts
	);

	// Apply priority filter on top
	let filtered = $derived(
		filter === 'all'
			? entityFiltered
			: entityFiltered.filter((sp) => sp.priority === filter)
	);

	let visible = $derived(filtered.slice(0, visibleCount));
	let hasMore = $derived(visibleCount < filtered.length);

	// Reset pagination when filter changes
	$effect(() => {
		filter; // track
		visibleCount = PAGE_SIZE;
	});

	// IntersectionObserver for infinite scroll
	onMount(() => {
		if (!sentinel) return;

		const observer = new IntersectionObserver(
			(entries) => {
				if (entries[0]?.isIntersecting && hasMore) {
					visibleCount += PAGE_SIZE;
				}
			},
			{ rootMargin: '200px' }
		);

		observer.observe(sentinel);

		return () => observer.disconnect();
	});
</script>

{#if feed.loading}
	<!-- Loading skeleton -->
	<div class="flex flex-col gap-3">
		{#each { length: 3 } as _}
			<div class="rounded-lg border border-border bg-card p-4 space-y-3">
				<div class="h-4 w-3/4 animate-pulse rounded bg-muted"></div>
				<div class="h-3 w-1/3 animate-pulse rounded bg-muted"></div>
				<div class="space-y-1.5">
					<div class="h-3 w-full animate-pulse rounded bg-muted"></div>
					<div class="h-3 w-2/3 animate-pulse rounded bg-muted"></div>
				</div>
				<div class="flex items-center gap-2">
					<div class="h-3 w-20 animate-pulse rounded bg-muted"></div>
					<div class="h-5 w-12 animate-pulse rounded-full bg-muted"></div>
				</div>
			</div>
		{/each}
	</div>
{:else if filtered.length === 0}
	<!-- Empty state -->
	<div class="flex flex-col items-center justify-center py-16 text-muted-foreground">
		<Newspaper class="size-12 mb-4 opacity-30" />
		<p class="text-lg font-medium mb-1">Nenhum post ainda</p>
		<p class="text-sm">
			{#if filter !== 'all'}
				Nenhum post com essa prioridade.
			{:else}
				Adicione fontes para começar a receber conteúdo.
			{/if}
		</p>
	</div>
{:else}
	<!-- Post list -->
	<div class="grid gap-3 {layout.isExpanded ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'}">
		{#each visible as sortedPost (sortedPost.post.id)}
			<PostCard {sortedPost} />
		{/each}

		<!-- Infinite scroll sentinel -->
		{#if hasMore}
			<div bind:this={sentinel} class="h-10 flex items-center justify-center {layout.isExpanded ? 'lg:col-span-2' : ''}">
				<div class="h-5 w-5 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent"></div>
			</div>
		{/if}
	</div>
{/if}
