<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { goto } from '$app/navigation';
	import { browse } from '$lib/stores/browse.svelte.js';
	import { browseCategories } from '$lib/stores/browse-categories.svelte.js';
	import { browseEntityFilter } from '$lib/stores/browse-entity-filter.svelte.js';
	import { layout } from '$lib/stores/layout.svelte.js';
	import { sidebarSlot } from '$lib/stores/sidebar-slot.svelte.js';
	import EntityList from '$lib/components/shared/entity/EntityList.svelte';
	import { SearchBar } from '$lib/components/browse/index.js';
	import FilterSidebar from '$lib/components/shared/FilterSidebar.svelte';
	import ActiveCategoryBadges from '$lib/components/shared/ActiveCategoryBadges.svelte';
	import ActiveLibraryTabBadges from '$lib/components/shared/ActiveLibraryTabBadges.svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import Upload from '@lucide/svelte/icons/upload';
	import { t } from '$lib/i18n/t.js';

	let allowedFontNodeIds = $derived(
		browseEntityFilter.hasFilters ? [...browseEntityFilter.getAllowedFontNodeIds()] : []
	);

	// Load all nodes when entity filter is active without category filters,
	// or always ensure nodes are loaded for the default view.
	$effect(() => {
		if (browseEntityFilter.hasFilters && !browse.hasFilters) {
			browse.loadAllNodes();
		}
	});

	// Re-apply browse filters when category selection changes
	$effect(() => {
		// Track modeByTree to detect changes
		browseCategories.modeByTree;
		browse.applyFilters();
	});

	// Filter browse nodes by the entity filter when active
	let filteredNodes = $derived.by(() => {
		if (!browseEntityFilter.hasFilters) return browse.nodes;
		const selectedCreators = new Set(browseEntityFilter.selectedCreatorIds);
		const selectedProfiles = new Set(browseEntityFilter.selectedProfileIds);
		const selectedFonts = new Set(browseEntityFilter.selectedFontIds);
		const hasExplicitSelection =
			selectedCreators.size > 0 || selectedProfiles.size > 0 || selectedFonts.size > 0;
		const pageTypes = browseEntityFilter.pageTypeFilter;
		// Library-tab-only filter: show every activated node matching the tab,
		// narrowed to the roles selected in the page-type segmented row.
		if (!hasExplicitSelection) {
			return browse.nodes.filter((n) => {
				if (n.role === 'tree') return false;
				if (!pageTypes.has(n.role as 'font' | 'profile' | 'creator' | 'collection')) return false;
				return browseEntityFilter.matchesLibraryTabFilter(n.metadata.id);
			});
		}
		const fontSet = new Set(allowedFontNodeIds);
		return browse.nodes.filter((n) => {
			switch (n.role) {
				case 'font': return fontSet.has(n.metadata.id);
				case 'profile': return selectedProfiles.has(n.metadata.id);
				case 'creator': return selectedCreators.has(n.metadata.id);
				default: return true;
			}
		});
	});

	onMount(async () => {
		browseCategories.loadCategories();
		await browseEntityFilter.loadNodes();
		if (browse.hasFilters) {
			await browse.applyFilters();
		} else {
			await browse.loadAllNodes();
		}
		sidebarSlot.set(sidebarContent);
	});

	onDestroy(() => {
		sidebarSlot.set(null);
	});
</script>

{#snippet sidebarContent()}
	<div class="h-full overflow-hidden">
		<FilterSidebar entityStore={browseEntityFilter} categoryStore={browseCategories} />
	</div>
{/snippet}

<svelte:head>
	<title>{t('page_title.browse')}</title>
</svelte:head>

<div class="mx-auto w-full h-full flex flex-col overflow-hidden py-4 px-4" class:max-w-8xl={layout.isExpanded} class:max-w-2xl={!layout.isExpanded}>
	<!-- Header -->
	<div class="mb-4 flex items-center justify-between pr-24">
		<h1 class="text-xl font-bold">{t('title.browse')}</h1>
		<Button variant="outline" size="sm" onclick={() => goto('/browse/import')}>
			<Upload class="mr-1.5 size-4" />
			{t('btn.import')}
		</Button>
	</div>

	<!-- Search bar (full width above content) -->
	<div class="mb-4 pr-24">
		<SearchBar />
	</div>

	<!-- Active filter badges (single-line, horizontally scrollable, reserved height) -->
	<div class="mb-3 min-h-[28px] flex items-center gap-1.5 overflow-x-auto whitespace-nowrap pr-24">
		<ActiveLibraryTabBadges store={browseEntityFilter} />
		<ActiveCategoryBadges store={browseCategories} />
	</div>

	<div class="grid gap-12 flex-1 min-h-0 overflow-hidden {layout.isExpanded ? '' : 'md:grid-cols-[265px_1fr]'}">
		{#if !layout.isExpanded}
		<!-- Sidebar only in compact mode (inline) -->
		<aside class="overflow-hidden h-full relative">
			<FilterSidebar entityStore={browseEntityFilter} categoryStore={browseCategories} />
		</aside>
		{/if}

		<!-- Main: results -->
		<div class="overflow-y-auto pr-24">
			<EntityList nodes={filteredNodes} loading={browse.loading} />
		</div>
	</div>
</div>
