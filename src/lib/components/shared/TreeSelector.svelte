<script lang="ts">
	import { t } from '$lib/i18n/t.js';
	import { tCat } from '$lib/i18n/category.js';
	import type { CategoryTreeStore } from '$lib/stores/category-tree.types.js';
	import type { Category, CategoryTreeId } from '$lib/domain/category/category.js';
	import { sidebarFlyout } from '$lib/stores/sidebar-flyout.svelte.js';
	import X from '@lucide/svelte/icons/x';
	import BookOpen from '@lucide/svelte/icons/book-open';
	import Accessibility from '@lucide/svelte/icons/accessibility';
	import Film from '@lucide/svelte/icons/film';
	import Globe from '@lucide/svelte/icons/globe';
	import Languages from '@lucide/svelte/icons/languages';
	import type { Component } from 'svelte';

	interface Props {
		store: CategoryTreeStore;
	}

	let { store }: Props = $props();

	const trees: { id: CategoryTreeId; labelKey: string; icon: Component }[] = [
		{ id: 'subject', labelKey: 'category_tree.subject', icon: BookOpen },
		{ id: 'content_type', labelKey: 'category_tree.content_type', icon: Accessibility },
		{ id: 'media_type', labelKey: 'category_tree.media_type', icon: Film },
		{ id: 'region', labelKey: 'category_tree.region', icon: Globe },
		{ id: 'language', labelKey: 'category_tree.language', icon: Languages }
	];

	const flyoutKey = (id: CategoryTreeId) => `category-tree:${id}`;

	let openTreeId = $derived.by<CategoryTreeId | null>(() => {
		const key = sidebarFlyout.activeKey;
		if (!key || !key.startsWith('category-tree:')) return null;
		return key.slice('category-tree:'.length) as CategoryTreeId;
	});
	let containerEl: HTMLDivElement;
	let flyoutStyle = $state('');

	function toggleTree(id: CategoryTreeId) {
		if (openTreeId === id) {
			sidebarFlyout.close(flyoutKey(id));
			return;
		}
		// Compute position from container
		if (containerEl) {
			const rect = containerEl.getBoundingClientRect();
			flyoutStyle = `position:fixed; left:${rect.right + 8}px; bottom:${window.innerHeight - rect.bottom}px;`;
		}
		sidebarFlyout.open(flyoutKey(id));
	}

	function handleToggle(categoryId: string, treeId: CategoryTreeId) {
		store.toggleCategory(categoryId, treeId);
	}

	function handleDeselect(e: MouseEvent, categoryId: string, treeId: CategoryTreeId) {
		e.stopPropagation();
		if (store.deselectCategory) {
			store.deselectCategory(categoryId, treeId);
		}
	}

	function handleClickOutside(e: MouseEvent) {
		if (openTreeId && containerEl && !containerEl.contains(e.target as Node)) {
			sidebarFlyout.close(flyoutKey(openTreeId));
		}
	}

	/** CSS classes for a category button based on its filter mode state. */
	function catButtonClass(categoryId: string, treeId: CategoryTreeId): string {
		if (!store.supportsFilterMode || !store.getFilterMode) {
			// No tri-state: simple selected/unselected
			const selected = store.isSelected(categoryId, treeId);
			return selected
				? 'bg-accent text-accent-foreground font-medium'
				: 'text-muted-foreground hover:bg-accent/50 hover:text-foreground';
		}
		const mode = store.getFilterMode(categoryId, treeId);
		if (mode === 'any') {
			return 'bg-accent text-accent-foreground font-medium ring-1 ring-accent-foreground/20';
		}
		if (mode === 'all') {
			return 'bg-primary text-primary-foreground font-medium';
		}
		return 'text-muted-foreground hover:bg-accent/50 hover:text-foreground';
	}
</script>

<svelte:window onclick={handleClickOutside} />

