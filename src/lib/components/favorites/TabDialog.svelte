<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';

	interface Props {
		mode: 'create' | 'edit';
		initialTitle?: string;
		initialEmoji?: string;
		onconfirm: (title: string, emoji: string) => void;
		oncancel: () => void;
	}

	let { mode, initialTitle = '', initialEmoji = '', onconfirm, oncancel }: Props = $props();

	let title = $state(initialTitle);
	let emoji = $state(initialEmoji);
	let titleError = $state('');
	let emojiError = $state('');

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
		if (validate()) {
			onconfirm(title.trim(), emoji.trim());
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter') {
			e.preventDefault();
			handleConfirm();
		}
	}
</script>

<Dialog.Root open={true} onOpenChange={(open) => { if (!open) oncancel(); }}>
	<Dialog.Content class="sm:max-w-sm">
		<Dialog.Header>
			<Dialog.Title>{mode === 'create' ? 'Nova Tab' : 'Editar Tab'}</Dialog.Title>
			<Dialog.Description>
				{mode === 'create' ? 'Crie uma tab para organizar seus favoritos.' : 'Edite o emoji e título da tab.'}
			</Dialog.Description>
		</Dialog.Header>

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

		<Dialog.Footer>
			<Button variant="outline" onclick={oncancel}>Cancelar</Button>
			<Button onclick={handleConfirm}>
				{mode === 'create' ? 'Criar' : 'Salvar'}
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
