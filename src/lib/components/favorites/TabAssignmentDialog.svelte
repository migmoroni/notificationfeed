<script lang="ts">
	import { t } from '$lib/i18n/t.js';
	import { favorites } from '$lib/stores/favorites.svelte.js';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import Check from '@lucide/svelte/icons/check';
	import Minus from '@lucide/svelte/icons/minus';

	interface Props {
		onclose: () => void;
	}

	let { onclose }: Props = $props();

	// For each custom tab, compute whether all/some/none of the selected items belong to it
	let tabStates = $derived.by(() => {
		const selectedIds = [...favorites.selectedItemIds];
		const selectedItems = favorites.items.filter((i) => selectedIds.includes(i.activation.nodeId));

		return favorites.customTabs.map((tab) => {
			const inTab = selectedItems.filter((i) => i.tabIds.includes(tab.id));
			const allIn = inTab.length === selectedItems.length && selectedItems.length > 0;
			const someIn = inTab.length > 0 && inTab.length < selectedItems.length;
			return { tab, allIn, someIn };
		});
	});

	async function handleToggleTab(tabId: string, currentlyAllIn: boolean) {
		const selectedIds = [...favorites.selectedItemIds];

		if (currentlyAllIn) {
			// Remove all selected items from this tab
			await favorites.removeItemsFromTab(selectedIds, tabId);
		} else {
			// Add all selected items to this tab
			await favorites.addItemsToTabs(selectedIds, [tabId]);
		}
	}
</script>

<Dialog.Root open={true} onOpenChange={(open) => { if (!open) onclose(); }}>
	<Dialog.Content class="sm:max-w-sm">
		<Dialog.Header>
			<Dialog.Title>{t('favorites.organize_tabs')}</Dialog.Title>
			<Dialog.Description>
				Selecione as tabs para os {favorites.selectedCount} item(s) selecionado(s).
			</Dialog.Description>
		</Dialog.Header>

		<div class="flex flex-col gap-1 py-4">
			{#if tabStates.length === 0}
				<p class="text-sm text-muted-foreground py-4 text-center">
					Nenhuma tab personalizada. Crie uma primeiro.
				</p>
			{:else}
				{#each tabStates as { tab, allIn, someIn } (tab.id)}
					<button
						onclick={() => handleToggleTab(tab.id, allIn)}
						class="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors hover:bg-accent hover:text-accent-foreground"
					>
						<!-- Checkbox state -->
						<div
							class="flex items-center justify-center size-5 rounded border transition-colors
								{allIn
								? 'bg-primary border-primary text-primary-foreground'
								: someIn
									? 'bg-primary/50 border-primary text-primary-foreground'
									: 'border-muted-foreground/40'}"
						>
							{#if allIn}
								<Check class="size-3" />
							{:else if someIn}
								<Minus class="size-3" />
							{/if}
						</div>

						<span class="text-base">{tab.emoji}</span>
						<span class="truncate">{tab.title}</span>
					</button>
				{/each}
			{/if}
		</div>

		<Dialog.Footer>
			<Button onclick={onclose}>{t('btn.close')}</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
