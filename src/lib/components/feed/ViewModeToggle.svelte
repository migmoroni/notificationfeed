<script lang="ts">
	import { viewModeStore } from '$lib/stores/view-mode.svelte.js';
	import * as Tabs from '$lib/components/ui/tabs/index.js';
	import List from '@lucide/svelte/icons/list';
	import LayoutGrid from '@lucide/svelte/icons/layout-grid';
	import SquareMenu from '@lucide/svelte/icons/square-menu';

	const options = [
		{ value: 'list', icon: List, title: 'Lista' },
		{ value: 'cards', icon: LayoutGrid, title: 'Cards' },
		{ value: 'posts', icon: SquareMenu, title: 'Posts' }
	];

	function handleChange(newValue: string) {
		viewModeStore.mode = newValue as import('$lib/stores/view-mode.svelte.js').FeedViewMode;
	}
</script>

<Tabs.Root value={viewModeStore.mode} onValueChange={handleChange}>
	<Tabs.List class="h-9 w-30 flex px-0.5">
		{#each options as opt}
			<Tabs.Trigger value={opt.value} class="text-xs px-0 flex-1 flex justify-center" aria-label={opt.title} title={opt.title}>
				<opt.icon class="size-4" />
			</Tabs.Trigger>
		{/each}
	</Tabs.List>
</Tabs.Root>
