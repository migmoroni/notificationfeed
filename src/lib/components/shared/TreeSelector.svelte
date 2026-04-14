<script lang="ts">
	import { t } from '$lib/i18n/t.js';
	import { tCat } from '$lib/i18n/category.js';
	import type { CategoryTreeStore } from '$lib/stores/category-tree.types.js';
	import type { Category, CategoryTreeId } from '$lib/domain/category/category.js';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import X from '@lucide/svelte/icons/x';

	interface Props {
		store: CategoryTreeStore;
	}

	let { store }: Props = $props();

	const trees: { id: CategoryTreeId; labelKey: string }[] = [
		{ id: 'subject', labelKey: 'category_tree.subject' },
		{ id: 'content_type', labelKey: 'category_tree.content_type' },
		{ id: 'media_type', labelKey: 'category_tree.media_type' },
		{ id: 'region', labelKey: 'category_tree.region' }
	];

	let openTreeId = $state<CategoryTreeId | null>(null);
	let containerEl: HTMLDivElement;
	let flyoutStyle = $state('');

	function toggleTree(id: CategoryTreeId) {
		if (openTreeId === id) {
			openTreeId = null;
			return;
		}
		openTreeId = id;
		// Compute position from container
		if (containerEl) {
			const rect = containerEl.getBoundingClientRect();
			flyoutStyle = `position:fixed; left:${rect.right + 8}px; bottom:${window.innerHeight - rect.bottom}px;`;
		}
	}

	function handleToggle(categoryId: string, treeId: CategoryTreeId) {
		store.toggleCategory(categoryId, treeId);
	}

	function handleClickOutside(e: MouseEvent) {
		if (openTreeId && containerEl && !containerEl.contains(e.target as Node)) {
			openTreeId = null;
		}
	}
</script>

<svelte:window onclick={handleClickOutside} />

<div class="relative" bind:this={containerEl}>
	<div class="flex flex-col gap-0.5 px-1">
		{#each trees as tr (tr.id)}
			{@const selectedCount = store.getSelectedCount(tr.id)}
			<button
				onclick={(e) => { e.stopPropagation(); toggleTree(tr.id); }}
				class="flex items-center gap-2 w-full rounded-md px-2 py-1.5 text-[13px] font-medium transition-colors text-left
					{openTreeId === tr.id
						? 'bg-accent text-accent-foreground'
						: selectedCount > 0
							? 'text-foreground hover:bg-accent/50'
							: 'text-muted-foreground hover:bg-accent/50'}"
			>
				<ChevronRight class="size-4 shrink-0 transition-transform duration-200 {openTreeId === tr.id ? 'rotate-90' : ''}" />
				<span class="truncate flex-1">{t(tr.labelKey)}</span>
				{#if selectedCount > 0}
					<button
						onclick={(e) => { e.stopPropagation(); store.clearTree(tr.id); }}
						class="inline-flex items-center gap-1 rounded-full bg-accent px-1.5 py-0.5 text-[11px] text-muted-foreground hover:text-foreground hover:bg-destructive/10 transition-colors"
					>
						<X class="size-3" />
						{selectedCount}
					</button>
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
			class="w-[520px] max-h-[70vh] overflow-y-auto rounded-lg border bg-background shadow-lg p-3 z-50"
			style={flyoutStyle}
			onclick={(e) => e.stopPropagation()}
			onkeydown={(e) => { if (e.key === 'Escape') openTreeId = null; }}
		>
			<div class="flex items-center justify-between mb-3 px-1">
				<span class="text-sm font-medium text-foreground">
					{t(trees.find((tr) => tr.id === activeTreeId)?.labelKey ?? '')}
				</span>
				<button onclick={() => (openTreeId = null)} class="text-muted-foreground hover:text-foreground">
					<X class="size-4" />
				</button>
			</div>
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
											{@const gcSelected = store.isSelected(gc.id, activeTreeId)}
											<button
												onclick={() => handleToggle(gc.id, activeTreeId)}
												class="rounded-md px-2.5 py-1.5 text-xs transition-colors text-left truncate
													{gcSelected
														? 'bg-accent text-accent-foreground font-medium'
														: 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'}"
											>
												{tCat(gc.id)}
											</button>
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
										{@const selected = store.isSelected(child.id, activeTreeId)}
										<button
											onclick={() => handleToggle(child.id, activeTreeId)}
											class="rounded-md px-2.5 py-1.5 text-xs transition-colors text-left truncate
												{selected
													? 'bg-accent text-accent-foreground font-medium'
													: 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'}"
										>
											{tCat(child.id)}
										</button>
									{/each}
								</div>
							{/if}
						{/each}
					</div>
				{:else}
					{@const selected = store.isSelected(root.id, activeTreeId)}
					<button
						onclick={() => handleToggle(root.id, activeTreeId)}
						class="flex w-full items-center rounded-md px-2.5 py-1.5 text-xs transition-colors text-left
							{selected
								? 'bg-accent text-accent-foreground font-medium'
								: 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'}"
					>
						<span class="truncate">{tCat(root.id)}</span>
					</button>
				{/if}
			{/each}
			{#if roots.length === 0 && !store.loading}
				<p class="text-xs text-muted-foreground px-1 py-2">{t('entity_filter.no_categories')}</p>
			{/if}
		</div>
	{/if}
</div>
