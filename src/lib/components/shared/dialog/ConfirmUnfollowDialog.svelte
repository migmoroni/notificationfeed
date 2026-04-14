<script lang="ts">
	import ConfirmDialog from '$lib/components/shared/dialog/ConfirmDialog.svelte';
	import EyeOff from '@lucide/svelte/icons/eye-off';
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
			? t('dialog.unfollow.description_named', { title })
			: t('dialog.unfollow.description')
	);
</script>

<ConfirmDialog
	bind:open
	title={t('dialog.unfollow.title')}
	{description}
	confirmLabel={t('dialog.unfollow.confirm')}
	{onconfirm}
	{oncancel}
>
	{#snippet icon()}
		<div class="flex items-center justify-center size-12 rounded-full bg-destructive/10">
			<EyeOff class="size-6 text-destructive" />
		</div>
	{/snippet}
</ConfirmDialog>
