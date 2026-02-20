<script lang="ts">
	import { favorites } from '$lib/stores/favorites.svelte.js';
	import { layout } from '$lib/stores/layout.svelte.js';
	import { ALL_FAVORITES_ID } from '$lib/persistence/favorite-tab.store.js';
	import Plus from '@lucide/svelte/icons/plus';
	import Ellipsis from '@lucide/svelte/icons/ellipsis';
	import Pencil from '@lucide/svelte/icons/pencil';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import TabDialog from '$lib/components/shared/TabDialog.svelte';

	let showCreateDialog = $state(false);
	let editingTab = $state<{ id: string; title: string; emoji: string } | null>(null);
	let showDeleteConfirm = $state(false);
	let deletingTabId = $state<string | null>(null);
	let openMenuId = $state<string | null>(null);

	function handleTabClick(tabId: string) {
		favorites.setActiveTab(tabId);
	}

	function handleCreateTab() {
		showCreateDialog = true;
	}

	async function handleCreateConfirm(title: string, emoji: string) {
		await favorites.createTab(title, emoji);
		showCreateDialog = false;
	}

	function handleEditTab(tab: { id: string; title: string; emoji: string }) {
		editingTab = tab;
		openMenuId = null;
	}

	async function handleEditConfirm(title: string, emoji: string) {
		if (editingTab) {
			await favorites.updateTab(editingTab.id, { title, emoji });
			editingTab = null;
		}
	}

	async function handleDeleteTab(tabId: string) {
		openMenuId = null;
		deletingTabId = tabId;
		showDeleteConfirm = true;
	}

	async function confirmDeleteTab() {
		if (deletingTabId) {
			await favorites.deleteTab(deletingTabId);
			deletingTabId = null;
		}
		showDeleteConfirm = false;
	}

	function toggleMenu(tabId: string, e: MouseEvent) {
		e.stopPropagation();
		openMenuId = openMenuId === tabId ? null : tabId;
	}

	function handleCloseMenuOnClickOutside() {
		openMenuId = null;
	}
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
{#if openMenuId}
	<div class="fixed inset-0 z-40" onclick={handleCloseMenuOnClickOutside}></div>
{/if}

<nav
	class="flex gap-1 {layout.isExpanded ? 'flex-col' : 'flex-row overflow-x-auto pb-2'}"
	aria-label="Tabs de favoritos"
>
	<!-- System tab: all_favorites -->
	<button
		onclick={() => handleTabClick(ALL_FAVORITES_ID)}
		class="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium transition-colors shrink-0
			{favorites.activeTabId === ALL_FAVORITES_ID
			? 'bg-accent text-accent-foreground'
			: 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'}"
		aria-current={favorites.activeTabId === ALL_FAVORITES_ID ? 'true' : undefined}
	>
		<span class="text-base">⭐</span>
		{#if layout.isExpanded}
			<span class="truncate">Todos</span>
			<span class="ml-auto text-xs text-muted-foreground">{favorites.count}</span>
		{/if}
	</button>

	<!-- Custom tabs -->
	{#each favorites.customTabs as tab (tab.id)}
		{@const itemCount = favorites.itemsByTab.get(tab.id)?.length ?? 0}
		<div class="relative shrink-0">
			<button
				onclick={() => handleTabClick(tab.id)}
				class="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium transition-colors
					{favorites.activeTabId === tab.id
					? 'bg-accent text-accent-foreground'
					: 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'}"
				aria-current={favorites.activeTabId === tab.id ? 'true' : undefined}
			>
				<span class="text-base">{tab.emoji}</span>
				{#if layout.isExpanded}
					<span class="truncate">{tab.title}</span>
					<span class="ml-auto text-xs text-muted-foreground">{itemCount}</span>
				{/if}
			</button>

			{#if layout.isExpanded}
				<button
					onclick={(e) => toggleMenu(tab.id, e)}
					class="absolute right-0 top-0 flex items-center justify-center size-7 rounded text-muted-foreground hover:text-foreground opacity-0 hover:opacity-100 focus:opacity-100 transition-opacity
						{favorites.activeTabId === tab.id ? 'opacity-100' : ''}"
					aria-label="Opções da tab {tab.title}"
				>
					<Ellipsis class="size-3.5" />
				</button>

				{#if openMenuId === tab.id}
					<div class="absolute right-0 top-8 z-50 w-36 rounded-md border bg-popover p-1 text-popover-foreground shadow-md">
						<button
							onclick={() => handleEditTab({ id: tab.id, title: tab.title, emoji: tab.emoji })}
							class="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
						>
							<Pencil class="size-3.5" />
							Editar
						</button>
						<button
							onclick={() => handleDeleteTab(tab.id)}
							class="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-destructive hover:bg-destructive/10"
						>
							<Trash2 class="size-3.5" />
							Excluir
						</button>
					</div>
				{/if}
			{/if}
		</div>
	{/each}

	<!-- Add tab button -->
	<button
		onclick={handleCreateTab}
		class="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground hover:bg-accent/50 hover:text-foreground transition-colors shrink-0"
		aria-label="Criar nova tab"
	>
		<Plus class="size-4" />
		{#if layout.isExpanded}
			<span>Nova tab</span>
		{/if}
	</button>
</nav>

<!-- Create dialog -->
<TabDialog
	bind:open={showCreateDialog}
	mode="create"
	onconfirm={handleCreateConfirm}
	oncancel={() => (showCreateDialog = false)}
/>

<!-- Edit dialog -->
{#if editingTab}
	<TabDialog
		open={true}
		mode="edit"
		initialTitle={editingTab.title}
		initialEmoji={editingTab.emoji}
		onconfirm={handleEditConfirm}
		oncancel={() => (editingTab = null)}
	/>
{/if}

<!-- Delete tab confirm -->
<TabDialog
	bind:open={showDeleteConfirm}
	mode="delete"
	onconfirm={confirmDeleteTab}
	oncancel={() => { showDeleteConfirm = false; deletingTabId = null; }}
/>
