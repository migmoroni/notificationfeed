<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { browse } from '$lib/stores/browse.svelte.js';
	import { layout } from '$lib/stores/layout.svelte.js';
	import { TreeSelector, EntityList, SearchBar } from '$lib/components/browse/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import X from '@lucide/svelte/icons/x';
	import Upload from '@lucide/svelte/icons/upload';

	onMount(() => {
		if (browse.categories.length === 0) {
			browse.loadCategories();
		}
	});
</script>

<svelte:head>
	<title>Notfeed — Browse</title>
</svelte:head>

<div class="mx-auto w-full px-4 py-4" class:max-w-6xl={layout.isExpanded} class:max-w-2xl={!layout.isExpanded}>
	<!-- Header -->
	<div class="mb-4 flex items-center justify-between">
		<h1 class="text-xl font-bold">Browse</h1>
		<Button variant="outline" size="sm" onclick={() => goto('/browse/import')}>
			<Upload class="mr-1.5 size-4" />
			Importar
		</Button>
	</div>

	<div class="grid gap-4 {layout.isExpanded ? 'lg:grid-cols-[260px_1fr]' : 'md:grid-cols-[220px_1fr]'}">
		<!-- Sidebar: search + trees always visible -->
		<aside class="flex flex-col gap-4 {layout.isExpanded ? 'lg:sticky lg:top-4 lg:self-start lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto' : 'md:sticky md:top-4 md:self-start md:max-h-[calc(100vh-2rem)] md:overflow-y-auto'}">
			<SearchBar />
			<TreeSelector />
		</aside>

		<!-- Main: filtered results -->
		<div>
			{#if browse.hasFilters}
				<!-- Active filter badges -->
				{#if browse.getSelectedCount('subject') > 0 || browse.getSelectedCount('content_type') > 0}
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
						<button
							onclick={() => browse.clearAllCategories()}
							class="text-xs text-muted-foreground hover:text-foreground transition-colors underline"
						>
							Limpar todos
						</button>
					</div>
				{/if}

				<EntityList entities={browse.entities} loading={browse.loading} />
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
