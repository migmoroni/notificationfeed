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
	import ConfirmDialog from '$lib/components/shared/dialog/ConfirmDialog.svelte';
	import type { PriorityFilterValue } from '$lib/components/feed/index.js';
	import { formatRelativeDate } from '$lib/utils/date.js';
	import RefreshCw from '@lucide/svelte/icons/refresh-cw';
	import X from '@lucide/svelte/icons/x';
	import Plus from '@lucide/svelte/icons/plus';
	import Check from '@lucide/svelte/icons/check';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import Pencil from '@lucide/svelte/icons/pencil';

	let filter: PriorityFilterValue = $state('all');
	let refreshing = $state(false);

	let hasAdvancedFilters = $derived(
		feedEntityFilter.hasFilters ||
		feedCategories.getSelectedIds('subject').length > 0 ||
		feedCategories.getSelectedIds('content_type').length > 0 ||
		feedCategories.getSelectedIds('region').length > 0
	);

	// Tab: 'saved' or 'advanced'. Default to 'advanced' if filters are already active on mount.
	let activeTab: 'saved' | 'advanced' = $state(hasAdvancedFilters ? 'advanced' : 'saved');

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
	let selectedRegions = $derived(feedCategories.getSelectedIds('region'));
	let allowedNodeIds = $derived(feedEntityFilter.hasFilters ? [...feedEntityFilter.getAllowedFontNodeIds()] : []);

	onMount(async () => {
		feedCategories.loadCategories();
		feedEntityFilter.loadNodes();
		await feedMacros.init();
		sidebarSlot.set(sidebarContent);
	});

	onDestroy(() => {
		sidebarSlot.set(null);
	});

	$effect(() => {
		// Track filter changes to clear active macro if needed (skip while editing)
		selectedSubjects;
		selectedContentTypes;
		selectedRegions;
		feedEntityFilter.selectedCreatorIds;
		feedEntityFilter.selectedProfileIds;
		feedEntityFilter.selectedFontIds;
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
				Filtros Salvos
			</button>
			<button
				onclick={() => activeTab = 'advanced'}
				class="flex-1 px-3 py-2 text-sm font-medium transition-colors text-center
					{activeTab === 'advanced'
					? 'border-b-2 border-primary text-foreground'
					: 'text-muted-foreground hover:text-foreground'}"
			>
				Filtros Avançados
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
						Salvar
					</button>
					<button
						onclick={cancelEdit}
						class="flex-1 flex items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium text-muted-foreground hover:bg-accent transition-colors border border-border"
					>
						Cancelar
					</button>
				</div>
			{:else if isEditing}
				<div class="flex items-center gap-1.5">
					<span class="flex-1 text-xs text-muted-foreground px-1">Editando filtros...</span>
					<button
						onclick={cancelEdit}
						class="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium text-muted-foreground hover:bg-accent transition-colors border border-border"
					>
						Cancelar
					</button>
				</div>
			{:else if activeMacro}
				<div class="flex items-center gap-1.5">
					<button
						onclick={startEditing}
						class="flex-1 flex items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium text-foreground hover:bg-accent transition-colors border border-border"
					>
						<Pencil class="size-3.5" />
						Editar
					</button>
					<button
						onclick={requestDelete}
						class="flex-1 flex items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/10 transition-colors border border-destructive/30"
					>
						<Trash2 class="size-3.5" />
						Excluir
					</button>
				</div>
			{:else if hasAdvancedFilters && !feedMacros.isCurrentStateSaved}
				{#if isSaving}
					<div class="flex items-center gap-1">
						<input
							type="text"
							bind:value={newMacroName}
							placeholder="Nome do feed..."
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
						Salvar filtro atual
					</button>
				{/if}
			{:else}
				<button
					onclick={() => activeTab = 'advanced'}
					class="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors border border-dashed border-border"
				>
					<Plus class="size-3.5" />
					Criar filtro
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
	<title>Notfeed — Feed</title>
</svelte:head>

<div class="mx-auto w-full h-full flex flex-col overflow-hidden pt-4 px-4" class:max-w-8xl={layout.isExpanded} class:max-w-2xl={!layout.isExpanded}>
	<!-- Header -->
	<div class="flex items-center justify-between mb-4 gap-3 pr-24">
		<div class="flex items-center gap-3 min-w-0">
			<h1 class="text-xl font-bold shrink-0">Feed</h1>
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
			aria-label="Atualizar feed"
		>
			<RefreshCw class="size-4 {refreshing ? 'animate-spin' : ''}" />
		</button>
	</div>

	<!-- Priority filter + active category badges -->
	<div class="flex items-center gap-3 mb-4 flex-wrap">
		<PriorityFilter value={filter} onchange={(v) => (filter = v)} />

		{#if feedCategories.getSelectedCount('subject') > 0 || feedCategories.getSelectedCount('content_type') > 0 || feedCategories.getSelectedCount('region') > 0}
			{#each selectedSubjects as catId (catId)}
				{@const cat = feedCategories.categories.find((c) => c.id === catId)}
				{#if cat}
					<button
						onclick={() => feedCategories.toggleCategory(catId, 'subject')}
						class="inline-flex items-center gap-1 rounded-full bg-accent px-2.5 py-0.5 text-xs font-medium text-accent-foreground hover:bg-accent/80 transition-colors"
					>
						{cat.label}
						<X class="size-3" />
					</button>
				{/if}
			{/each}
			{#each selectedContentTypes as catId (catId)}
				{@const cat = feedCategories.categories.find((c) => c.id === catId)}
				{#if cat}
					<button
						onclick={() => feedCategories.toggleCategory(catId, 'content_type')}
						class="inline-flex items-center gap-1 rounded-full bg-accent px-2.5 py-0.5 text-xs font-medium text-accent-foreground hover:bg-accent/80 transition-colors"
					>
						{cat.label}
						<X class="size-3" />
					</button>
				{/if}
			{/each}
			{#each selectedRegions as catId (catId)}
				{@const cat = feedCategories.categories.find((c) => c.id === catId)}
				{#if cat}
					<button
						onclick={() => feedCategories.toggleCategory(catId, 'region')}
						class="inline-flex items-center gap-1 rounded-full bg-accent px-2.5 py-0.5 text-xs font-medium text-accent-foreground hover:bg-accent/80 transition-colors"
					>
						{cat.label}
						<X class="size-3" />
					</button>
				{/if}
			{/each}
			<button
				onclick={() => feedCategories.clearAll()}
				class="text-xs text-muted-foreground hover:text-foreground transition-colors underline"
			>
				Limpar todos
			</button>
		{/if}
	</div>

	<div class="flex-1 min-h-0 overflow-hidden">
		<!-- Feed list -->
		<div class="overflow-y-auto h-full pr-24 pb-24 pt-4">
			<FeedList {filter} subjectIds={selectedSubjects} contentTypeIds={selectedContentTypes} regionIds={selectedRegions} nodeIds={allowedNodeIds} />
		</div>
	</div>
</div>

<ConfirmDialog
	bind:open={showDeleteConfirm}
	title="Excluir filtro salvo"
	description={deletingMacroName ? `Excluir "${deletingMacroName}"? Esta ação não pode ser desfeita.` : 'Excluir este filtro salvo?'}
	confirmLabel="Excluir"
	cancelLabel="Cancelar"
	onconfirm={confirmDelete}
	oncancel={() => { showDeleteConfirm = false; deletingMacroId = null; }}
>
	{#snippet icon()}
		<div class="flex items-center justify-center size-12 rounded-full bg-destructive/10">
			<Trash2 class="size-6 text-destructive" />
		</div>
	{/snippet}
</ConfirmDialog>
