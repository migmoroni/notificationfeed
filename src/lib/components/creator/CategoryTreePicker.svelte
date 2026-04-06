<script lang="ts">
	import { onMount } from 'svelte';
	import type { Category, CategoryTreeId } from '$lib/domain/category/category.js';
	import type { CategoryAssignment } from '$lib/domain/shared/category-assignment.js';
	import { SUGGESTED_CATEGORIES_PER_TREE } from '$lib/domain/shared/category-assignment.js';
	import { createCategoryStore } from '$lib/persistence/category.store.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import * as Collapsible from '$lib/components/ui/collapsible/index.js';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import ChevronDown from '@lucide/svelte/icons/chevron-down';
	import X from '@lucide/svelte/icons/x';
	import Check from '@lucide/svelte/icons/check';
	import Tag from '@lucide/svelte/icons/tag';
	import BookOpen from '@lucide/svelte/icons/book-open';
	import FileText from '@lucide/svelte/icons/file-text';
	import Globe from '@lucide/svelte/icons/globe';

	interface Props {
		assignments: CategoryAssignment[];
		onchange: (assignments: CategoryAssignment[]) => void;
		/** Optional read-only inherited assignments (shown dimmed, not editable) */
		inherited?: CategoryAssignment[];
	}

	let { assignments, onchange, inherited = [] }: Props = $props();

	let categories = $state<Category[]>([]);
	let loading = $state(true);
	let sectionOpen = $state(false);

	const categoryRepo = createCategoryStore();

	const TREES: { id: CategoryTreeId; label: string; description: string; icon: typeof BookOpen }[] = [
		{ id: 'subject', label: 'Assunto', description: 'Sobre o que é este conteúdo?', icon: BookOpen },
		{ id: 'content_type', label: 'Formato', description: 'Que tipo de conteúdo é?', icon: FileText },
		{ id: 'region', label: 'Região', description: 'De qual região geográfica?', icon: Globe }
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

	function removeCategory(treeId: CategoryTreeId, categoryId: string) {
		toggleCategory(treeId, categoryId);
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

	function getCategoryLabel(categoryId: string): string {
		return categories.find((c) => c.id === categoryId)?.label ?? categoryId;
	}

	let totalSelected = $derived(
		assignments.reduce((sum, a) => sum + a.categoryIds.length, 0)
	);
</script>

<!-- Collapsible wrapper -->
<div class="rounded-lg border">
	<button
		type="button"
		class="flex w-full items-center gap-2 px-3 py-2.5 text-left hover:bg-muted/50 transition-colors"
		onclick={() => (sectionOpen = !sectionOpen)}
	>
		<Tag class="size-4 text-muted-foreground shrink-0" />
		<span class="text-sm font-medium flex-1">Categorias</span>
		{#if totalSelected > 0}
			<Badge variant="secondary" class="text-xs">{totalSelected} selecionada{totalSelected !== 1 ? 's' : ''}</Badge>
		{:else}
			<span class="text-xs text-muted-foreground">Nenhuma</span>
		{/if}
		{#if sectionOpen}
			<ChevronDown class="size-4 text-muted-foreground shrink-0" />
		{:else}
			<ChevronRight class="size-4 text-muted-foreground shrink-0" />
		{/if}
	</button>

	{#if sectionOpen}
		<div class="border-t px-3 pb-3 pt-2 space-y-1">
			<p class="text-xs text-muted-foreground mb-3">
				Classifique esta página para facilitar a descoberta. Selecione até {SUGGESTED_CATEGORIES_PER_TREE} por grupo.
			</p>

			<!-- Selected chips summary -->
			{#if totalSelected > 0}
				<div class="flex flex-wrap gap-1.5 mb-3">
					{#each TREES as tree}
						{#each getSelectedIds(tree.id) as catId}
							<Badge variant="outline" class="gap-1 text-xs pr-1">
								{getCategoryLabel(catId)}
								<button
									type="button"
									class="ml-0.5 hover:bg-muted rounded-full p-0.5"
									onclick={() => removeCategory(tree.id, catId)}
								>
									<X class="size-2.5" />
								</button>
							</Badge>
						{/each}
					{/each}
				</div>
			{/if}

			{#if loading}
				<p class="text-xs text-muted-foreground animate-pulse py-2">Carregando categorias…</p>
			{:else}
				{#each TREES as tree}
					{@const selected = getSelectedIds(tree.id)}
					{@const roots = getRootCategories(tree.id)}
					{@const inheritedCount = getInheritedIds(tree.id).filter((id) => !selected.includes(id)).length}

					<div class="py-2">
						<div class="flex items-center gap-1.5 mb-1">
							<svelte:component this={tree.icon} class="size-3.5 text-muted-foreground" />
							<span class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
								{tree.label}
							</span>
							{#if selected.length > SUGGESTED_CATEGORIES_PER_TREE}
								<span class="text-[10px] text-amber-500">máx. {SUGGESTED_CATEGORIES_PER_TREE}</span>
							{/if}
							{#if inheritedCount > 0}
								<span class="text-[10px] text-muted-foreground/60">+ {inheritedCount} herdada{inheritedCount !== 1 ? 's' : ''}</span>
							{/if}
							{#if selected.length > 0}
								<button
									type="button"
									onclick={() => clearTree(tree.id)}
									class="ml-auto text-[10px] text-muted-foreground hover:text-foreground transition-colors"
								>
									limpar
								</button>
							{/if}
						</div>
						<p class="text-[11px] text-muted-foreground/70 mb-1.5 pl-5">{tree.description}</p>

						{#each roots as root (root.id)}
							{@const children = getChildren(root.id)}
							{@const hasSelectedChild = children.some((c) => isSelected(c.id, tree.id))}
							{@const hasInheritedChild = children.some((c) => isInherited(c.id, tree.id))}
							{@const isOpen = isRootOpen(root.id, hasSelectedChild || hasInheritedChild)}

							<Collapsible.Root open={isOpen} onOpenChange={() => toggleRoot(root.id, hasSelectedChild || hasInheritedChild)}>
								<Collapsible.Trigger
									class="flex w-full items-center gap-1.5 rounded-md px-2 py-1 text-sm transition-colors hover:bg-accent hover:text-accent-foreground {hasSelectedChild ? 'text-foreground font-medium' : 'text-muted-foreground'}"
								>
									<ChevronRight
										class="size-3 shrink-0 transition-transform duration-200 {isOpen ? 'rotate-90' : ''}"
									/>
									<span class="truncate">{root.label}</span>
									{#if hasSelectedChild}
										{@const count = children.filter((c) => isSelected(c.id, tree.id)).length}
										<Badge variant="secondary" class="ml-auto text-[10px] h-4 px-1.5">{count}</Badge>
									{:else if children.length > 0}
										<span class="ml-auto text-[10px] text-muted-foreground/50">{children.length}</span>
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
													? 'bg-primary/10 text-primary font-medium'
													: fromInherited
														? 'text-muted-foreground/50 italic'
														: 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'}"
											>
												{#if ownSelected}
													<div class="size-3.5 shrink-0 rounded border-2 border-primary bg-primary flex items-center justify-center">
														<Check class="size-2.5 text-primary-foreground" />
													</div>
												{:else if fromInherited}
													<div class="size-3.5 shrink-0 rounded border border-muted-foreground/30 flex items-center justify-center">
														<Check class="size-2.5 text-muted-foreground/40" />
													</div>
												{:else}
													<div class="size-3.5 shrink-0 rounded border border-muted-foreground/30"></div>
												{/if}
												<span class="truncate">{child.label}</span>
												{#if fromInherited && !ownSelected}
													<span class="ml-auto text-[10px] text-muted-foreground/40">herdada</span>
												{/if}
											</button>
										{/each}
									</div>
								</Collapsible.Content>
							</Collapsible.Root>
						{/each}
					</div>

					{#if tree.id !== 'region'}
						<div class="border-b border-border/50"></div>
					{/if}
				{/each}
			{/if}
		</div>
	{/if}
</div>
