<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import Trash2 from '@lucide/svelte/icons/trash-2';

	interface Props {
		open: boolean;
		/** Display name of the user — must be typed to confirm. */
		displayName: string;
		onconfirm: () => void;
		oncancel: () => void;
	}

	let { open = $bindable(), displayName, onconfirm, oncancel }: Props = $props();

	let typedName = $state('');
	let canConfirm = $derived(typedName.trim() === displayName.trim());

	function handleOpenChange(v: boolean) {
		if (!v) {
			typedName = '';
			oncancel();
		}
	}

	function handleConfirm() {
		if (!canConfirm) return;
		typedName = '';
		onconfirm();
	}

	$effect(() => {
		if (open) typedName = '';
	});
</script>

<Dialog.Root {open} onOpenChange={handleOpenChange}>
	<Dialog.Content class="sm:max-w-sm">
		<div class="flex justify-center pt-2 pb-1">
			<div class="flex items-center justify-center size-12 rounded-full bg-destructive/10">
				<Trash2 class="size-6 text-destructive" />
			</div>
		</div>

		<Dialog.Header class="text-center">
			<Dialog.Title>Remover Usuário</Dialog.Title>
			<Dialog.Description class="text-sm text-muted-foreground leading-relaxed">
				O usuário será marcado como removido. Você poderá restaurá-lo depois.
			</Dialog.Description>
		</Dialog.Header>

		<div class="space-y-2 py-2">
			<p class="text-sm text-muted-foreground">
				Para confirmar, digite o nome do usuário:
			</p>
			<div class="rounded-md bg-muted px-3 py-2 text-sm font-medium select-all">
				{displayName}
			</div>
			<Input
				bind:value={typedName}
				placeholder="Digite o nome do usuário"
				onkeydown={(e: KeyboardEvent) => { if (e.key === 'Enter' && canConfirm) handleConfirm(); }}
			/>
		</div>

		<Dialog.Footer>
			<Button variant="outline" onclick={() => { typedName = ''; oncancel(); }}>
				Cancelar
			</Button>
			<Button
				variant="destructive"
				disabled={!canConfirm}
				onclick={handleConfirm}
			>
				<Trash2 class="size-4 mr-1.5" />
				Remover
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
