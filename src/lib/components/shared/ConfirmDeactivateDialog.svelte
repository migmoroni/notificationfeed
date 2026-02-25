<script lang="ts">
	import ConfirmDialog from '$lib/components/shared/ConfirmDialog.svelte';
	import ToggleLeft from '@lucide/svelte/icons/toggle-left';

	interface Props {
		open: boolean;
		title?: string;
		onconfirm: () => void;
		oncancel: () => void;
	}

	let { open = $bindable(), title = '', onconfirm, oncancel }: Props = $props();

	let description = $derived(
		title
			? `Desativar "${title}"? Você não receberá mais posts desta fonte.`
			: 'Desativar? Você não receberá mais posts desta fonte.'
	);
</script>

<ConfirmDialog
	bind:open
	title="Desativar fonte"
	{description}
	confirmLabel="Desativar"
	{onconfirm}
	{oncancel}
>
	{#snippet icon()}
		<div class="flex items-center justify-center size-12 rounded-full bg-destructive/10">
			<ToggleLeft class="size-6 text-destructive" />
		</div>
	{/snippet}
</ConfirmDialog>
