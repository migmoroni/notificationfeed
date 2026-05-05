<!--
  FeedList — post list with priority grouping and infinite scroll.

  Uses feed store and SortedPost from feed-sorter.
-->
<script lang="ts">
	import type { PriorityFilterValue } from './PriorityFilter.svelte';
	import type { PriorityLevel } from '$lib/domain/user/priority-level.js';
	import type { SortedPost } from '$lib/domain/shared/feed-sorter.js';
	import type { CanonicalPost } from '$lib/normalization/canonical-post.js';
	import { feed } from '$lib/stores/feed.svelte.js';
	import { feedEntityFilter } from '$lib/stores/feed-entity-filter.svelte.js';
	import { layout } from '$lib/stores/layout.svelte.js';
	import { viewModeStore } from '$lib/stores/view-mode.svelte.js';
	import { t } from '$lib/i18n/t.js';
	import { UI_LIMITS } from '$lib/config/back-settings.js';
	import { PRIORITY_LEVELS } from '$lib/components/shared/priority/priority.js';
	import { Separator } from '$lib/components/ui/separator/index.js';
	import PostCard from './PostCard.svelte';
	import Newspaper from '@lucide/svelte/icons/newspaper';

	interface Props {
		filter?: PriorityFilterValue;
		anyIds?: { subject: string[]; content: string[]; media: string[]; region: string[]; language: string[] };
		allIds?: { subject: string[]; content: string[]; media: string[]; region: string[]; language: string[] };
		/** Allowed font node IDs (from entity filter). Empty = no filter. */
		nodeIds?: string[];
	}

	const emptyTreeIds = () => ({ subject: [] as string[], content: [] as string[], media: [] as string[], region: [] as string[], language: [] as string[] });

	let { filter = 'all', anyIds = emptyTreeIds(), allIds = emptyTreeIds(), nodeIds = [] }: Props = $props();

	const PAGE_SIZE = UI_LIMITS.feedPageSize;
	let visibleCount = $state(PAGE_SIZE);
	let sentinel: HTMLDivElement | undefined = $state();

	// Whether any category filter is active
	const hasAnyFilter = (ids: typeof anyIds) => Object.values(ids).some((a) => a.length > 0);

	// Get base posts (with category filtering if applicable)
	let basePosts = $derived(
		(hasAnyFilter(anyIds) || hasAnyFilter(allIds))
			? feed.filteredByCategories(anyIds, allIds, feedEntityFilter.effectivePriorityByNodeId)
			: feed.prioritized(feedEntityFilter.effectivePriorityByNodeId)
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

	// Re-bind the IntersectionObserver every time the sentinel element
	// (re)mounts. Using $effect instead of onMount is required because the
	// sentinel is rendered inside `{#if hasMore}` and may appear *after*
	// the component first mounts (when posts arrive asynchronously).
	$effect(() => {
		if (!sentinel) return;
		const el = sentinel;
		const observer = new IntersectionObserver(
			(entries) => {
				if (entries[0]?.isIntersecting && visibleCount < filtered.length) {
					visibleCount += PAGE_SIZE;
				}
			},
			{ rootMargin: '200px' }
		);
		observer.observe(el);
		return () => observer.disconnect();
	});
</script>

{#snippet postGrid(posts: SortedPost<CanonicalPost>[])}
	<div class="grid gap-3 mx-auto {layout.isExpanded ? (viewModeStore.mode === 'cards' ? 'grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3' : viewModeStore.mode === 'list' ? 'grid-cols-1' : 'max-w-3xl grid-cols-1') : 'grid-cols-1'}">
		{#each posts as sortedPost (sortedPost.post.id)}
			<PostCard {sortedPost} />
		{/each}
	</div>
{/snippet}

{#if feed.loading}
	<div class="flex flex-col gap-3 mx-auto {layout.isExpanded ? (viewModeStore.mode === 'cards' ? 'w-full' : viewModeStore.mode === 'list' ? 'max-w-6xl' : 'max-w-3xl') : ''}">
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
	<div class="grid gap-3 mx-auto {layout.isExpanded ? (viewModeStore.mode === 'cards' ? 'grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3' : viewModeStore.mode === 'list' ? 'grid-cols-1' : 'max-w-3xl grid-cols-1') : 'grid-cols-1'}">
		{#each visible as sortedPost (sortedPost.post.id)}
			<PostCard {sortedPost} />
		{/each}

		{#if hasMore}
			<div bind:this={sentinel} class="h-10 flex items-center justify-center {layout.isExpanded && viewModeStore.mode === 'cards' ? 'xl:col-span-2 2xl:col-span-3' : ''}">
				<div class="h-5 w-5 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent"></div>
			</div>
		{/if}
	</div>
{/if}
