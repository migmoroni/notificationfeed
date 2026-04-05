<script lang="ts">
	import ConfirmDialog from '$lib/components/shared/dialog/ConfirmDialog.svelte';
	import PinOff from '@lucide/svelte/icons/pin-off';

	interface Props { open: boolean; title?: string; onconfirm: () => void; oncancel: () => void; }
	let { open = $bindable(), title = '', onconfirm, oncancel }: Props = $props();

	let description = $derived(
		title
			? `Desafixar "${title}"? Esta página será removida da sua lista.`
			: 'Desafixar? Esta página será removida da sua lista.'
	);
</script>

<ConfirmDialog bind:open title="Desafixar página" {description} confirmLabel="Desafixar" {onconfirm} {oncancel}>
	{#snippet icon()}
		<div class="flex items-center justify-center size-12 rounded-full bg-destructive/10">
			<PinOff class="size-6 text-destructive" />
		</div>
	{/snippet}
</ConfirmDialog>
