<script lang="ts">
	import { feed } from '$lib/stores/feed.svelte.js';
	import { layout } from '$lib/stores/layout.svelte.js';
	import { FeedList, PriorityFilter } from '$lib/components/feed/index.js';
	import type { PriorityFilterValue } from '$lib/components/feed/index.js';
	import { formatRelativeDate } from '$lib/utils/date.js';
	import RefreshCw from '@lucide/svelte/icons/refresh-cw';

	let filter: PriorityFilterValue = $state('all');
	let refreshing = $state(false);

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

<div class="container mx-auto max-w-2xl px-4 py-4">
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

	<!-- Priority filter -->
	<div class="mb-4">
		<PriorityFilter value={filter} onchange={(v) => (filter = v)} />
	</div>

	<!-- Feed list -->
	<FeedList {filter} />
</div>
