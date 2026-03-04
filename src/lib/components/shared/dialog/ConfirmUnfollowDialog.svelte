<script lang="ts">
	import ConfirmDialog from '$lib/components/shared/dialog/ConfirmDialog.svelte';
	import EyeOff from '@lucide/svelte/icons/eye-off';

	interface Props {
		open: boolean;
		title?: string;
		onconfirm: () => void;
		oncancel: () => void;
	}

	let { open = $bindable(), title = '', onconfirm, oncancel }: Props = $props();

	let description = $derived(
		title
			? `Deixar de seguir "${title}"? Você não receberá mais seus posts.`
			: 'Deixar de seguir? Você não receberá mais posts desta fonte.'
	);
</script>

<ConfirmDialog
	bind:open
	title="Deixar de seguir"
	{description}
	confirmLabel="Deixar de seguir"
	{onconfirm}
	{oncancel}
>
	{#snippet icon()}
		<div class="flex items-center justify-center size-12 rounded-full bg-destructive/10">
			<EyeOff class="size-6 text-destructive" />
		</div>
	{/snippet}
</ConfirmDialog>
