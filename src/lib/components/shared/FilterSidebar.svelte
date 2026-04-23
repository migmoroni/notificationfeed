<!--
  FilterSidebar — Unified sidebar for entity tree filter + library-tab filter + category selector.

  Uses EntityFilterStore with ContentTree navigation.
-->
<script lang="ts">
	import type { EntityFilterStore } from '$lib/stores/entity-filter.types.js';
	import type { CategoryTreeStore } from '$lib/stores/category-tree.types.js';
	import EntityTreeFilter from './EntityTreeFilter.svelte';
	import LibraryTabFilter from './LibraryTabFilter.svelte';
	import TreeSelector from './TreeSelector.svelte';

	interface Props {
		entityStore: EntityFilterStore;
		categoryStore: CategoryTreeStore;
	}

	let { entityStore, categoryStore }: Props = $props();
</script>

<div class="flex flex-col h-full min-w-0 overflow-hidden">
	<!-- Pages: scrollable area -->
	<div class="flex-1 min-h-0 overflow-y-auto py-2">
		<EntityTreeFilter store={entityStore} />
	</div>
	<!-- Library tabs: fixed between pages and categories -->
	<div class="border-t border-border py-2 shrink-0">
		<LibraryTabFilter store={entityStore} />
	</div>
	<!-- Categories: fixed at the bottom -->
	<div class="border-t border-border py-2 shrink-0">
		<TreeSelector store={categoryStore} />
	</div>
</div>
