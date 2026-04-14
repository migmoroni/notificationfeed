<script lang="ts">
	import ConfirmDialog from '$lib/components/shared/dialog/ConfirmDialog.svelte';
	import StarOff from '@lucide/svelte/icons/star-off';
	import { t } from '$lib/i18n/t.js';

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
			? t('dialog.unfavorite.description_many', { count: String(count) })
			: t('dialog.unfavorite.description')
	);
</script>

<ConfirmDialog
	bind:open
	title={t('dialog.unfavorite.title')}
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
