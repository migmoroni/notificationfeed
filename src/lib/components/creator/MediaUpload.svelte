<script lang="ts">
	import type { ContentMedia } from '$lib/domain/content-media/content-media.js';
	import type { ImageSlot } from '$lib/domain/shared/image-asset.js';
	import { creator } from '$lib/stores/creator.svelte.js';
	import { getMediaPreviewUrl } from '$lib/services/media.service.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import ConfirmRemoveMediaDialog from '$lib/components/shared/dialog/ConfirmRemoveMediaDialog.svelte';
	import MediaPickerDialog from '$lib/components/shared/dialog/MediaPickerDialog.svelte';
	import Upload from '@lucide/svelte/icons/upload';
	import X from '@lucide/svelte/icons/x';

	interface Props {
		slot: ImageSlot;
		mediaId: string | undefined;
		onchange: (mediaId: string | undefined) => void;
		label?: string;
	}

	let { slot, mediaId, onchange, label = slot === 'avatar' ? 'Avatar' : 'Banner' }: Props = $props();

	let loading = $state(false);
	let error = $state<string | null>(null);
	let fileInput: HTMLInputElement;
	let showRemoveDialog = $state(false);
	let showMediaPicker = $state(false);

	let media = $derived(mediaId ? creator.getMediaById(mediaId) : null);
	let previewUrl = $derived(media ? getMediaPreviewUrl(media) : null);

	async function handleFileSelect(e: Event) {
		const input = e.target as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;

		loading = true;
		error = null;

		try {
			if (mediaId) {
				// Replace existing media
				const updated = await creator.updateMedia(mediaId, file, slot);
				onchange(updated.metadata.id);
			} else {
				// Create new media
				const created = await creator.createMedia(file, slot);
				onchange(created.metadata.id);
			}
		} catch (err) {
			error = (err as Error).message;
		} finally {
			loading = false;
			input.value = '';
		}
	}

	function requestRemove() {
		showRemoveDialog = true;
	}

	function handleRemove() {
		showRemoveDialog = false;
		onchange(undefined);
	}
</script>

<div class="space-y-1.5">
	<span class="text-sm font-medium">{label}</span>

	{#if previewUrl}
		<div class="space-y-2">
			<div class="w-full max-w-md rounded-lg overflow-hidden bg-muted border" style="aspect-ratio: 3.6 / 1;">
				<img src={previewUrl} alt={label} class="w-full h-full object-cover" />
			</div>
			<div class="flex gap-2">
				<Button variant="outline" size="sm" onclick={() => (showMediaPicker = true)}>
					Trocar
				</Button>
				<Button variant="ghost" size="sm" class="text-destructive hover:text-destructive" onclick={requestRemove}>
					Remover
				</Button>
			</div>
		</div>
	{:else}
		<button
			type="button"
			class="flex flex-col items-center justify-center gap-1 w-full max-w-md border-2 border-dashed rounded-lg cursor-pointer text-muted-foreground hover:border-primary hover:text-primary transition-colors"
			style="aspect-ratio: 3.6 / 1;"
			disabled={loading}
			onclick={() => fileInput.click()}
		>
			{#if loading}
				<span class="text-xs animate-pulse">Processando…</span>
			{:else}
				<Upload class="size-5" />
				<span class="text-[11px]">Clique para enviar</span>
			{/if}
		</button>
		<Button variant="outline" size="sm" onclick={() => (showMediaPicker = true)}>
			Biblioteca
		</Button>
	{/if}

	<input
		bind:this={fileInput}
		type="file"
		accept="image/png,image/jpeg,image/gif,image/webp,image/svg+xml"
		class="hidden"
		onchange={handleFileSelect}
	/>

	{#if error}
		<p class="text-xs text-destructive">{error}</p>
	{/if}
</div>

<ConfirmRemoveMediaDialog
	bind:open={showRemoveDialog}
	previewUrl={previewUrl}
	mediaLabel={slot === 'banner' ? 'banner' : 'avatar'}
	onconfirm={handleRemove}
	oncancel={() => (showRemoveDialog = false)}
/>

<MediaPickerDialog
	bind:open={showMediaPicker}
	selectedId={mediaId}
	onselect={(media) => {
		showMediaPicker = false;
		onchange(media.metadata.id);
	}}
	oncancel={() => (showMediaPicker = false)}
/>
