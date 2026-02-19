<script lang="ts">
	import { favorites } from '$lib/stores/favorites.svelte.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import Tags from '@lucide/svelte/icons/tags';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import X from '@lucide/svelte/icons/x';

	interface Props {
		onopenAssignment: () => void;
		onopenRemoveConfirm: () => void;
	}

	let { onopenAssignment, onopenRemoveConfirm }: Props = $props();
</script>

{#if favorites.isSelecting}
	<div class="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 px-4 py-3 shadow-lg">
		<div class="mx-auto max-w-4xl flex items-center justify-between gap-3">
			<span class="text-sm font-medium">
				{favorites.selectedCount} selecionado{favorites.selectedCount > 1 ? 's' : ''}
			</span>

			<div class="flex items-center gap-2">
				<Button variant="outline" size="sm" onclick={onopenAssignment}>
					<Tags class="size-4 mr-1.5" />
					Organizar
				</Button>
				<Button variant="destructive" size="sm" onclick={onopenRemoveConfirm}>
					<Trash2 class="size-4 mr-1.5" />
					Desfavoritar
				</Button>
				<Button variant="ghost" size="sm" onclick={() => favorites.clearSelection()}>
					<X class="size-4" />
				</Button>
			</div>
		</div>
	</div>
{/if}
