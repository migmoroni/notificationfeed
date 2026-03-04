<script lang="ts">
	import ConfirmDialog from '$lib/components/shared/dialog/ConfirmDialog.svelte';
	import StarOff from '@lucide/svelte/icons/star-off';

	interface Props {
		open: boolean;
		/** How many items are being unfavorited. Defaults to 1 for single item. */
		count?: number;
		onconfirm: () => void;
		oncancel: () => void;
	}

	let { open = $bindable(), count = 1, onconfirm, oncancel }: Props = $props();

	let description = $derived(
		count > 1
			? `Remover ${count} itens dos favoritos? Eles não serão excluídos, apenas perderão o status de favorito.`
			: 'Remover dos favoritos? O item não será excluído, apenas perderá o status de favorito.'
	);
</script>

<ConfirmDialog
	bind:open
	title="Desfavoritar"
	{description}
	{onconfirm}
	{oncancel}
>
	{#snippet icon()}
		<div class="flex items-center justify-center size-12 rounded-full bg-yellow-500/10">
			<StarOff class="size-6 text-yellow-500" />
		</div>
	{/snippet}
</ConfirmDialog>
