<script lang="ts">
	import { feedMacros, ALL_MACROS_ID } from '$lib/stores/feed-macros.svelte.js';
	import { feedEntityFilter } from '$lib/stores/feed-entity-filter.svelte.js';
	import { feedCategories } from '$lib/stores/feed-categories.svelte.js';
	import Bookmark from '@lucide/svelte/icons/bookmark';
	import Layers from '@lucide/svelte/icons/layers';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import { t } from '$lib/i18n/t.js';

	let hasAnyFilter = $derived(
		feedEntityFilter.hasFilters ||
		feedCategories.getSelectedCount('subject') > 0 ||
		feedCategories.getSelectedCount('content_type') > 0 ||
		feedCategories.getSelectedCount('region') > 0
	);
</script>

<div class="flex flex-col gap-2">
	<div class="flex flex-col gap-1">
		<!-- Default "All" macro -->
		<button
			onclick={() => feedMacros.applyMacro(null)}
			class="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors text-left
				{feedMacros.activeMacroId === null && !hasAnyFilter
				? 'bg-primary text-primary-foreground font-medium'
				: 'text-muted-foreground hover:bg-accent hover:text-foreground'}"
		>
			<Bookmark class="size-3.5 shrink-0" />
			<span class="truncate">{t('feed.all')}</span>
		</button>

		<!-- "All my macros combined" — visible when 2+ saved macros -->
		{#if feedMacros.macros.length >= 2}
			<button
				onclick={() => feedMacros.applyMacro(ALL_MACROS_ID)}
				class="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors text-left
					{feedMacros.activeMacroId === ALL_MACROS_ID
					? 'bg-primary text-primary-foreground font-medium'
					: 'text-muted-foreground hover:bg-accent hover:text-foreground'}"
			>
				<Layers class="size-3.5 shrink-0" />
				<span class="truncate">{t('feed.all_my_filters')}</span>
			</button>
		{/if}

		<!-- Saved macros -->
		{#each feedMacros.macros as macro (macro.id)}
			<div class="group flex items-center gap-1">
				<button
					onclick={() => feedMacros.applyMacro(macro.id)}
					class="flex-1 flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors text-left
						{feedMacros.activeMacroId === macro.id
						? 'bg-primary text-primary-foreground font-medium'
						: 'text-muted-foreground hover:bg-accent hover:text-foreground'}"
				>
					<Bookmark class="size-3.5 shrink-0" />
					<span class="truncate">{macro.name}</span>
				</button>
				<button
					onclick={() => feedMacros.deleteMacro(macro.id)}
					class="p-1.5 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity rounded-md hover:bg-accent"
					aria-label={t('feed.delete_feed')}
				>
					<Trash2 class="size-3.5" />
				</button>
			</div>
		{/each}
	</div>
</div>
