<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { feed } from '$lib/stores/feed.svelte.js';
	import { feedCategories } from '$lib/stores/feed-categories.svelte.js';
	import { feedEntityFilter } from '$lib/stores/feed-entity-filter.svelte.js';
	import { feedMacros } from '$lib/stores/feed-macros.svelte.js';
	import { layout } from '$lib/stores/layout.svelte.js';
	import { sidebarSlot } from '$lib/stores/sidebar-slot.svelte.js';
	import FeedList from '$lib/components/feed/FeedList.svelte';
	import { PriorityFilter } from '$lib/components/feed/index.js';
	import FeedMacros from '$lib/components/feed/FeedMacros.svelte';
	import FilterSidebar from '$lib/components/shared/FilterSidebar.svelte';
	import ActiveCategoryBadges from '$lib/components/shared/ActiveCategoryBadges.svelte';
	import ConfirmDialog from '$lib/components/shared/dialog/ConfirmDialog.svelte';
	import type { PriorityFilterValue } from '$lib/components/feed/index.js';
	import { formatRelativeDate } from '$lib/utils/date.js';
	import RefreshCw from '@lucide/svelte/icons/refresh-cw';
	import X from '@lucide/svelte/icons/x';
	import Plus from '@lucide/svelte/icons/plus';
	import Check from '@lucide/svelte/icons/check';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import Pencil from '@lucide/svelte/icons/pencil';
	import { t } from '$lib/i18n/t.js';

	let filter: PriorityFilterValue = $state('all');
	let refreshing = $state(false);

	let hasAdvancedFilters = $derived(
		feedEntityFilter.hasFilters ||
		feedCategories.getSelectedIds('subject').length > 0 ||
		feedCategories.getSelectedIds('content_type').length > 0 ||
		feedCategories.getSelectedIds('media_type').length > 0 ||
		feedCategories.getSelectedIds('region').length > 0 ||
		feedCategories.getSelectedIds('language').length > 0
	);

	// Tab: 'saved' or 'advanced'. Default to 'advanced' only if filters are active without a macro.
	let activeTab: 'saved' | 'advanced' = $state(
		hasAdvancedFilters && !feedMacros.activeMacroId ? 'advanced' : 'saved'
	);

	// Save new macro UI
	let isSaving = $state(false);
	let newMacroName = $state('');

	// Edit macro UI
	let isEditing = $state(false);
	let editingMacroId = $state<string | null>(null);
	let hasEditChanges = $derived(
		editingMacroId !== null && !feedMacros.isCurrentStateSaved
	);

	// Delete macro confirm
	let showDeleteConfirm = $state(false);
	let deletingMacroId = $state<string | null>(null);
	let deletingMacroName = $derived(
		deletingMacroId ? (feedMacros.macros.find((m) => m.id === deletingMacroId)?.name ?? '') : ''
	);

	// Which macro is currently active (for the action bar)
	let activeMacro = $derived(
		feedMacros.activeMacroId
			? feedMacros.macros.find((m) => m.id === feedMacros.activeMacroId) ?? null
			: null
	);

	async function handleSaveMacro() {
		if (newMacroName.trim()) {
			await feedMacros.saveCurrentAsMacro(newMacroName.trim());
			newMacroName = '';
			isSaving = false;
		}
	}

	function startEditing() {
		if (!feedMacros.activeMacroId) return;
		editingMacroId = feedMacros.activeMacroId;
		isEditing = true;
		activeTab = 'advanced';
	}

	async function saveEdit() {
		if (!editingMacroId) return;
		await feedMacros.updateMacro(editingMacroId);
		isEditing = false;
		editingMacroId = null;
		activeTab = 'saved';
	}

	function cancelEdit() {
		if (editingMacroId) {
			feedMacros.applyMacro(editingMacroId);
		}
		isEditing = false;
		editingMacroId = null;
		activeTab = 'saved';
	}

	function requestDelete() {
		deletingMacroId = feedMacros.activeMacroId;
		showDeleteConfirm = true;
	}

	async function confirmDelete() {
		if (deletingMacroId) {
			await feedMacros.deleteMacro(deletingMacroId);
		}
		showDeleteConfirm = false;
		deletingMacroId = null;
		isEditing = false;
		editingMacroId = null;
	}

	let selectedSubjects = $derived(feedCategories.getSelectedIds('subject'));
	let selectedContentTypes = $derived(feedCategories.getSelectedIds('content_type'));
	let selectedMediaTypes = $derived(feedCategories.getSelectedIds('media_type'));
	let selectedRegions = $derived(feedCategories.getSelectedIds('region'));
	let selectedLanguages = $derived(feedCategories.getSelectedIds('language'));

	// Build anyIds / allIds for the FeedList filter
	let anyIds = $derived({
		subject: feedCategories.getAnyIds('subject'),
		content_type: feedCategories.getAnyIds('content_type'),
		media_type: feedCategories.getAnyIds('media_type'),
		region: feedCategories.getAnyIds('region'),
		language: feedCategories.getAnyIds('language')
	});
	let allIds = $derived({
		subject: feedCategories.getAllIds('subject'),
		content_type: feedCategories.getAllIds('content_type'),
		media_type: feedCategories.getAllIds('media_type'),
		region: feedCategories.getAllIds('region'),
		language: feedCategories.getAllIds('language')
	});

	let allowedNodeIds = $derived(feedEntityFilter.hasFilters ? [...feedEntityFilter.getAllowedFontNodeIds()] : []);

	onMount(async () => {
		await feed.loadFeed();
		feedCategories.loadCategories();
		feedEntityFilter.loadNodes();
		sidebarSlot.set(sidebarContent);
	});

	onDestroy(() => {
		sidebarSlot.set(null);
	});

	$effect(() => {
		// Track filter changes to clear active macro if needed (skip while editing)
		selectedSubjects;
		selectedContentTypes;
		selectedMediaTypes;
		selectedRegions;
		selectedLanguages;
		anyIds;
		allIds;
		feedEntityFilter.selectedCreatorIds;
		feedEntityFilter.selectedProfileIds;
		feedEntityFilter.selectedFontIds;
		feedEntityFilter.libraryTabFilter;
		if (!isEditing) {
			feedMacros.clearActiveMacroIfChanged();
		}
	});

	async function handleRefresh() {
		refreshing = true;
		try {
			await feed.refreshFeed();
		} finally {
			refreshing = false;
		}
	}
