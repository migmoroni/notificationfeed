<script lang="ts">
	import { untrack } from 'svelte';
	import type { ContentMedia } from '$lib/domain/content-media/content-media.js';
	import { creator } from '$lib/stores/creator.svelte.js';
	import { getMediaPreviewUrl } from '$lib/services/media.service.js';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import Images from '@lucide/svelte/icons/images';
	import Check from '@lucide/svelte/icons/check';
	import { t } from '$lib/i18n/t.js';

	interface Props {
		open: boolean;
		/** Optional: pre-select a media by ID when opening. */
		selectedId?: string | undefined;
		onselect: (media: ContentMedia) => void;
		oncancel: () => void;
	}

	let { open = $bindable(), selectedId, onselect, oncancel }: Props = $props();

	let picked = $state<string | undefined>(untrack(() => selectedId));

	let allMedias = $derived(creator.medias.filter((m) => m.mimeType.startsWith('image/')));

	function handleOpenChange(v: boolean) {
		if (!v) oncancel();
	}

	function handleConfirm() {
		if (!picked) return;
		const media = creator.getMediaById(picked);
		if (media) onselect(media);
	}

	// Reset picked when dialog opens
	$effect(() => {
		if (open) {
			picked = selectedId;
		}
	});
</script>

<Dialog.Root {open} onOpenChange={handleOpenChange}>
	<Dialog.Content class="sm:max-w-lg">
		<div class="flex justify-center pt-2 pb-1">
			<div class="flex items-center justify-center size-12 rounded-full bg-primary/10">
				<Images class="size-6 text-primary" />
			</div>
		</div>
		<Dialog.Header class="text-center">
			<Dialog.Title>{t('dialog.media_picker.title')}</Dialog.Title>
			<Dialog.Description>{t('dialog.media_picker.description')}</Dialog.Description>
		</Dialog.Header>

		{#if allMedias.length === 0}
			<div class="flex flex-col items-center justify-center py-8 text-muted-foreground gap-2">
				<Images class="size-8" />
				<p class="text-sm">{t('dialog.media_picker.empty')}</p>
			</div>
		{:else}
			<div class="grid grid-cols-4 gap-2 max-h-64 overflow-y-auto py-2">
				{#each allMedias as media (media.metadata.id)}
					{@const url = getMediaPreviewUrl(media)}
					<button
						type="button"
						class="relative aspect-square rounded-lg overflow-hidden border-2 transition-colors bg-muted {picked === media.metadata.id ? 'border-primary ring-2 ring-primary/30' : 'border-transparent hover:border-muted-foreground/30'}"
						onclick={() => (picked = media.metadata.id)}
					>
						<img src={url} alt="" class="w-full h-full object-cover" />
						{#if picked === media.metadata.id}
							<div class="absolute inset-0 bg-primary/20 flex items-center justify-center">
								<div class="size-6 rounded-full bg-primary flex items-center justify-center">
									<Check class="size-4 text-primary-foreground" />
								</div>
							</div>
						{/if}
					</button>
				{/each}
			</div>
		{/if}

		<Dialog.Footer>
			<Button variant="outline" onclick={oncancel}>{t('btn.cancel')}</Button>
			<Button disabled={!picked} onclick={handleConfirm}>{t('btn.select')}</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
