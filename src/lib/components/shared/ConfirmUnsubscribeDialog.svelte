<script lang="ts">
	import ConfirmDialog from '$lib/components/shared/ConfirmDialog.svelte';
	import UserMinus from '@lucide/svelte/icons/user-minus';

	interface Props {
		open: boolean;
		title?: string;
		onconfirm: () => void;
		oncancel: () => void;
	}

	let { open = $bindable(), title = '', onconfirm, oncancel }: Props = $props();

	let description = $derived(
		title
			? `Cancelar inscrição de "${title}"? Você deixará de receber posts desta página.`
			: 'Cancelar inscrição? Você deixará de receber posts desta página.'
	);
</script>

<ConfirmDialog
	bind:open
	title="Cancelar inscrição"
	{description}
	confirmLabel="Cancelar inscrição"
	{onconfirm}
	{oncancel}
>
	{#snippet icon()}
		<div class="flex items-center justify-center size-12 rounded-full bg-destructive/10">
			<UserMinus class="size-6 text-destructive" />
		</div>
	{/snippet}
</ConfirmDialog>
