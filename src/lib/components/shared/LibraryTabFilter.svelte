<!--
	LibraryTabFilter — narrows visible nodes by library-tab membership.

	UX mirrors TreeSelector: a single row button that opens a flyout panel
	with the list of tabs (system + user custom). Multi-select.
	Empty selection = no restriction.
-->
<script lang="ts">
	import type { EntityFilterStore } from '$lib/stores/entity-filter.types.js';
	import { library } from '$lib/stores/library.svelte.js';
	import { sidebarFlyout } from '$lib/stores/sidebar-flyout.svelte.js';
	import { t } from '$lib/i18n/t.js';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import X from '@lucide/svelte/icons/x';

	interface Props {
		store: EntityFilterStore;
	}

	let { store }: Props = $props();

	const FLYOUT_KEY = 'library-tabs';

	let tabs = $derived(library.tabs);
	let selectedCount = $derived(store.libraryTabFilter.size);

	let open = $derived(sidebarFlyout.activeKey === FLYOUT_KEY);
	let containerEl: HTMLDivElement;
	let flyoutStyle = $state('');

	function togglePanel() {
		if (open) {
			sidebarFlyout.close(FLYOUT_KEY);
			return;
		}
		if (containerEl) {
			const rect = containerEl.getBoundingClientRect();
			flyoutStyle = `position:fixed; left:${rect.right + 8}px; bottom:${window.innerHeight - rect.bottom}px;`;
		}
		sidebarFlyout.open(FLYOUT_KEY);
	}

	function handleClickOutside(e: MouseEvent) {
		if (open && containerEl && !containerEl.contains(e.target as Node)) {
			sidebarFlyout.close(FLYOUT_KEY);
		}
	}
</script>

<svelte:window onclick={handleClickOutside} />

<div class="relative" bind:this={containerEl}>
	<div class="flex flex-col gap-0.5 px-1">
		<div
			class="flex items-center gap-2 w-full rounded-md px-2 py-1.5 text-[13px] font-medium transition-colors text-left
				{open
					? 'bg-accent text-accent-foreground'
					: selectedCount > 0
						? 'text-foreground hover:bg-accent/50'
						: 'text-muted-foreground hover:bg-accent/50'}"
		>
			<button
				type="button"
				onclick={(e) => { e.stopPropagation(); togglePanel(); }}
				class="flex items-center gap-2 flex-1 min-w-0 text-left bg-transparent"
			>
				<ChevronRight class="size-4 shrink-0 transition-transform duration-200 {open ? 'rotate-90' : ''}" />
				<span class="truncate flex-1">{t('library_tab_filter.title')}</span>
			</button>
			{#if selectedCount > 0}
				<button
					type="button"
					onclick={(e) => { e.stopPropagation(); store.clearLibraryTabFilter(); }}
					class="inline-flex items-center gap-1 rounded-full bg-accent px-1.5 py-0.5 text-[11px] text-muted-foreground hover:text-foreground hover:bg-destructive/10 transition-colors"
				>
					<X class="size-3" />
					{selectedCount}
				</button>
			{/if}
		</div>
	</div>

	{#if open}
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div
			class="w-[320px] max-h-[70vh] overflow-y-auto rounded-lg border bg-background shadow-lg p-3 z-50"
			style={flyoutStyle}
			onclick={(e) => e.stopPropagation()}
			onkeydown={(e) => { if (e.key === 'Escape') sidebarFlyout.close(FLYOUT_KEY); }}
		>
			<div class="flex items-center justify-between mb-2 px-1">
				<span class="text-sm font-medium text-foreground">
					{t('library_tab_filter.title')}
				</span>
				<button onclick={() => sidebarFlyout.close(FLYOUT_KEY)} class="text-muted-foreground hover:text-foreground">
					<X class="size-4" />
				</button>
			</div>

			<div class="flex flex-col gap-0.5">
				{#each tabs as tab (tab.id)}
					{@const isActive = store.libraryTabFilter.has(tab.id)}
					<button
						onclick={() => store.toggleLibraryTab(tab.id)}
						class="flex items-center gap-2 rounded-md px-2 py-1.5 text-[13px] transition-colors text-left min-w-0
							{isActive
								? 'bg-accent text-accent-foreground font-medium'
								: 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'}"
					>
						<span class="shrink-0 text-base leading-none">{tab.emoji}</span>
						<span class="truncate">{tab.title}</span>
					</button>
				{/each}
			</div>
		</div>
	{/if}
</div>
