<!--
  ActiveCategoryBadges — displays mode-aware badge pills for active category filters.

  Shared between Feed and Browse pages. Renders one pill per selected category,
  styled by filter mode ('any' = accent ring, 'all' = primary bg).
  Clicking the label toggles between any/all; the X button deselects.
  A "Clear all" link resets all trees.
-->
<script lang="ts">
	import type { CategoryFilterInstance } from '$lib/stores/category-filter.svelte.js';
	import type { CategoryTreeId } from '$lib/domain/category/category.js';
	import { t } from '$lib/i18n/t.js';
	import { tCat } from '$lib/i18n/category.js';
	import X from '@lucide/svelte/icons/x';

	interface Props {
		store: CategoryFilterInstance;
	}

	let { store }: Props = $props();

	const TREES: { treeId: CategoryTreeId }[] = [
		{ treeId: 'subject' },
		{ treeId: 'content_type' },
		{ treeId: 'media_type' },
		{ treeId: 'region' },
		{ treeId: 'language' }
	];

	let hasAny = $derived(TREES.some((tr) => store.getSelectedCount(tr.treeId) > 0));
</script>

{#if hasAny}
	{@const allTrees = TREES.map((tr) => ({
		treeId: tr.treeId,
		ids: store.getSelectedIds(tr.treeId)
	}))}
	{#each allTrees as { treeId, ids }}
		{#each ids as catId (catId)}
			{@const cat = store.categories.find((c) => c.id === catId)}
			{@const mode = store.getFilterMode(catId, treeId)}
			{#if cat}
				<span
					class="inline-flex items-center rounded-full text-xs font-medium transition-colors shrink-0
						{mode === 'all'
							? 'bg-primary text-primary-foreground'
							: 'bg-accent text-accent-foreground ring-1 ring-accent-foreground/20'}"
				>
					<button
						onclick={() => store.toggleCategory(catId, treeId)}
						class="pl-2.5 py-0.5 hover:opacity-80 transition-opacity"
						title={mode === 'all' ? t('category_filter.mode_all') : t('category_filter.mode_any')}
					>
						{tCat(cat.id)}
					</button>
					<button
						onclick={() => store.deselectCategory(catId, treeId)}
						class="pl-1 pr-1.5 py-0.5 hover:opacity-60 transition-opacity"
						aria-label={t('btn.remove')}
					>
						<X class="size-3" />
					</button>
				</span>
			{/if}
		{/each}
	{/each}
	<button
		onclick={() => store.clearAll()}
		class="text-xs text-muted-foreground hover:text-foreground transition-colors underline shrink-0"
	>
		{t('btn.clear_all')}
	</button>
{/if}
