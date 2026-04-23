<!--
	ActiveLibraryTabBadges — displays badge pills for currently-selected library tabs.

	Shared between Feed and Browse pages. Renders one pill per selected tab
	(system + custom). The X button deselects a single tab; "Clear all" empties
	the filter.
-->
<script lang="ts">
	import type { EntityFilterStore } from '$lib/stores/entity-filter.types.js';
	import { library } from '$lib/stores/library.svelte.js';
	import { t } from '$lib/i18n/t.js';
	import X from '@lucide/svelte/icons/x';

	interface Props {
		store: EntityFilterStore;
	}

	let { store }: Props = $props();

	let selectedTabs = $derived.by(() => {
		const ids = store.libraryTabFilter;
		return library.tabs.filter((tab) => ids.has(tab.id));
	});
</script>

{#if selectedTabs.length > 0}
	{#each selectedTabs as tab (tab.id)}
		<span
			class="inline-flex items-center rounded-full text-xs font-medium bg-accent text-accent-foreground ring-1 ring-accent-foreground/20 transition-colors shrink-0"
		>
			<span class="pl-2.5 py-0.5 inline-flex items-center gap-1">
				<span class="leading-none">{tab.emoji}</span>
				<span>{tab.title}</span>
			</span>
			<button
				onclick={() => store.toggleLibraryTab(tab.id)}
				class="pl-1 pr-1.5 py-0.5 hover:opacity-60 transition-opacity"
				aria-label={t('btn.remove')}
			>
				<X class="size-3" />
			</button>
		</span>
	{/each}
	<button
		onclick={() => store.clearLibraryTabFilter()}
		class="text-xs text-muted-foreground hover:text-foreground transition-colors underline shrink-0"
	>
		{t('btn.clear_all')}
	</button>
{/if}
