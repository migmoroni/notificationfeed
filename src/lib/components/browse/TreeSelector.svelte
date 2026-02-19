<script lang="ts">
	import type { CategoryTreeId } from '$lib/domain/category/category.js';
	import { browse } from '$lib/stores/browse.svelte.js';
	import * as Tabs from '$lib/components/ui/tabs/index.js';
	import CategoryTree from './CategoryTree.svelte';

	interface Props {
		selectedCategoryId: string | null;
		onselect: (categoryId: string | null) => void;
	}

	let { selectedCategoryId, onselect }: Props = $props();

	function handleTreeChange(value: string) {
		browse.setActiveTree(value as CategoryTreeId);
		onselect(null);
	}
</script>

<Tabs.Root value={browse.activeTreeId} onValueChange={handleTreeChange}>
	<Tabs.List class="h-9 mb-3">
		<Tabs.Trigger value="subject" class="text-xs px-3">Assunto</Tabs.Trigger>
		<Tabs.Trigger value="content_type" class="text-xs px-3">Formato</Tabs.Trigger>
	</Tabs.List>
</Tabs.Root>

<CategoryTree {selectedCategoryId} {onselect} />
