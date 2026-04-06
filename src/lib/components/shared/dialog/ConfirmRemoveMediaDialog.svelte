<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import Trash2 from '@lucide/svelte/icons/trash-2';

	interface Props {
		open: boolean;
		/** Preview image URL (for avatar/banner). */
		previewUrl?: string | null;
		/** Preview emoji (for emoji avatar). */
		emoji?: string | null;
		/** What is being removed, e.g. "avatar", "banner", "emoji". */
		mediaLabel?: string;
		onconfirm: () => void;
		oncancel: () => void;
	}

	let {
		open = $bindable(),
		previewUrl = null,
		emoji = null,
		mediaLabel = 'imagem',
		onconfirm,
		oncancel
	}: Props = $props();

	function handleOpenChange(v: boolean) {
		if (!v) oncancel();
	}
</script>

<Dialog.Root {open} onOpenChange={handleOpenChange}>
	<Dialog.Content class="sm:max-w-sm">
		<div class="flex flex-col items-center gap-4 pt-2">
			<!-- Preview -->
			{#if previewUrl && mediaLabel === 'banner'}
				<div class="w-full rounded-xl overflow-hidden border-2 bg-muted shadow-sm" style="aspect-ratio: 3.6 / 1;">
					<img src={previewUrl} alt={mediaLabel} class="w-full h-full object-cover" />
				</div>
			{:else if previewUrl}
				<div class="size-24 rounded-xl overflow-hidden border-2 bg-muted shadow-sm">
					<img src={previewUrl} alt={mediaLabel} class="w-full h-full object-cover" />
				</div>
			{:else if emoji}
				<div class="size-24 rounded-xl border-2 bg-muted flex items-center justify-center text-5xl shadow-sm">
					{emoji}
				</div>
			{:else}
				<div class="flex items-center justify-center size-14 rounded-full bg-destructive/10">
					<Trash2 class="size-7 text-destructive" />
				</div>
			{/if}
		</div>

		<Dialog.Header class="text-center">
			<Dialog.Title>Remover {mediaLabel}</Dialog.Title>
			<Dialog.Description>
				Tem certeza que deseja remover esta {mediaLabel}?
				A mídia continuará disponível na sua biblioteca.
			</Dialog.Description>
		</Dialog.Header>

		<Dialog.Footer>
			<Button variant="outline" onclick={oncancel}>Cancelar</Button>
			<Button variant="destructive" onclick={onconfirm}>Remover</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
