<script lang="ts">
	import type { ContentMedia } from '$lib/domain/content-media/content-media.js';
	import type { ImageSlot } from '$lib/domain/shared/image-asset.js';
	import { creator } from '$lib/stores/creator.svelte.js';
	import { getMediaPreviewUrl } from '$lib/services/media.service.js';
	import { Button } from '$lib/components/ui/button/index.js';
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

	async function handleRemove() {
		if (mediaId) {
			await creator.deleteMedia(mediaId);
			onchange(undefined);
		}
	}
</script>

<div class="space-y-2">
	<span class="text-sm font-medium">{label}</span>

	{#if previewUrl}
		<div class="relative inline-block">
			{#if slot === 'avatar'}
				<div class="w-16 h-16 rounded-lg overflow-hidden bg-muted border">
					<img src={previewUrl} alt={label} class="w-full h-full object-cover" />
				</div>
			{:else}
				<div class="w-full max-w-md rounded-lg overflow-hidden bg-muted border" style="aspect-ratio: 3.6 / 1;">
					<img src={previewUrl} alt={label} class="w-full h-full object-cover" />
				</div>
			{/if}
			<Button
				variant="destructive"
				size="icon"
				class="absolute -top-2 -right-2 size-6"
				onclick={handleRemove}
			>
				<X class="size-3" />
			</Button>
		</div>
	{:else}
		<button
			type="button"
			class={[
				'flex items-center justify-center border-2 border-dashed rounded-lg cursor-pointer',
				'text-muted-foreground hover:border-primary hover:text-primary transition-colors',
				slot === 'avatar' ? 'w-16 h-16' : 'w-full max-w-md'
			].join(' ')}
			style={slot === 'banner' ? 'aspect-ratio: 3.6 / 1;' : undefined}
			disabled={loading}
			onclick={() => fileInput.click()}
		>
			{#if loading}
				<span class="text-xs animate-pulse">Processando…</span>
			{:else}
				<Upload class="size-5" />
			{/if}
		</button>
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
