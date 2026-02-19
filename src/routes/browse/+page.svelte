<script lang="ts">
	import { onMount } from 'svelte';
	import { browse } from '$lib/stores/browse.svelte.js';
	import { TreeSelector, EntityList, SearchBar } from '$lib/components/browse/index.js';

	onMount(() => {
		if (browse.categories.length === 0) {
			browse.loadCategories();
		}
	});

	function handleCategorySelect(categoryId: string | null) {
		browse.selectCategory(categoryId);
	}
</script>

<svelte:head>
	<title>Notfeed — Browse</title>
</svelte:head>

<div class="container mx-auto max-w-2xl px-4 py-4">
	<!-- Header -->
	<div class="mb-4">
		<h1 class="text-xl font-bold mb-3">Browse</h1>
		<SearchBar />
	</div>

	{#if browse.searchQuery}
		<!-- Search results -->
		<EntityList entities={browse.entities} loading={browse.loading} />
	{:else}
		<!-- Category navigation + entity list -->
		<div class="grid gap-4 md:grid-cols-[220px_1fr]">
			<!-- Sidebar: tree selector -->
			<aside class="md:sticky md:top-4 md:self-start">
				<TreeSelector
					selectedCategoryId={browse.selectedCategoryId}
					onselect={handleCategorySelect}
				/>
			</aside>

			<!-- Main: entities -->
			<div>
				{#if browse.selectedCategoryId}
					<EntityList entities={browse.entities} loading={browse.loading} />
				{:else}
					<div class="flex flex-col items-center justify-center py-12 text-center">
						<p class="text-sm text-muted-foreground">
							Selecione uma categoria para descobrir conteúdo.
						</p>
					</div>
				{/if}
			</div>
		</div>
	{/if}
</div>
