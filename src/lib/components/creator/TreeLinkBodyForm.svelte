<script lang="ts">
	import type { TreeLinkBody } from '$lib/domain/content-tree/content-tree.js';
	import type { ContentTree } from '$lib/domain/content-tree/content-tree.js';
	import { getRootNode } from '$lib/domain/content-tree/content-tree.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { t } from '$lib/i18n/t.js';

	interface Props {
		body: TreeLinkBody;
		onchange: (body: TreeLinkBody) => void;
		/** Available trees the user can link to */
		availableTrees: ContentTree[];
	}

	let { body, onchange, availableTrees }: Props = $props();

	function handleSelect(e: Event) {
		const value = (e.currentTarget as HTMLSelectElement).value;
		onchange({ ...body, instanceTreeId: value });
	}
</script>

<div class="space-y-2">
	<Label for="tree-link-target">{t('tree_link.linked_page')}</Label>
	{#if availableTrees.length === 0}
		<p class="text-sm text-muted-foreground">{t('tree_link.no_compatible')}</p>
	{:else}
		<select
			id="tree-link-target"
			class="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
			value={body.instanceTreeId}
			onchange={handleSelect}
		>
			<option value="">{t('tree_link.select_page')}</option>
			{#each availableTrees as tree}
				{@const root = getRootNode(tree)}
				<option value={tree.metadata.id}>{root?.data.header.title ?? tree.metadata.id}</option>
			{/each}
		</select>
	{/if}
</div>
