<script lang="ts">
	import { onMount } from 'svelte';
	import type { Category, CategoryTreeId } from '$lib/domain/category/category.js';
	import type { CategoryAssignment } from '$lib/domain/shared/category-assignment.js';
	import { SUGGESTED_CATEGORIES_PER_TREE } from '$lib/domain/shared/category-assignment.js';
	import { createCategoryStore } from '$lib/persistence/category.store.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import * as Collapsible from '$lib/components/ui/collapsible/index.js';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import X from '@lucide/svelte/icons/x';
	import Check from '@lucide/svelte/icons/check';

	interface Props {
		assignments: CategoryAssignment[];
		onchange: (assignments: CategoryAssignment[]) => void;
		/** Optional read-only inherited assignments (shown dimmed, not editable) */
		inherited?: CategoryAssignment[];
	}

	let { assignments, onchange, inherited = [] }: Props = $props();

	let categories = $state<Category[]>([]);
	let loading = $state(true);

	const categoryRepo = createCategoryStore();
	const TREES: { id: CategoryTreeId; label: string }[] = [
		{ id: 'subject', label: 'Assunto' },
		{ id: 'content_type', label: 'Formato' },
		{ id: 'region', label: 'Região' }
	];

	onMount(async () => {
		categories = await categoryRepo.getAll();
		loading = false;
	});

	// Manual collapse overrides per root category
	let manualOverrides: Record<string, boolean> = $state({});

	function getRootCategories(treeId: CategoryTreeId): Category[] {
		return categories
			.filter((c) => c.parentId === null && c.treeId === treeId && c.isActive)
			.sort((a, b) => a.order - b.order);
	}

	function getChildren(parentId: string): Category[] {
		return categories
			.filter((c) => c.parentId === parentId && c.isActive)
			.sort((a, b) => a.order - b.order);
	}

	function getSelectedIds(treeId: CategoryTreeId): string[] {
		return assignments.find((a) => a.treeId === treeId)?.categoryIds ?? [];
	}

	function getInheritedIds(treeId: CategoryTreeId): string[] {
		return inherited.find((a) => a.treeId === treeId)?.categoryIds ?? [];
	}

	function isSelected(categoryId: string, treeId: CategoryTreeId): boolean {
		return getSelectedIds(treeId).includes(categoryId);
	}

	function isInherited(categoryId: string, treeId: CategoryTreeId): boolean {
		return getInheritedIds(treeId).includes(categoryId);
	}

	function toggleCategory(treeId: CategoryTreeId, categoryId: string) {
		const current = getSelectedIds(treeId);
		let newIds: string[];
		if (current.includes(categoryId)) {
			newIds = current.filter((id) => id !== categoryId);
		} else {
			newIds = [...current, categoryId];
		}

		const newAssignments = assignments.filter((a) => a.treeId !== treeId);
		if (newIds.length > 0) {
			newAssignments.push({ treeId, categoryIds: newIds });
		}
		onchange(newAssignments);
	}

	function clearTree(treeId: CategoryTreeId) {
		onchange(assignments.filter((a) => a.treeId !== treeId));
	}

	function isRootOpen(rootId: string, hasSelectedChild: boolean): boolean {
		if (rootId in manualOverrides) return manualOverrides[rootId];
		return hasSelectedChild;
	}

	function toggleRoot(rootId: string, hasSelectedChild: boolean) {
		const currentlyOpen = isRootOpen(rootId, hasSelectedChild);
		manualOverrides[rootId] = !currentlyOpen;
	}
</script>

<div class="space-y-3">
	<Label>Categorias</Label>

	{#if loading}
		<p class="text-xs text-muted-foreground animate-pulse">Carregando categorias…</p>
	{:else}
		{#each TREES as tree}
			{@const selected = getSelectedIds(tree.id)}
			{@const roots = getRootCategories(tree.id)}
			{@const inheritedCount = getInheritedIds(tree.id).filter((id) => !selected.includes(id)).length}

			<div class="flex flex-col gap-0.5">
				<div class="flex items-center justify-between mb-0.5">
					<span class="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
						{tree.label}
						{#if selected.length > 0}
							<span class="normal-case tracking-normal font-normal">({selected.length})</span>
						{/if}
						{#if selected.length > SUGGESTED_CATEGORIES_PER_TREE}
							<span class="text-amber-500 normal-case tracking-normal font-normal">— sugerido: {SUGGESTED_CATEGORIES_PER_TREE}</span>
						{/if}
						{#if inheritedCount > 0}
							<span class="text-muted-foreground/60 normal-case tracking-normal font-normal">+ {inheritedCount} herdadas</span>
						{/if}
					</span>
					{#if selected.length > 0}
						<button
							type="button"
							onclick={() => clearTree(tree.id)}
							class="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
							aria-label="Limpar {tree.label}"
						>
							<X class="size-3" />
						</button>
					{/if}
				</div>

				{#each roots as root (root.id)}
					{@const children = getChildren(root.id)}
					{@const hasSelectedChild = children.some((c) => isSelected(c.id, tree.id))}
					{@const hasInheritedChild = children.some((c) => isInherited(c.id, tree.id))}
					{@const isOpen = isRootOpen(root.id, hasSelectedChild || hasInheritedChild)}

					<Collapsible.Root open={isOpen} onOpenChange={() => toggleRoot(root.id, hasSelectedChild || hasInheritedChild)}>
						<Collapsible.Trigger
							class="flex w-full items-center gap-2 rounded-md px-2 py-1 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground {hasSelectedChild ? 'text-foreground' : 'text-muted-foreground'}"
						>
							<ChevronRight
								class="size-3.5 shrink-0 transition-transform duration-200 {isOpen ? 'rotate-90' : ''}"
							/>
							<span class="truncate">{root.label}</span>
							{#if children.length > 0}
								<span class="ml-auto text-xs text-muted-foreground">{children.length}</span>
							{/if}
						</Collapsible.Trigger>

						<Collapsible.Content>
							<div class="ml-4 flex flex-col gap-0.5 border-l border-border pl-2 py-0.5">
								{#each children as child (child.id)}
									{@const ownSelected = isSelected(child.id, tree.id)}
									{@const fromInherited = isInherited(child.id, tree.id)}

									<button
										type="button"
										onclick={() => toggleCategory(tree.id, child.id)}
										class="flex w-full items-center gap-1.5 rounded-md px-2 py-1 text-sm transition-colors text-left
											{ownSelected
											? 'bg-accent text-accent-foreground font-medium'
											: fromInherited
												? 'text-muted-foreground/60 italic'
												: 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'}"
									>
										{#if ownSelected}
											<Check class="size-3 shrink-0" />
										{:else if fromInherited}
											<Check class="size-3 shrink-0 opacity-40" />
										{/if}
										<span class="truncate">{child.label}</span>
										{#if fromInherited && !ownSelected}
											<span class="ml-auto text-[10px] text-muted-foreground/50">herdada</span>
										{/if}
									</button>
								{/each}
							</div>
						</Collapsible.Content>
					</Collapsible.Root>
				{/each}

				{#if roots.length === 0}
					<p class="text-xs text-muted-foreground px-2 py-1">Nenhuma categoria.</p>
				{/if}
			</div>
		{/each}
	{/if}
</div>
