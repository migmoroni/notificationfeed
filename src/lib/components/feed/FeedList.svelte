<!--
  FeedList — post list with priority grouping and infinite scroll.

  Uses feed store and SortedPost from feed-sorter.
-->
<script lang="ts">
	import { onMount } from 'svelte';
	import type { PriorityFilterValue } from './PriorityFilter.svelte';
	import type { PriorityLevel } from '$lib/domain/user/priority-level.js';
	import type { SortedPost } from '$lib/domain/shared/feed-sorter.js';
	import type { CanonicalPost } from '$lib/normalization/canonical-post.js';
	import { feed } from '$lib/stores/feed.svelte.js';
	import { layout } from '$lib/stores/layout.svelte.js';
	import { t } from '$lib/i18n/t.js';
	import { PRIORITY_LEVELS } from '$lib/components/shared/priority/priority.js';
	import { Separator } from '$lib/components/ui/separator/index.js';
	import PostCard from './PostCard.svelte';
	import Newspaper from '@lucide/svelte/icons/newspaper';

	interface Props {
		filter?: PriorityFilterValue;
		subjectIds?: string[];
		contentTypeIds?: string[];
		regionIds?: string[];
		/** Allowed font node IDs (from entity filter). Empty = no filter. */
		nodeIds?: string[];
	}

	let { filter = 'all', subjectIds = [], contentTypeIds = [], regionIds = [], nodeIds = [] }: Props = $props();

	const PAGE_SIZE = 20;
	let visibleCount = $state(PAGE_SIZE);
	let sentinel: HTMLDivElement | undefined = $state();

	// Get base posts (with category filtering if applicable)
	let basePosts = $derived(
		(subjectIds.length > 0 || contentTypeIds.length > 0 || regionIds.length > 0)
			? feed.filteredByCategories(subjectIds, contentTypeIds, regionIds)
			: feed.prioritized
	);

	// Apply entity (node) filter
	let entityFiltered = $derived(
		nodeIds.length > 0
			? (() => { const allowed = new Set(nodeIds); return basePosts.filter((sp) => allowed.has(sp.post.nodeId)); })()
			: basePosts
	);

	// Apply priority filter on top
	let filtered = $derived(
		filter === 'all'
			? entityFiltered
			: entityFiltered.filter((sp) => sp.priority === filter)
	);

	// Group posts by priority level (only used when filter === 'all')
	let groupedByPriority = $derived.by(() => {
		if (filter !== 'all') return null;
		const map = new Map<PriorityLevel, SortedPost<CanonicalPost>[]>();
		for (const sp of filtered) {
			const list = map.get(sp.priority);
			if (list) list.push(sp);
			else map.set(sp.priority, [sp]);
		}
		return PRIORITY_LEVELS
			.filter((p) => map.has(p.level))
			.map((p) => ({ config: p, posts: map.get(p.level)! }));
	});

	let visible = $derived(filtered.slice(0, visibleCount));
	let hasMore = $derived(visibleCount < filtered.length);

	$effect(() => {
		filter;
		visibleCount = PAGE_SIZE;
	});

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

{#snippet postGrid(posts: SortedPost<CanonicalPost>[])}
	<div class="grid gap-3 {layout.isExpanded ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'}">
		{#each posts as sortedPost (sortedPost.post.id)}
			<PostCard {sortedPost} />
		{/each}
	</div>
{/snippet}

{#if feed.loading}
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
	<div class="flex flex-col items-center justify-center py-16 text-muted-foreground">
		<Newspaper class="size-12 mb-4 opacity-30" />
		<p class="text-lg font-medium mb-1">{t('feed.empty_no_posts')}</p>
		<p class="text-sm">
			{#if filter !== 'all'}
				{t('feed.empty_no_priority')}
			{:else}
				{t('feed.empty_add_sources')}
			{/if}
		</p>
	</div>
{:else if groupedByPriority}
	<div class="flex flex-col gap-6">
		{#each groupedByPriority as group, i (group.config.level)}
			{#if i > 0}
				<Separator />
			{/if}
			<section>
				<h3 class="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">
					{t(group.config.nameKey)} ({group.posts.length})
				</h3>
				{@render postGrid(group.posts.slice(0, visibleCount))}
			</section>
		{/each}
	</div>

	{#if hasMore}
		<div bind:this={sentinel} class="h-10 flex items-center justify-center mt-3">
			<div class="h-5 w-5 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent"></div>
		</div>
	{/if}
{:else}
	<div class="grid gap-3 {layout.isExpanded ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'}">
		{#each visible as sortedPost (sortedPost.post.id)}
			<PostCard {sortedPost} />
		{/each}

		{#if hasMore}
			<div bind:this={sentinel} class="h-10 flex items-center justify-center {layout.isExpanded ? 'lg:col-span-2' : ''}">
				<div class="h-5 w-5 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent"></div>
			</div>
		{/if}
	</div>
{/if}
