<script lang="ts">
	import { creator } from '$lib/stores/creator.svelte.js';
	import { getMediaPreviewUrl } from '$lib/services/media.service.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import EmojiPicker from '$lib/components/shared/EmojiPicker.svelte';
	import ConfirmRemoveMediaDialog from '$lib/components/shared/dialog/ConfirmRemoveMediaDialog.svelte';
	import MediaPickerDialog from '$lib/components/shared/dialog/MediaPickerDialog.svelte';
	import Upload from '@lucide/svelte/icons/upload';
	import X from '@lucide/svelte/icons/x';
	import Image from '@lucide/svelte/icons/image';
	import Smile from '@lucide/svelte/icons/smile';
	import { t } from '$lib/i18n/t.js';

	interface Props {
		mediaId: string | undefined;
		emoji: string | undefined;
		onchange: (value: { mediaId: string | undefined; emoji: string | undefined }) => void;
	}

	let { mediaId, emoji, onchange }: Props = $props();

	type AvatarMode = 'image' | 'emoji';
	let mode = $state<AvatarMode>(emoji ? 'emoji' : 'image');
	let showEmojiDialog = $state(false);
	let pendingEmoji = $state(emoji ?? '');
	let showRemoveDialog = $state(false);
	let showMediaPicker = $state(false);

	let loading = $state(false);
	let error = $state<string | null>(null);
	let fileInput: HTMLInputElement;

	let media = $derived(mediaId ? creator.getMediaById(mediaId) : null);
	let previewUrl = $derived(media ? getMediaPreviewUrl(media) : null);

	function switchMode(m: AvatarMode) {
		mode = m;
	}

	function openEmojiDialog() {
		pendingEmoji = emoji ?? '';
		showEmojiDialog = true;
	}

	function confirmEmoji() {
		if (!pendingEmoji) return;
		showEmojiDialog = false;
		onchange({ mediaId: undefined, emoji: pendingEmoji });
	}

	async function handleFileSelect(e: Event) {
		const input = e.target as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;

		loading = true;
		error = null;

		try {
			let newId: string;
			if (mediaId) {
				const updated = await creator.updateMedia(mediaId, file, 'avatar');
				newId = updated.metadata.id;
			} else {
				const created = await creator.createMedia(file, 'avatar');
				newId = created.metadata.id;
			}
			onchange({ mediaId: newId, emoji: undefined });
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
		onchange({ mediaId: undefined, emoji: undefined });
	}
</script>

<div class="space-y-3">
	<!-- Mode tabs -->
	<div class="flex items-center gap-1 rounded-md bg-muted p-0.5 w-fit">
		<button
			type="button"
			class="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded transition-colors {mode === 'image' ? 'bg-background shadow-sm font-medium text-foreground' : 'text-muted-foreground hover:text-foreground'}"
			onclick={() => switchMode('image')}
		>
			<Image class="size-3.5" />
			Imagem
		</button>
		<button
			type="button"
			class="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded transition-colors {mode === 'emoji' ? 'bg-background shadow-sm font-medium text-foreground' : 'text-muted-foreground hover:text-foreground'}"
			onclick={() => switchMode('emoji')}
		>
			<Smile class="size-3.5" />
			Emoji
		</button>
	</div>

	{#if mode === 'image'}
		<div class="flex items-center gap-4">
			{#if previewUrl && !emoji}
				<div class="w-18 h-18 rounded-lg overflow-hidden bg-muted border shrink-0">
					<img src={previewUrl} alt="Avatar" class="w-full h-full object-cover" />
				</div>
				<div class="flex flex-col gap-1">
					<Button variant="outline" size="sm" onclick={() => (showMediaPicker = true)}>
						Trocar
					</Button>
					<Button variant="ghost" size="sm" class="text-destructive hover:text-destructive" onclick={requestRemove}>
						Remover
					</Button>
				</div>
			{:else}
				<button
					type="button"
					class="flex flex-col items-center justify-center gap-1 w-[72px] h-[72px] border-2 border-dashed rounded-lg cursor-pointer text-muted-foreground hover:border-primary hover:text-primary transition-colors shrink-0"
					disabled={loading}
					onclick={() => fileInput.click()}
				>
					{#if loading}
						<span class="text-[10px] animate-pulse">…</span>
					{:else}
						<Upload class="size-5" />
						<span class="text-[10px]">{t('avatar_picker.upload')}</span>
					{/if}
				</button>
				<Button variant="outline" size="sm" onclick={() => (showMediaPicker = true)}>
					Biblioteca
				</Button>
			{/if}
		</div>

		<input
			bind:this={fileInput}
			type="file"
			accept="image/png,image/jpeg,image/gif,image/webp,image/svg+xml"
			class="hidden"
			onchange={handleFileSelect}
		/>
	{:else}
		<div class="flex items-center gap-4">
			{#if emoji}
				<div class="w-18 h-18 rounded-lg border bg-muted flex items-center justify-center text-4xl shrink-0">
					{emoji}
				</div>
			{:else}
				<div class="w-18 h-18 rounded-lg border-2 border-dashed flex items-center justify-center text-muted-foreground shrink-0">
					<Smile class="size-6" />
				</div>
			{/if}
			<div class="flex flex-col gap-1">
				<Button variant="outline" size="sm" onclick={openEmojiDialog}>
					{emoji ? 'Trocar' : 'Escolher'}
				</Button>
				{#if emoji}
					<Button variant="ghost" size="sm" class="text-destructive hover:text-destructive" onclick={requestRemove}>
						Remover
					</Button>
				{/if}
			</div>
		</div>
	{/if}

	{#if error}
		<p class="text-xs text-destructive">{error}</p>
	{/if}
</div>

<!-- Remove confirmation dialog -->
<ConfirmRemoveMediaDialog
	bind:open={showRemoveDialog}
	previewUrl={mode === 'image' ? previewUrl : null}
	emoji={mode === 'emoji' ? emoji : null}
	mediaLabel={mode === 'image' ? 'avatar' : 'emoji'}
	onconfirm={handleRemove}
	oncancel={() => (showRemoveDialog = false)}
/>

<!-- Media picker dialog -->
<MediaPickerDialog
	bind:open={showMediaPicker}
	selectedId={mediaId}
	onselect={(media) => {
		showMediaPicker = false;
		onchange({ mediaId: media.metadata.id, emoji: undefined });
	}}
	oncancel={() => (showMediaPicker = false)}
/>

<!-- Emoji picker dialog -->
<Dialog.Root bind:open={showEmojiDialog}>
	<Dialog.Content class="sm:max-w-fit">
		<div class="flex justify-center pt-2 pb-1">
			<div class="flex items-center justify-center size-12 rounded-full bg-primary/10">
				<Smile class="size-6 text-primary" />
			</div>
		</div>
		<Dialog.Header class="text-center">
			<Dialog.Title>{t('avatar_picker.choose_emoji')}</Dialog.Title>
			<Dialog.Description>{t('avatar_picker.choose_emoji_description')}</Dialog.Description>
		</Dialog.Header>

		<div class="flex flex-col gap-4 py-4">
			<div class="flex items-center justify-center">
				<div class="w-16 h-16 rounded-lg border bg-muted flex items-center justify-center text-4xl">
					{pendingEmoji || '?'}
				</div>
			</div>
			<EmojiPicker value={pendingEmoji} onselect={(e) => (pendingEmoji = e)} />
		</div>

		<Dialog.Footer>
			<Button variant="outline" onclick={() => (showEmojiDialog = false)}>{t('btn.cancel')}</Button>
			<Button disabled={!pendingEmoji} onclick={confirmEmoji}>{t('btn.confirm')}</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
