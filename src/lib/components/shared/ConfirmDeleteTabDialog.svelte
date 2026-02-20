<script lang="ts">
	import ConfirmDialog from '$lib/components/shared/ConfirmDialog.svelte';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import Bookmark from '@lucide/svelte/icons/bookmark';

	interface Props {
		open: boolean;
		onconfirm: () => void;
		oncancel: () => void;
	}

	let { open = $bindable(), onconfirm, oncancel }: Props = $props();
</script>

<ConfirmDialog
	bind:open
	title="Excluir Tab"
	description="Excluir esta tab de favoritos? Os itens não serão removidos, apenas a organização será perdida."
	confirmLabel="Excluir"
	{onconfirm}
	{oncancel}
>
	{#snippet icon()}
		<div class="flex items-center justify-center size-12 rounded-full bg-destructive/10">
			<div class="relative">
				<Bookmark class="size-6 text-destructive/60" />
				<Trash2 class="size-3.5 text-destructive absolute -bottom-1 -right-1.5" />
			</div>
		</div>
	{/snippet}
</ConfirmDialog>
