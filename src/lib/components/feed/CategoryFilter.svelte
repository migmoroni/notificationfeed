<script lang="ts">
	import type { Category, CategoryTreeId } from '$lib/domain/category/category.js';
	import { feed } from '$lib/stores/feed.svelte.js';
	import { createCategoryStore } from '$lib/persistence/category.store.js';
	import { onMount } from 'svelte';
	import Filter from '@lucide/svelte/icons/filter';
	import X from '@lucide/svelte/icons/x';

	interface Props {
		subjectIds?: string[];
		contentTypeIds?: string[];
		onchange?: (filters: { subjectIds: string[]; contentTypeIds: string[] }) => void;
	}

	let { subjectIds = [], contentTypeIds = [], onchange }: Props = $props();

	let subjectCategories: Category[] = $state([]);
	let contentTypeCategories: Category[] = $state([]);
	let showPanel = $state(false);

	const categoryRepo = createCategoryStore();

	onMount(async () => {
		const [subjects, contentTypes] = await Promise.all([
			categoryRepo.getSublevels('subject'),
			categoryRepo.getSublevels('content_type')
		]);
		subjectCategories = subjects.filter((c) => c.isActive).sort((a, b) => a.order - b.order);
		contentTypeCategories = contentTypes.filter((c) => c.isActive).sort((a, b) => a.order - b.order);
	});

	function toggleCategory(treeId: CategoryTreeId, catId: string) {
		let newSubjects = [...subjectIds];
		let newContentTypes = [...contentTypeIds];

		if (treeId === 'subject') {
			if (newSubjects.includes(catId)) {
				newSubjects = newSubjects.filter((id) => id !== catId);
			} else {
				newSubjects = [...newSubjects, catId];
			}
		} else {
			if (newContentTypes.includes(catId)) {
				newContentTypes = newContentTypes.filter((id) => id !== catId);
			} else {
				newContentTypes = [...newContentTypes, catId];
			}
		}

		onchange?.({ subjectIds: newSubjects, contentTypeIds: newContentTypes });
	}

	function clearAll() {
		onchange?.({ subjectIds: [], contentTypeIds: [] });
	}

	let activeCount = $derived(subjectIds.length + contentTypeIds.length);
</script>

<div class="relative">
	<button
		onclick={() => (showPanel = !showPanel)}
		class="inline-flex items-center gap-1.5 rounded-md border border-input bg-background px-3 py-1.5 text-xs font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
		class:text-primary={activeCount > 0}
	>
		<Filter class="size-3.5" />
		Categorias
		{#if activeCount > 0}
			<span class="inline-flex items-center justify-center size-4 rounded-full bg-primary text-primary-foreground text-[10px]">
				{activeCount}
			</span>
		{/if}
	</button>

	{#if showPanel}
		<!-- Backdrop -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div class="fixed inset-0 z-40" onclick={() => (showPanel = false)} onkeydown={() => {}}></div>

		<!-- Filter panel -->
		<div class="absolute left-0 top-full mt-2 z-50 w-72 rounded-lg border border-border bg-popover p-3 shadow-md">
			<div class="flex items-center justify-between mb-3">
				<span class="text-sm font-semibold">Filtrar por categoria</span>
				{#if activeCount > 0}
					<button onclick={clearAll} class="text-xs text-muted-foreground hover:text-foreground">
						Limpar
					</button>
				{/if}
			</div>

			<!-- Subject categories -->
			{#if subjectCategories.length > 0}
				<div class="mb-3">
					<p class="text-xs font-medium text-muted-foreground mb-1.5">Assunto</p>
					<div class="flex flex-wrap gap-1.5">
						{#each subjectCategories as cat (cat.id)}
							<button
								onclick={() => toggleCategory('subject', cat.id)}
								class="rounded-full border px-2.5 py-0.5 text-xs transition-colors
									{subjectIds.includes(cat.id)
									? 'border-primary bg-primary text-primary-foreground'
									: 'border-input bg-background hover:bg-accent'}"
							>
								{cat.label}
							</button>
						{/each}
					</div>
				</div>
			{/if}

			<!-- Content type categories -->
			{#if contentTypeCategories.length > 0}
				<div>
					<p class="text-xs font-medium text-muted-foreground mb-1.5">Tipo de Conteúdo</p>
					<div class="flex flex-wrap gap-1.5">
						{#each contentTypeCategories as cat (cat.id)}
							<button
								onclick={() => toggleCategory('content_type', cat.id)}
								class="rounded-full border px-2.5 py-0.5 text-xs transition-colors
									{contentTypeIds.includes(cat.id)
									? 'border-primary bg-primary text-primary-foreground'
									: 'border-input bg-background hover:bg-accent'}"
							>
								{cat.label}
							</button>
						{/each}
					</div>
				</div>
			{/if}
		</div>
	{/if}
</div>
