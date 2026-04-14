<script lang="ts">
	import type { Category, CategoryTreeId } from '$lib/domain/category/category.js';
	import type { CategoryTreeStore } from '$lib/stores/category-tree.types.js';
	import * as Collapsible from '$lib/components/ui/collapsible/index.js';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import X from '@lucide/svelte/icons/x';
	import { t } from '$lib/i18n/t.js';

	interface Props {
		treeId: CategoryTreeId;
		label: string;
		store: CategoryTreeStore;
	}

	let { treeId, label, store }: Props = $props();

	// Manual overrides: only set when user explicitly toggles a branch.
	// undefined = no override (use auto logic), true/false = manual state.
	let manualOverrides: Record<string, boolean> = $state({});

	let roots = $derived(store.getRootCategories(treeId));
	let selectedCount = $derived(store.getSelectedCount(treeId));

	function isRootOpen(rootId: string, hasSelectedChild: boolean): boolean {
		if (rootId in manualOverrides) return manualOverrides[rootId];
		return hasSelectedChild;
	}

	function toggleRoot(rootId: string, hasSelectedChild: boolean) {
		const currentlyOpen = isRootOpen(rootId, hasSelectedChild);
		manualOverrides[rootId] = !currentlyOpen;
	}

	function handleToggle(categoryId: string) {
		store.toggleCategory(categoryId, treeId);
	}

	function handleClearTree() {
		store.clearTree(treeId);
	}
</script>

<div class="flex flex-col gap-0.5">
	<div class="flex items-center justify-between px-2 mb-1">
		<span class="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{label}</span>
		{#if selectedCount > 0}
			<button
				onclick={handleClearTree}
				class="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
				aria-label={t('entity_filter.clear_category', { label })}
			>
				<X class="size-3" />
				{selectedCount}
			</button>
		{/if}
	</div>

	{#each roots as root (root.id)}
		{@const children = store.getChildren(root.id)}
		{@const hasSelectedChild = children.some((c: Category) => store.isSelected(c.id, treeId))}
		{@const isOpen = isRootOpen(root.id, hasSelectedChild)}

		<Collapsible.Root open={isOpen} onOpenChange={() => toggleRoot(root.id, hasSelectedChild)}>
			<Collapsible.Trigger
				class="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground {hasSelectedChild ? 'text-foreground' : 'text-muted-foreground'}"
			>
				<ChevronRight
					class="size-4 shrink-0 transition-transform duration-200 {isOpen ? 'rotate-90' : ''}"
				/>
				<span class="truncate">{root.label}</span>
				{#if children.length > 0}
					<span class="ml-auto text-xs text-muted-foreground">{children.length}</span>
				{/if}
			</Collapsible.Trigger>

			<Collapsible.Content>
				<div class="ml-4 flex flex-col gap-0.5 border-l border-border pl-2 py-0.5">
					{#each children as child (child.id)}
					{@const selected = store.isSelected(child.id, treeId)}
						<button
							onclick={() => handleToggle(child.id)}
							class="flex w-full items-center rounded-md px-2 py-1 text-sm transition-colors text-left
								{selected
								? 'bg-accent text-accent-foreground font-medium'
								: 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'}"
						>
							<span class="truncate">{child.label}</span>
						</button>
					{/each}
				</div>
			</Collapsible.Content>
		</Collapsible.Root>
	{/each}

	{#if roots.length === 0 && !store.loading}
		<p class="text-sm text-muted-foreground px-2 py-2">{t('entity_filter.no_categories')}</p>
	{/if}
</div>
