<script lang="ts">
	import type { Category, CategoryTreeId } from '$lib/domain/category/category.js';
	import { feed } from '$lib/stores/feed.svelte.js';
	import { createCategoryStore } from '$lib/persistence/category.store.js';
	import { onMount } from 'svelte';
	import Filter from '@lucide/svelte/icons/filter';
	import X from '@lucide/svelte/icons/x';
	import { t } from '$lib/i18n/t.js';
	import { tCat } from '$lib/i18n/category.js';

	interface Props {
		subjectIds?: string[];
		contentTypeIds?: string[];
		mediaTypeIds?: string[];
		regionIds?: string[];
		languageIds?: string[];
		onchange?: (filters: { subjectIds: string[]; contentTypeIds: string[]; mediaTypeIds: string[]; regionIds: string[]; languageIds: string[] }) => void;
	}

	let { subjectIds = [], contentTypeIds = [], mediaTypeIds = [], regionIds = [], languageIds = [], onchange }: Props = $props();

	let subjectCategories: Category[] = $state([]);
	let contentTypeCategories: Category[] = $state([]);
	let mediaTypeCategories: Category[] = $state([]);
	let regionCategories: Category[] = $state([]);
	let languageCategories: Category[] = $state([]);
	let showPanel = $state(false);

	const categoryRepo = createCategoryStore();

	onMount(async () => {
		const [subjects, contentTypes, mediaTypes, regions, languages] = await Promise.all([
			categoryRepo.getSublevels('subject'),
			categoryRepo.getSublevels('content_type'),
			categoryRepo.getSublevels('media_type'),
			categoryRepo.getSublevels('region'),
			categoryRepo.getSublevels('language')
		]);
		subjectCategories = subjects.sort((a, b) => a.order - b.order);
		contentTypeCategories = contentTypes.sort((a, b) => a.order - b.order);
		mediaTypeCategories = mediaTypes.sort((a, b) => a.order - b.order);
		regionCategories = regions.sort((a, b) => a.order - b.order);
		languageCategories = languages.sort((a, b) => a.order - b.order);
	});

	function toggleCategory(treeId: CategoryTreeId, catId: string) {
		let newSubjects = [...subjectIds];
		let newContentTypes = [...contentTypeIds];
		let newMediaTypes = [...mediaTypeIds];
		let newRegions = [...regionIds];
		let newLanguages = [...languageIds];

		if (treeId === 'subject') {
			if (newSubjects.includes(catId)) {
				newSubjects = newSubjects.filter((id) => id !== catId);
			} else {
				newSubjects = [...newSubjects, catId];
			}
		} else if (treeId === 'content_type') {
			if (newContentTypes.includes(catId)) {
				newContentTypes = newContentTypes.filter((id) => id !== catId);
			} else {
				newContentTypes = [...newContentTypes, catId];
			}
		} else if (treeId === 'media_type') {
			if (newMediaTypes.includes(catId)) {
				newMediaTypes = newMediaTypes.filter((id) => id !== catId);
			} else {
				newMediaTypes = [...newMediaTypes, catId];
			}
		} else if (treeId === 'region') {
			if (newRegions.includes(catId)) {
				newRegions = newRegions.filter((id) => id !== catId);
			} else {
				newRegions = [...newRegions, catId];
			}
		} else {
			if (newLanguages.includes(catId)) {
				newLanguages = newLanguages.filter((id) => id !== catId);
			} else {
				newLanguages = [...newLanguages, catId];
			}
		}

		onchange?.({ subjectIds: newSubjects, contentTypeIds: newContentTypes, mediaTypeIds: newMediaTypes, regionIds: newRegions, languageIds: newLanguages });
	}

	function clearAll() {
		onchange?.({ subjectIds: [], contentTypeIds: [], mediaTypeIds: [], regionIds: [], languageIds: [] });
	}

	let activeCount = $derived(subjectIds.length + contentTypeIds.length + mediaTypeIds.length + regionIds.length + languageIds.length);
</script>