<div class="relative" bind:this={containerEl}>
	<div class="flex items-center gap-1 px-2">
		{#each trees as tr (tr.id)}
			{@const selectedCount = store.getSelectedCount(tr.id)}
			{@const isOpen = openTreeId === tr.id}
			{@const Icon = tr.icon}
			<button
				onclick={(e) => { e.stopPropagation(); toggleTree(tr.id); }}
				class="relative flex-1 flex items-center justify-center rounded-md p-2 transition-colors
					{isOpen
						? 'bg-accent text-accent-foreground'
						: selectedCount > 0
							? 'text-foreground bg-accent/40 hover:bg-accent/60'
							: 'text-muted-foreground hover:bg-accent/40 hover:text-foreground'}"
				title={t(tr.labelKey)}
				aria-label={t(tr.labelKey)}
			>
				<Icon class="size-4" />
				{#if selectedCount > 0}
					<span class="absolute -top-0.5 -right-0.5 inline-flex items-center justify-center min-w-[14px] h-[14px] px-1 rounded-full bg-primary text-primary-foreground text-[9px] font-semibold tabular-nums leading-none">
						{selectedCount}
					</span>
				{/if}
			</button>
		{/each}
	</div>

	<!-- Flyout panel to the right (fixed positioning to escape overflow) -->
	{#if openTreeId}
		{@const roots = store.getRootCategories(openTreeId)}
		{@const activeTreeId = openTreeId}
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div
			class="w-[640px] max-h-[70vh] overflow-y-auto rounded-lg border bg-background shadow-lg p-3 z-50"
			style={flyoutStyle}
			onclick={(e) => e.stopPropagation()}
			onkeydown={(e) => { if (e.key === 'Escape' && openTreeId) sidebarFlyout.close(flyoutKey(openTreeId)); }}
		>
			<div class="flex items-center justify-between mb-2 px-1">
				<span class="text-sm font-medium text-foreground">
					{t(trees.find((tr) => tr.id === activeTreeId)?.labelKey ?? '')}
				</span>
				<button onclick={() => openTreeId && sidebarFlyout.close(flyoutKey(openTreeId))} class="text-muted-foreground hover:text-foreground">
					<X class="size-4" />
				</button>
			</div>
			{#if store.supportsFilterMode}
				<div class="flex items-center gap-3 mb-3 px-1 text-[11px] text-muted-foreground">
					<span class="inline-flex items-center gap-1.5">
						<span class="inline-block size-3 rounded bg-accent ring-1 ring-accent-foreground/20"></span>
						{t('category_filter.mode_any')}
					</span>
					<span class="inline-flex items-center gap-1.5">
						<span class="inline-block size-3 rounded bg-primary"></span>
						{t('category_filter.mode_all')}
					</span>
				</div>
			{/if}
			{#each roots as root (root.id)}
				{@const children = store.getChildren(root.id)}
				{#if children.length > 0}
					<div class="mb-3">
						<span class="px-1 text-xs font-medium text-muted-foreground">{tCat(root.id)}</span>
						{#each children as child (child.id)}
							{@const grandchildren = store.getChildren(child.id)}
							{#if grandchildren.length > 0}
								<!-- Mid-level with grandchildren -->
								<div class="mt-2 mb-1">
									<span class="px-1 text-[11px] font-medium text-muted-foreground/70">{tCat(child.id)}</span>
									<div class="grid grid-cols-3 gap-1 mt-1">
										{#each grandchildren as gc (gc.id)}
											<div class="group relative">
												<button
													onclick={() => handleToggle(gc.id, activeTreeId)}
													class="w-full rounded-md px-2.5 py-1.5 text-xs transition-colors text-left truncate
														{catButtonClass(gc.id, activeTreeId)}"
												>
													{tCat(gc.id)}
												</button>
												{#if store.isSelected(gc.id, activeTreeId)}
													<button
														onclick={(e) => handleDeselect(e, gc.id, activeTreeId)}
														class="absolute right-0.5 top-1/2 -translate-y-1/2 p-0.5 rounded opacity-0 group-hover:opacity-100 hover:bg-background/50 transition-opacity"
													>
														<X class="size-3" />
													</button>
												{/if}
											</div>
										{/each}
									</div>
								</div>
							{/if}
						{/each}
						<!-- Leaf children (no grandchildren) in grid -->
						{#each [children.filter((c) => store.getChildren(c.id).length === 0)] as leafChildren}
							{#if leafChildren.length > 0}
								<div class="grid grid-cols-3 gap-1 mt-1">
									{#each leafChildren as child (child.id)}
										<div class="group relative">
											<button
												onclick={() => handleToggle(child.id, activeTreeId)}
												class="w-full rounded-md px-2.5 py-1.5 text-xs transition-colors text-left truncate
													{catButtonClass(child.id, activeTreeId)}"
											>
												{tCat(child.id)}
											</button>
											{#if store.isSelected(child.id, activeTreeId)}
												<button
													onclick={(e) => handleDeselect(e, child.id, activeTreeId)}
													class="absolute right-0.5 top-1/2 -translate-y-1/2 p-0.5 rounded opacity-0 group-hover:opacity-100 hover:bg-background/50 transition-opacity"
												>
													<X class="size-3" />
												</button>
											{/if}
										</div>
									{/each}
								</div>
							{/if}
						{/each}
					</div>
				{:else}
					<div class="group relative flex w-full items-center">
						<button
							onclick={() => handleToggle(root.id, activeTreeId)}
							class="w-full rounded-md px-2.5 py-1.5 text-xs transition-colors text-left
								{catButtonClass(root.id, activeTreeId)}"
						>
							<span class="truncate">{tCat(root.id)}</span>
						</button>
						{#if store.isSelected(root.id, activeTreeId)}
							<button
								onclick={(e) => handleDeselect(e, root.id, activeTreeId)}
								class="absolute right-0.5 top-1/2 -translate-y-1/2 p-0.5 rounded opacity-0 group-hover:opacity-100 hover:bg-background/50 transition-opacity"
							>
								<X class="size-3" />
							</button>
						{/if}
					</div>
				{/if}
			{/each}
			{#if roots.length === 0 && !store.loading}
				<p class="text-xs text-muted-foreground px-1 py-2">{t('entity_filter.no_categories')}</p>
			{/if}
		</div>
	{/if}
</div>
