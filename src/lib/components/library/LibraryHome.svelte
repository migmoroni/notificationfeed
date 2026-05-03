<!--
  LibraryHome — initial page of the library.

  Displays every library tab (system + custom) in a 5-column grid.
  Clicking a tab card activates it. A search bar filters the tab list by title.
-->
<script lang="ts">
	import { library, ALL_LIBRARY_ID, ONLY_FAVORITES_ID } from '$lib/stores/library.svelte.js';
	import { t } from '$lib/i18n/t.js';

	let resolvedTabs = $derived.by(() => {
		return library.tabs.map((tab) => {
			let title: string;
			if (tab.id === ALL_LIBRARY_ID) title = t('library.all');
			else if (tab.id === ONLY_FAVORITES_ID) title = t('library.only_favorites');
			else title = tab.title;
			const count = library.itemsByTab.get(tab.id)?.length ?? 0;
			return { id: tab.id, title, emoji: tab.emoji, count };
		});
	});

	let filtered = $derived.by(() => {
		const q = library.searchQuery.trim().toLowerCase();
		if (!q) return resolvedTabs;
		return resolvedTabs.filter((t) => t.title.toLowerCase().includes(q));
	});
</script>

<div class="flex flex-col gap-4 h-full min-h-0">

	{#if resolvedTabs.length === 0}
		<div class="flex flex-col items-center justify-center py-12 text-center">
			<p class="text-sm text-muted-foreground">{t('library.home_empty')}</p>
		</div>
	{:else if filtered.length === 0}
		<div class="flex flex-col items-center justify-center py-12 text-center">
			<p class="text-sm text-muted-foreground">{t('library.home_no_results')}</p>
		</div>
	{:else}
		<div class="grid gap-3 grid-cols-4 sm:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7">
			{#each filtered as tab (tab.id)}
				<button
					type="button"
					onclick={() => library.setActiveTab(tab.id)}
					class="group flex flex-col items-center justify-start gap-2 h-full rounded-lg border bg-card text-card-foreground p-3 hover:bg-accent hover:text-accent-foreground transition-colors"
				>
					<span class="text-5xl leading-none">{tab.emoji}</span>
					<span class="text-sm font-medium text-center line-clamp-2 wrap-break-word">{tab.title}</span>
					<span class="text-xs text-muted-foreground">{tab.count}</span>
				</button>
			{/each}
		</div>
	{/if}
</div>
