<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import TriangleAlert from '@lucide/svelte/icons/triangle-alert';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import { t } from '$lib/i18n/t.js';

	interface Props {
		open: boolean;
		/** Title of the page being deleted — user must type this to confirm. */
		pageTitle: string;
		onconfirm: () => void;
		oncancel: () => void;
	}

	let { open = $bindable(), pageTitle, onconfirm, oncancel }: Props = $props();

	let typedTitle = $state('');
	let canConfirm = $derived(typedTitle.trim() === pageTitle.trim());

	function handleOpenChange(v: boolean) {
		if (!v) {
			typedTitle = '';
			oncancel();
		}
	}

	function handleConfirm() {
		if (!canConfirm) return;
		typedTitle = '';
		onconfirm();
	}

	$effect(() => {
		if (open) typedTitle = '';
	});
</script>

<Dialog.Root {open} onOpenChange={handleOpenChange}>
	<Dialog.Content class="sm:max-w-md">
		<div class="flex flex-col items-center gap-3 pt-2">
			<div class="flex items-center justify-center size-14 rounded-full bg-destructive/10">
				<TriangleAlert class="size-7 text-destructive" />
			</div>
		</div>

		<Dialog.Header class="text-center">
			<Dialog.Title class="text-lg">{t('dialog.delete_page.title')}</Dialog.Title>
			<Dialog.Description class="text-sm text-muted-foreground leading-relaxed">
				{t('dialog.delete_page.description')}
			</Dialog.Description>
		</Dialog.Header>

		<div class="space-y-2 py-2">
			<p class="text-sm text-muted-foreground">
				{t('dialog.delete_page.confirm_hint')}
			</p>
			<div class="rounded-md bg-muted px-3 py-2 text-sm font-mono font-medium select-all">
				{pageTitle}
			</div>
			<Input
				bind:value={typedTitle}
				placeholder={t('dialog.delete_page.placeholder')}
				class="font-mono"
			/>
		</div>

		<Dialog.Footer>
			<Button variant="outline" onclick={() => { typedTitle = ''; oncancel(); }}>
				{t('btn.cancel')}
			</Button>
			<Button
				variant="destructive"
				disabled={!canConfirm}
				onclick={handleConfirm}
			>
				<Trash2 class="size-4 mr-1.5" />
				{t('dialog.delete_page.confirm')}
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
