<!--
  EntityList — displays TreeNode[] grouped by role.
  
  Replaces the old EntityList that worked with BrowseEntity[] union type.
-->
<script lang="ts">
	import { t } from '$lib/i18n/t.js';
	import type { TreeNode } from '$lib/domain/content-tree/content-tree.js';
	import EntityCard from './EntityCard.svelte';
	import { Separator } from '$lib/components/ui/separator/index.js';
	import { layout } from '$lib/stores/layout.svelte.js';

	interface Props {
		nodes: TreeNode[];
		loading: boolean;
		baseHref?: string;
	}

	let { nodes, loading, baseHref = '/browse' }: Props = $props();

	let collections = $derived(nodes.filter((n) => n.role === 'collection'));
	let profiles = $derived(nodes.filter((n) => n.role === 'profile'));
	let fonts = $derived(nodes.filter((n) => n.role === 'font'));

	function nodeHref(node: TreeNode): string {
		return `${baseHref}/node/${node.metadata.id}`;
	}
</script>

{#if loading}
	<div class="grid gap-3 {layout.isExpanded ? 'grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'}">
		{#each { length: 6 } as _}
			<div class="rounded-lg border border-border bg-card p-3.5 animate-pulse">
				<div class="flex items-start gap-3">
					<div class="size-10 rounded-md bg-muted"></div>
					<div class="flex-1">
						<div class="h-4 w-28 bg-muted rounded mb-2"></div>
						<div class="h-3 w-40 bg-muted rounded"></div>
					</div>
				</div>
			</div>
		{/each}
	</div>
{:else if nodes.length === 0}
	<div class="flex flex-col items-center justify-center py-12 text-center">
		<p class="text-sm text-muted-foreground">{t('entity_list.select_category')}</p>
	</div>
{:else}
	<div class="flex flex-col gap-4">
		{#if collections.length > 0}
			<div>
				<h3 class="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5 px-1">
					Collections ({collections.length})
				</h3>
				<div class="grid gap-3 {layout.isExpanded ? 'grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'}">
					{#each collections as node (node.metadata.id)}
						<EntityCard {node} href={nodeHref(node)} />
					{/each}
				</div>
			</div>
		{/if}

		{#if collections.length > 0 && profiles.length > 0}
			<Separator />
		{/if}

		{#if profiles.length > 0}
			<div>
				<h3 class="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5 px-1">
					Profiles ({profiles.length})
				</h3>
				<div class="grid gap-3 {layout.isExpanded ? 'grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'}">
					{#each profiles as node (node.metadata.id)}
						<EntityCard {node} href={nodeHref(node)} />
					{/each}
				</div>
			</div>
		{/if}

		{#if (collections.length > 0 || profiles.length > 0) && fonts.length > 0}
			<Separator />
		{/if}

		{#if fonts.length > 0}
			<div>
				<h3 class="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5 px-1">
					Fonts ({fonts.length})
				</h3>
				<div class="grid gap-3 {layout.isExpanded ? 'grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'}">
					{#each fonts as node (node.metadata.id)}
						<EntityCard {node} href={nodeHref(node)} />
					{/each}
				</div>
			</div>
		{/if}
	</div>
{/if}
