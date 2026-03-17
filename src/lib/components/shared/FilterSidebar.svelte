<!--
  FilterSidebar — Unified sidebar for entity tree filter + category selector.

  Uses EntityFilterStore with ContentTree navigation.
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
