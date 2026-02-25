<script lang="ts">
	import type { ImageAsset, ImageSlot } from '$lib/domain/shared/image-asset.js';
	import { processImage, createImagePreviewUrl } from '$lib/services/image.service.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import Upload from '@lucide/svelte/icons/upload';
	import X from '@lucide/svelte/icons/x';

	interface Props {
		slot: ImageSlot;
		value: ImageAsset | null;
		onchange: (asset: ImageAsset | null) => void;
		label?: string;
	}

	let { slot, value, onchange, label = slot === 'avatar' ? 'Avatar' : 'Banner' }: Props = $props();

	let loading = $state(false);
	let error = $state<string | null>(null);
	let fileInput: HTMLInputElement;

	let previewUrl = $derived(value ? createImagePreviewUrl(value) : null);

	async function handleFileSelect(e: Event) {
		const input = e.target as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;

		loading = true;
		error = null;

		try {
			const asset = await processImage(file, slot);
			onchange(asset);
		} catch (err) {
			error = (err as Error).message;
		} finally {
			loading = false;
			input.value = '';
		}
	}

	function handleRemove() {
		onchange(null);
	}
</script>

<div class="space-y-2">
	<span class="text-sm font-medium">{label}</span>

	{#if previewUrl}
		<div class="relative inline-block">
			<img
				src={previewUrl}
				alt={label}
				class={slot === 'avatar'
					? 'size-20 rounded-full object-cover border'
					: 'h-24 w-full max-w-md rounded-lg object-cover border'}
			/>
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
				slot === 'avatar' ? 'size-20 rounded-full' : 'h-24 w-full max-w-md'
			].join(' ')}
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
