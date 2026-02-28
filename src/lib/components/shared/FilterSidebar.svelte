<!--
  FilterSidebar — Unified sidebar for Fontes + Categorias filters.

  Used by both Feed and Browse pages with their respective stores.
  Receives entityStore (EntityFilterStore) and categoryStore (CategoryTreeStore).
-->
<script lang="ts">
	import type { EntityFilterStore } from '$lib/stores/entity-filter.types.js';
	import type { CategoryTreeStore } from '$lib/stores/category-tree.types.js';
	import EntityTreeFilter from './EntityTreeFilter.svelte';
	import TreeSelector from './TreeSelector.svelte';

	interface Props {
		entityStore: EntityFilterStore;
		categoryStore: CategoryTreeStore;
	}

	let { entityStore, categoryStore }: Props = $props();
</script>

<div class="flex flex-col gap-4">
	<EntityTreeFilter store={entityStore} />
	<div class="border-t border-border pt-4">
		<TreeSelector store={categoryStore} />
	</div>
</div>
