<script lang="ts">
	import type { Category } from '$lib/domain/category/category.js';
	import { browse } from '$lib/stores/browse.svelte.js';
	import * as Collapsible from '$lib/components/ui/collapsible/index.js';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';

	interface Props {
		selectedCategoryId: string | null;
		onselect: (categoryId: string | null) => void;
	}

	let { selectedCategoryId, onselect }: Props = $props();

	// Track which roots are open — persists across tree interactions
	let openRoots: Record<string, boolean> = $state({});

	function toggleRoot(rootId: string) {
		openRoots[rootId] = !openRoots[rootId];
	}

	function handleSelect(categoryId: string) {
		if (selectedCategoryId === categoryId) {
			onselect(null);
		} else {
			onselect(categoryId);
		}
	}
</script>

<div class="flex flex-col gap-0.5">
	{#each browse.rootCategories as root (root.id)}
		{@const children = browse.getChildren(root.id)}
		{@const isOpen = openRoots[root.id] ?? false}
		{@const hasSelectedChild = children.some((c) => c.id === selectedCategoryId)}

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
						<button
							onclick={() => handleSelect(child.id)}
							class="flex w-full items-center rounded-md px-2 py-1 text-sm transition-colors text-left
								{selectedCategoryId === child.id
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

	{#if browse.rootCategories.length === 0 && !browse.loading}
		<p class="text-sm text-muted-foreground px-2 py-4">Nenhuma categoria disponível.</p>
	{/if}
</div>
