<script lang="ts">
	import type { Snippet } from 'svelte';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import type { ButtonVariant } from '$lib/components/ui/button/button.svelte';

	interface Props {
		open: boolean;
		title: string;
		description: string;
		confirmLabel?: string;
		cancelLabel?: string;
		confirmVariant?: ButtonVariant;
		/** Optional icon/illustration rendered above the title. */
		icon?: Snippet;
		onconfirm: () => void;
		oncancel: () => void;
	}

	let {
		open = $bindable(),
		title,
		description,
		confirmLabel = 'Confirmar',
		cancelLabel = 'Cancelar',
		confirmVariant = 'destructive',
		icon,
		onconfirm,
		oncancel
	}: Props = $props();

	function handleOpenChange(v: boolean) {
		if (!v) oncancel();
	}
</script>

<Dialog.Root {open} onOpenChange={handleOpenChange}>
	<Dialog.Content class="sm:max-w-sm">
		{#if icon}
			<div class="flex justify-center pt-2 pb-1">
				{@render icon()}
			</div>
		{/if}
		<Dialog.Header class={icon ? 'text-center' : ''}>
			<Dialog.Title>{title}</Dialog.Title>
			<Dialog.Description>{description}</Dialog.Description>
		</Dialog.Header>
		<Dialog.Footer>
			<Button variant="outline" onclick={oncancel}>{cancelLabel}</Button>
			<Button variant={confirmVariant} onclick={onconfirm}>{confirmLabel}</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
