<script lang="ts">
	import { onMount } from 'svelte';
	import type { Category, CategoryTreeId } from '$lib/domain/category/category.js';
	import type { CategoryAssignment } from '$lib/domain/shared/category-assignment.js';
	import { SUGGESTED_CATEGORIES_PER_TREE } from '$lib/domain/shared/category-assignment.js';
	import { createCategoryStore } from '$lib/persistence/category.store.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import X from '@lucide/svelte/icons/x';

	interface Props {
		assignments: CategoryAssignment[];
		onchange: (assignments: CategoryAssignment[]) => void;
	}

	let { assignments, onchange }: Props = $props();

	let categories = $state<Category[]>([]);
	let loading = $state(true);

	const categoryRepo = createCategoryStore();
	const TREES: { id: CategoryTreeId; label: string }[] = [
		{ id: 'subject', label: 'Assunto' },
		{ id: 'content_type', label: 'Formato' },
		{ id: 'region', label: 'Região' }
	];

	onMount(async () => {
		categories = await categoryRepo.getSublevels();
		loading = false;
	});

	function getTreeCategories(treeId: CategoryTreeId): Category[] {
		return categories.filter((c) => c.treeId === treeId);
	}

	function getSelectedIds(treeId: CategoryTreeId): string[] {
		return assignments.find((a) => a.treeId === treeId)?.categoryIds ?? [];
	}

	function toggleCategory(treeId: CategoryTreeId, categoryId: string) {
		const existing = assignments.find((a) => a.treeId === treeId);
		const currentIds = existing?.categoryIds ?? [];

		let newIds: string[];
		if (currentIds.includes(categoryId)) {
			newIds = currentIds.filter((id) => id !== categoryId);
		} else {
			newIds = [...currentIds, categoryId];
		}

		const newAssignments = assignments.filter((a) => a.treeId !== treeId);
		if (newIds.length > 0) {
			newAssignments.push({ treeId, categoryIds: newIds });
		}
		onchange(newAssignments);
	}

	function getCategoryLabel(id: string): string {
		return categories.find((c) => c.id === id)?.label ?? id;
	}
</script>

<div class="space-y-3">
	<Label>Categorias</Label>

	{#if loading}
		<p class="text-xs text-muted-foreground animate-pulse">Carregando categorias…</p>
	{:else}
		{#each TREES as tree}
			{@const selected = getSelectedIds(tree.id)}
			{@const available = getTreeCategories(tree.id)}
			<div class="space-y-1">
				<span class="text-xs font-medium text-muted-foreground">
					{tree.label} ({selected.length})
					{#if selected.length > SUGGESTED_CATEGORIES_PER_TREE}
						<span class="text-amber-500">— sugerido: {SUGGESTED_CATEGORIES_PER_TREE}</span>
					{/if}
				</span>

				{#if selected.length > 0}
					<div class="flex flex-wrap gap-1 mb-1">
						{#each selected as catId}
							<Badge variant="secondary" class="gap-1 pr-1">
								{getCategoryLabel(catId)}
								<button
									type="button"
									class="ml-0.5 rounded-full hover:bg-muted-foreground/20 p-0.5"
									onclick={() => toggleCategory(tree.id, catId)}
								>
									<X class="size-3" />
								</button>
							</Badge>
						{/each}
					</div>
				{/if}

				<div class="flex flex-wrap gap-1">
					{#each available as cat}
						{@const isSelected = selected.includes(cat.id)}
						<button
							type="button"
							class="text-xs px-2 py-0.5 rounded-md border transition-colors {isSelected
								? 'bg-primary text-primary-foreground border-primary'
								: 'hover:bg-accent hover:text-accent-foreground border-border'}"
							onclick={() => toggleCategory(tree.id, cat.id)}
						>
							{cat.label}
						</button>
					{/each}
				</div>
			</div>
		{/each}
	{/if}
</div>