</script>

{#snippet sidebarContent()}
	<div class="flex flex-col h-full min-h-0 overflow-hidden">
		<!-- Tab headers -->
		<div class="flex border-b border-border shrink-0">
			<button
				onclick={() => activeTab = 'saved'}
				class="flex-1 px-3 py-2 text-sm font-medium transition-colors text-center
					{activeTab === 'saved'
					? 'border-b-2 border-primary text-foreground'
					: 'text-muted-foreground hover:text-foreground'}"
			>
				{t('feed.filters_saved')}
			</button>
			<button
				onclick={() => activeTab = 'advanced'}
				class="flex-1 px-3 py-2 text-sm font-medium transition-colors text-center
					{activeTab === 'advanced'
					? 'border-b-2 border-primary text-foreground'
					: 'text-muted-foreground hover:text-foreground'}"
			>
				{t('feed.filters_advanced')}
			</button>
		</div>

		<!-- Action bar -->
		<div class="shrink-0 px-2 py-2">
			{#if isEditing && hasEditChanges}
				<div class="flex items-center gap-1.5">
					<button
						onclick={saveEdit}
						class="flex-1 flex items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium text-primary-foreground bg-primary hover:bg-primary/90 transition-colors"
					>
						<Check class="size-3.5" />
						{t('btn.save')}
					</button>
					<button
						onclick={cancelEdit}
						class="flex-1 flex items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium text-muted-foreground hover:bg-accent transition-colors border border-border"
					>
						{t('btn.cancel')}
					</button>
				</div>
			{:else if isEditing}
				<div class="flex items-center gap-1.5">
					<span class="flex-1 text-xs text-muted-foreground px-1">{t('feed.editing_filters')}</span>
					<button
						onclick={cancelEdit}
						class="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium text-muted-foreground hover:bg-accent transition-colors border border-border"
					>
						{t('btn.cancel')}
					</button>
				</div>
			{:else if activeMacro}
				<div class="flex items-center gap-1.5">
					<button
						onclick={startEditing}
						class="flex-1 flex items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium text-foreground hover:bg-accent transition-colors border border-border"
					>
						<Pencil class="size-3.5" />
						{t('btn.edit')}
					</button>
					<button
						onclick={requestDelete}
						class="flex-1 flex items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/10 transition-colors border border-destructive/30"
					>
						<Trash2 class="size-3.5" />
						{t('btn.delete')}
					</button>
				</div>
			{:else if hasAdvancedFilters && !feedMacros.isCurrentStateSaved}
				{#if isSaving}
					<div class="flex items-center gap-1">
						<input
							type="text"
							bind:value={newMacroName}
							placeholder={t('feed.macro_name_placeholder')}
							class="flex-1 h-7 rounded-md border border-input bg-background px-2 py-1 text-xs shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
							onkeydown={(e) => e.key === 'Enter' && handleSaveMacro()}
							autofocus
						/>
						<button
							onclick={handleSaveMacro}
							disabled={!newMacroName.trim()}
							class="p-1.5 text-primary hover:bg-accent rounded-md disabled:opacity-50"
						>
							<Check class="size-3.5" />
						</button>
						<button
							onclick={() => { isSaving = false; newMacroName = ''; }}
							class="p-1.5 text-muted-foreground hover:bg-accent rounded-md"
						>
							<X class="size-3.5" />
						</button>
					</div>
				{:else}
					<button
						onclick={() => isSaving = true}
						class="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs font-medium text-primary hover:bg-primary/10 transition-colors border border-dashed border-primary/30"
					>
						<Plus class="size-3.5" />
					{t('feed.save_current_filter')}
					</button>
				{/if}
			{:else}
				<button
					onclick={() => activeTab = 'advanced'}
					class="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors border border-dashed border-border"
				>
					<Plus class="size-3.5" />
					{t('feed.create_filter')}
				</button>
			{/if}
		</div>

		<!-- Tab content (scrollable) -->
		<div class="flex-1 min-h-0 overflow-hidden px-1 py-2">
			{#if activeTab === 'saved'}
				<FeedMacros />
			{:else}
				<FilterSidebar entityStore={feedEntityFilter} categoryStore={feedCategories} />
			{/if}
		</div>
	</div>
{/snippet}

<svelte:head>
	<title>{t('page_title.feed')}</title>
</svelte:head>

<div class="mx-auto w-full h-full flex flex-col overflow-hidden pt-4 px-4" class:max-w-8xl={layout.isExpanded} class:max-w-2xl={!layout.isExpanded}>
	<!-- Header -->
	<div class="flex items-center justify-between mb-4 gap-3 pr-24">
		<div class="flex items-center gap-3 min-w-0">
			<h1 class="text-xl font-bold shrink-0">{t('title.feed')}</h1>
			{#if feed.lastRefresh}
				<span class="text-xs text-muted-foreground truncate hidden sm:inline">
					{formatRelativeDate(feed.lastRefresh)}
				</span>
			{/if}
		</div>
		<button
			onclick={handleRefresh}
			disabled={refreshing}
			class="inline-flex items-center justify-center size-8 rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors disabled:opacity-50"
			aria-label={t('aria.update_feed')}
		>
			<RefreshCw class="size-4 {refreshing ? 'animate-spin' : ''}" />
		</button>
	</div>

	<!-- Priority filter + active category badges -->
	<div class="flex items-center gap-3 mb-4 flex-wrap">
		<PriorityFilter value={filter} onchange={(v) => (filter = v)} />
		<ActiveCategoryBadges store={feedCategories} />
	</div>

	<div class="flex-1 min-h-0 overflow-hidden">
		<!-- Feed list -->
		<div class="overflow-y-auto h-full pr-24 pb-24 pt-4">
			<FeedList {filter} {anyIds} {allIds} nodeIds={allowedNodeIds} />
		</div>
	</div>
</div>

<ConfirmDialog
	bind:open={showDeleteConfirm}
	title={t('feed.delete_saved_filter')}
	description={deletingMacroName ? t('feed.delete_macro_description_named', { name: deletingMacroName }) : t('feed.delete_macro_description')}
	confirmLabel={t('btn.delete')}
	onconfirm={confirmDelete}
	oncancel={() => { showDeleteConfirm = false; deletingMacroId = null; }}
>
	{#snippet icon()}
		<div class="flex items-center justify-center size-12 rounded-full bg-destructive/10">
			<Trash2 class="size-6 text-destructive" />
		</div>
	{/snippet}
</ConfirmDialog>
