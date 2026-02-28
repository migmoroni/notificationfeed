<script lang="ts">
	import type { CategoryTreeStore } from '$lib/stores/category-tree.types.js';
	import CategoryTree from './CategoryTree.svelte';
	import { Separator } from '$lib/components/ui/separator/index.js';

	interface Props {
		store: CategoryTreeStore;
	}

	let { store }: Props = $props();
</script>

<nav class="flex flex-col gap-3" aria-label="Filtros por categoria">
	<CategoryTree treeId="subject" label="Assunto" {store} />
	<Separator />
	<CategoryTree treeId="content_type" label="Formato" {store} />
	<Separator />
	<CategoryTree treeId="region" label="Região" {store} />
</nav>
