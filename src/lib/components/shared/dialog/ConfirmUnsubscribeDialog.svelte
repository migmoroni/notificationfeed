<script lang="ts">
	import ConfirmDialog from '$lib/components/shared/dialog/ConfirmDialog.svelte';
	import UserMinus from '@lucide/svelte/icons/user-minus';
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
			? t('dialog.unsubscribe.description_named', { title })
			: t('dialog.unsubscribe.description')
	);
</script>

<ConfirmDialog
	bind:open
	title={t('dialog.unsubscribe.title')}
	{description}
	confirmLabel={t('dialog.unsubscribe.confirm')}
	{onconfirm}
	{oncancel}
>
	{#snippet icon()}
		<div class="flex items-center justify-center size-12 rounded-full bg-destructive/10">
			<UserMinus class="size-6 text-destructive" />
		</div>
	{/snippet}
</ConfirmDialog>
