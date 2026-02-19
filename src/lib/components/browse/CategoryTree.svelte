<script lang="ts">
	import type { Category, CategoryTreeId } from '$lib/domain/category/category.js';
	import { browse } from '$lib/stores/browse.svelte.js';
	import * as Collapsible from '$lib/components/ui/collapsible/index.js';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import X from '@lucide/svelte/icons/x';

	interface Props {
		treeId: CategoryTreeId;
		label: string;
	}

	let { treeId, label }: Props = $props();

	// Track which roots are open
	let openRoots: Record<string, boolean> = $state({});

	let roots = $derived(browse.getRootCategories(treeId));
	let selectedCount = $derived(browse.getSelectedCount(treeId));

	function toggleRoot(rootId: string) {
		openRoots[rootId] = !openRoots[rootId];
	}

	function handleToggle(categoryId: string) {
		browse.toggleCategory(categoryId, treeId);
	}

	function handleClearTree() {
		browse.clearTree(treeId);
	}
</script>

<div class="flex flex-col gap-0.5">
	<div class="flex items-center justify-between px-2 mb-1">
		<span class="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{label}</span>
		{#if selectedCount > 0}
			<button
				onclick={handleClearTree}
				class="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
				aria-label="Limpar filtro de {label}"
			>
				<X class="size-3" />
				{selectedCount}
			</button>
		{/if}
	</div>

	{#each roots as root (root.id)}
		{@const children = browse.getChildren(root.id)}
		{@const isOpen = openRoots[root.id] ?? false}
		{@const hasSelectedChild = children.some((c) => browse.isSelected(c.id, treeId))}

		<Collapsible.Root open={isOpen} onOpenChange={() => toggleRoot(root.id)}>
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
						{@const selected = browse.isSelected(child.id, treeId)}
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

	{#if roots.length === 0 && !browse.loading}
		<p class="text-sm text-muted-foreground px-2 py-2">Nenhuma categoria.</p>
	{/if}
</div>
