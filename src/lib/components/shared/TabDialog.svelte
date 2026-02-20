<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import FolderPlus from '@lucide/svelte/icons/folder-plus';
	import FolderPen from '@lucide/svelte/icons/folder-pen';
	import Bookmark from '@lucide/svelte/icons/bookmark';
	import Trash2 from '@lucide/svelte/icons/trash-2';

	interface Props {
		open: boolean;
		mode: 'create' | 'edit' | 'delete';
		initialTitle?: string;
		initialEmoji?: string;
		/** Called on create/edit with (title, emoji). On delete called with no args. */
		onconfirm: (...args: any[]) => void;
		oncancel: () => void;
	}

	let {
		open = $bindable(),
		mode,
		initialTitle = '',
		initialEmoji = '',
		onconfirm,
		oncancel
	}: Props = $props();

	// ── Form state (create / edit) ─────────────────────────────────────

	let title = $state(initialTitle);
	let emoji = $state(initialEmoji);
	let titleError = $state('');
	let emojiError = $state('');

	const isForm = $derived(mode === 'create' || mode === 'edit');

	function validate(): boolean {
		titleError = '';
		emojiError = '';
		let valid = true;

		if (!emoji.trim()) {
			emojiError = 'Emoji obrigatório';
			valid = false;
		}
		if (!title.trim()) {
			titleError = 'Título obrigatório';
			valid = false;
		} else if (title.trim().length > 20) {
			titleError = 'Máximo 20 caracteres';
			valid = false;
		}

		return valid;
	}

	function handleConfirm() {
		if (isForm) {
			if (validate()) {
				onconfirm(title.trim(), emoji.trim());
			}
		} else {
			onconfirm();
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter') {
			e.preventDefault();
			handleConfirm();
		}
	}

	function handleOpenChange(v: boolean) {
		if (!v) oncancel();
	}

	// ── Per-mode config ────────────────────────────────────────────────

	const config = $derived.by(() => {
		switch (mode) {
			case 'create':
				return {
					title: 'Nova Tab',
					description: 'Crie uma tab para organizar seus favoritos.',
					confirmLabel: 'Criar',
					confirmVariant: 'default' as const,
					iconBg: 'bg-primary/10',
					iconColor: 'text-primary'
				};
			case 'edit':
				return {
					title: 'Editar Tab',
					description: 'Edite o emoji e título da tab.',
					confirmLabel: 'Salvar',
					confirmVariant: 'default' as const,
					iconBg: 'bg-accent',
					iconColor: 'text-accent-foreground'
				};
			case 'delete':
				return {
					title: 'Excluir Tab',
					description: 'Excluir esta tab de favoritos? Os itens não serão removidos, apenas a organização será perdida.',
					confirmLabel: 'Excluir',
					confirmVariant: 'destructive' as const,
					iconBg: 'bg-destructive/10',
					iconColor: 'text-destructive'
				};
		}
	});
</script>

<Dialog.Root {open} onOpenChange={handleOpenChange}>
	<Dialog.Content class="sm:max-w-sm">
		<!-- Icon -->
		<div class="flex justify-center pt-2 pb-1">
			<div class="flex items-center justify-center size-12 rounded-full {config.iconBg}">
				{#if mode === 'create'}
					<FolderPlus class="size-6 {config.iconColor}" />
				{:else if mode === 'edit'}
					<FolderPen class="size-6 {config.iconColor}" />
				{:else}
					<div class="relative">
						<Bookmark class="size-6 {config.iconColor}/60" />
						<Trash2 class="size-3.5 {config.iconColor} absolute -bottom-1 -right-1.5" />
					</div>
				{/if}
			</div>
		</div>

		<Dialog.Header class="text-center">
			<Dialog.Title>{config.title}</Dialog.Title>
			<Dialog.Description>{config.description}</Dialog.Description>
		</Dialog.Header>

		<!-- Form fields (create / edit only) -->
		{#if isForm}
			<div class="flex flex-col gap-4 py-4">
				<div class="flex gap-3">
					<!-- Emoji field -->
					<div class="flex flex-col gap-1.5 w-20">
						<label for="tab-emoji" class="text-sm font-medium">Emoji</label>
						<Input
							id="tab-emoji"
							bind:value={emoji}
							placeholder="📚"
							class="text-center text-lg h-10"
							maxlength={2}
							onkeydown={handleKeydown}
						/>
						{#if emojiError}
							<p class="text-xs text-destructive">{emojiError}</p>
						{/if}
					</div>

					<!-- Title field -->
					<div class="flex flex-col gap-1.5 flex-1">
						<label for="tab-title" class="text-sm font-medium">Título</label>
						<Input
							id="tab-title"
							bind:value={title}
							placeholder="Estudos"
							class="h-10"
							maxlength={20}
							onkeydown={handleKeydown}
						/>
						{#if titleError}
							<p class="text-xs text-destructive">{titleError}</p>
						{/if}
					</div>
				</div>
			</div>
		{/if}

		<Dialog.Footer>
			<Button variant="outline" onclick={oncancel}>Cancelar</Button>
			<Button variant={config.confirmVariant} onclick={handleConfirm}>
				{config.confirmLabel}
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