<div class="relative">
	<button
		onclick={() => (showPanel = !showPanel)}
		class="inline-flex items-center gap-1.5 rounded-md border border-input bg-background px-3 py-1.5 text-xs font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
		class:text-primary={activeCount > 0}
	>
		<Filter class="size-3.5" />
		{t('category_filter.categories')}
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
				<span class="text-sm font-semibold">{t('feed.filter_by_category')}</span>
				{#if activeCount > 0}
					<button onclick={clearAll} class="text-xs text-muted-foreground hover:text-foreground">
						{t('category_filter.clear')}
					</button>
				{/if}
			</div>

			<!-- Subject categories -->
			{#if subjectCategories.length > 0}
				<div class="mb-3">
					<p class="text-xs font-medium text-muted-foreground mb-1.5">{t('category_tree.subject')}</p>
					<div class="flex flex-wrap gap-1.5">
						{#each subjectCategories as cat (cat.id)}
							<button
								onclick={() => toggleCategory('subject', cat.id)}
								class="rounded-full border px-2.5 py-0.5 text-xs transition-colors
									{subjectIds.includes(cat.id)
									? 'border-primary bg-primary text-primary-foreground'
									: 'border-input bg-background hover:bg-accent'}"
							>
								{tCat(cat.id)}
							</button>
						{/each}
					</div>
				</div>
			{/if}

			<!-- Content type categories -->
			{#if contentTypeCategories.length > 0}
				<div class="mb-3">
					<p class="text-xs font-medium text-muted-foreground mb-1.5">{t('category_tree.content_type')}</p>
					<div class="flex flex-wrap gap-1.5">
						{#each contentTypeCategories as cat (cat.id)}
							<button
								onclick={() => toggleCategory('content_type', cat.id)}
								class="rounded-full border px-2.5 py-0.5 text-xs transition-colors
									{contentTypeIds.includes(cat.id)
									? 'border-primary bg-primary text-primary-foreground'
									: 'border-input bg-background hover:bg-accent'}"
							>
								{tCat(cat.id)}
							</button>
						{/each}
					</div>
				</div>
			{/if}

			<!-- Media type categories -->
			{#if mediaTypeCategories.length > 0}
				<div class="mb-3">
					<p class="text-xs font-medium text-muted-foreground mb-1.5">{t('category_tree.media_type')}</p>
					<div class="flex flex-wrap gap-1.5">
						{#each mediaTypeCategories as cat (cat.id)}
							<button
								onclick={() => toggleCategory('media_type', cat.id)}
								class="rounded-full border px-2.5 py-0.5 text-xs transition-colors
									{mediaTypeIds.includes(cat.id)
									? 'border-primary bg-primary text-primary-foreground'
									: 'border-input bg-background hover:bg-accent'}"
							>
								{tCat(cat.id)}
							</button>
						{/each}
					</div>
				</div>
			{/if}

			<!-- Region categories -->
			{#if regionCategories.length > 0}
				<div class="mb-3">
					<p class="text-xs font-medium text-muted-foreground mb-1.5">{t('category_tree.region')}</p>
					<div class="flex flex-wrap gap-1.5">
						{#each regionCategories as cat (cat.id)}
							<button
								onclick={() => toggleCategory('region', cat.id)}
								class="rounded-full border px-2.5 py-0.5 text-xs transition-colors
									{regionIds.includes(cat.id)
									? 'border-primary bg-primary text-primary-foreground'
									: 'border-input bg-background hover:bg-accent'}"
							>
								{tCat(cat.id)}
							</button>
						{/each}
					</div>
				</div>
			{/if}

			<!-- Language categories -->
			{#if languageCategories.length > 0}
				<div>
					<p class="text-xs font-medium text-muted-foreground mb-1.5">{t('category_tree.language')}</p>
					<div class="flex flex-wrap gap-1.5">
						{#each languageCategories as cat (cat.id)}
							<button
								onclick={() => toggleCategory('language', cat.id)}
								class="rounded-full border px-2.5 py-0.5 text-xs transition-colors
									{languageIds.includes(cat.id)
									? 'border-primary bg-primary text-primary-foreground'
									: 'border-input bg-background hover:bg-accent'}"
							>
								{tCat(cat.id)}
							</button>
						{/each}
					</div>
				</div>
			{/if}
		</div>
	{/if}
</div>
