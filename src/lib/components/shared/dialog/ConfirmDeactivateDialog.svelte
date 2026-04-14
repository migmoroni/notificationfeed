<script lang="ts">
	import ConfirmDialog from '$lib/components/shared/dialog/ConfirmDialog.svelte';
	import ToggleLeft from '@lucide/svelte/icons/toggle-left';
	import { t } from '$lib/i18n/t.js';

	interface Props {
		open: boolean;
		title?: string;
		onconfirm: () => void;
		oncancel: () => void;
	}

	let { open = $bindable(), title = '', onconfirm, oncancel }: Props = $props();

	let description = $derived(
		title
			? t('dialog.deactivate.description_named', { title })
			: t('dialog.deactivate.description')
	);
</script>

<ConfirmDialog
	bind:open
	title={t('dialog.deactivate.title')}
	{description}
	confirmLabel={t('dialog.deactivate.confirm')}
	{onconfirm}
	{oncancel}
>
	{#snippet icon()}
		<div class="flex items-center justify-center size-12 rounded-full bg-destructive/10">
			<ToggleLeft class="size-6 text-destructive" />
		</div>
	{/snippet}
</ConfirmDialog>
