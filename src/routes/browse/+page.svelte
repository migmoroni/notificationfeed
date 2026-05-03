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
import PageHeader from '$lib/components/shared/PageHeader.svelte';
	import ActiveCategoryBadges from '$lib/components/shared/ActiveCategoryBadges.svelte';
	import ActiveLibraryTabBadges from '$lib/components/shared/ActiveLibraryTabBadges.svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import Upload from '@lucide/svelte/icons/upload';
	import { t } from '$lib/i18n/t.js';

	let allowedFontNodeIds = $derived(
		browseEntityFilter.hasFilters ? [...browseEntityFilter.getAllowedFontNodeIds()] : []
	);

	// Browse is in "Library Search" mode when any library-tab or node filter is active;
	// otherwise it's in "Global Search" mode (will include external sources in the future).
	let isLibrarySearch = $derived(
		browseEntityFilter.libraryTabFilter.size > 0 ||
			browseEntityFilter.selectedPageIds.size > 0 ||
			browseEntityFilter.selectedFontIds.size > 0
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
		const selectedCollections = new Set(browseEntityFilter.selectedCollectionIds);
		const selectedProfiles = new Set(browseEntityFilter.selectedProfileIds);
		const selectedFonts = new Set(browseEntityFilter.selectedFontIds);
		const hasExplicitSelection =
			selectedCollections.size > 0 || selectedProfiles.size > 0 || selectedFonts.size > 0;
		const pageTypes = browseEntityFilter.pageTypeFilter;
		// Library-tab-only filter: show every activated node matching the tab,
		// narrowed to the roles selected in the page-type segmented row.
		if (!hasExplicitSelection) {
			return browse.nodes.filter((n) => {
				if (n.role === 'tree') return false;
				if (!pageTypes.has(n.role as 'font' | 'profile' | 'collection')) return false;
				return browseEntityFilter.matchesLibraryTabFilter(n.metadata.id);
			});
		}
		const fontSet = new Set(allowedFontNodeIds);
		return browse.nodes.filter((n) => {
			switch (n.role) {
				case 'font': return fontSet.has(n.metadata.id);
				case 'profile': return selectedProfiles.has(n.metadata.id);
				case 'collection': return selectedCollections.has(n.metadata.id);
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
	<PageHeader title={t('title.browse')}>
		{#snippet actions()}
			<Button variant="outline" size="sm" onclick={() => goto('/browse/import')}>
				<Upload class="mr-1.5 size-4" />
				{t('btn.import')}
			</Button>
		{/snippet}

		{#snippet bottomRow()}
			<div class="w-full flex flex-col gap-3">
				<SearchBar />
				<!-- Active filter badges -->
				<div class="min-h-7 flex items-center gap-3">
					<span
						class="shrink-0 text-xs font-medium uppercase tracking-wide
								{isLibrarySearch ? 'text-primary' : 'text-muted-foreground'}"
					>
						{isLibrarySearch ? t('browse.library_search') : t('browse.global_search')}
					</span>
					<div class="flex-1 min-w-0 flex items-center gap-1.5 overflow-x-auto whitespace-nowrap">
						<ActiveLibraryTabBadges store={browseEntityFilter} />
						<ActiveCategoryBadges store={browseCategories} />
					</div>
				</div>
			</div>
		{/snippet}
	</PageHeader>

	<div class="grid gap-12 flex-1 min-h-0 overflow-hidden {layout.isExpanded ? '' : 'md:grid-cols-[265px_1fr]'}">
		{#if !layout.isExpanded}
		<aside class="overflow-hidden h-full relative">
			<FilterSidebar entityStore={browseEntityFilter} categoryStore={browseCategories} />
		</aside>
		{/if}

		<!-- Main: results -->
		<div class="overflow-y-auto">
			<EntityList nodes={filteredNodes} loading={browse.loading} />
		</div>
	</div>
</div>
