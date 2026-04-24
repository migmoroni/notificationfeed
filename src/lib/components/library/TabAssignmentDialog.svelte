<script lang="ts">
	import { t } from '$lib/i18n/t.js';
	import { library } from '$lib/stores/library.svelte.js';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import Check from '@lucide/svelte/icons/check';
	import Minus from '@lucide/svelte/icons/minus';
	import Search from '@lucide/svelte/icons/search';

	interface Props {
		onclose: () => void;
	}

	let { onclose }: Props = $props();

	let search = $state('');

	// For each custom tab, compute whether all/some/none of the selected items belong to it
	let tabStates = $derived.by(() => {
		const selectedIds = [...library.selectedItemIds];
		const selectedItems = library.items.filter((i) => selectedIds.includes(i.activation.nodeId));

		return library.customTabs.map((tab) => {
			const inTab = selectedItems.filter((i) => i.tabIds.includes(tab.id));
			const allIn = inTab.length === selectedItems.length && selectedItems.length > 0;
			const someIn = inTab.length > 0 && inTab.length < selectedItems.length;
			return { tab, allIn, someIn };
		});
	});

	let filteredTabStates = $derived.by(() => {
		const q = search.trim().toLowerCase();
		if (!q) return tabStates;
		return tabStates.filter(({ tab }) => tab.title.toLowerCase().includes(q));
	});

	async function handleToggleTab(tabId: string, currentlyAllIn: boolean) {
		const selectedIds = [...library.selectedItemIds];

		if (currentlyAllIn) {
			// Remove all selected items from this tab
			await library.removeItemsFromTab(selectedIds, tabId);
		} else {
			// Add all selected items to this tab
			await library.addItemsToTabs(selectedIds, [tabId]);
		}
	}
</script>

<Dialog.Root open={true} onOpenChange={(open) => { if (!open) onclose(); }}>
	<Dialog.Content class="sm:max-w-fit">
		<Dialog.Header>
			<Dialog.Title>{t('library.organize_tabs')}</Dialog.Title>
			<Dialog.Description>
				{t('library.organize_tabs_description', { count: library.selectedCount })}
			</Dialog.Description>
		</Dialog.Header>

		<div class="pt-2">
			<div class="relative">
				<Search class="absolute left-2 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
				<Input
					bind:value={search}
					placeholder={t('library.organize_tabs_search_placeholder')}
					class="h-8 text-xs pl-7"
				/>
			</div>
		</div>

		<div class="grid grid-cols-2 gap-1 py-4 w-lg h-72 overflow-y-auto pr-1 content-start">
			{#if tabStates.length === 0}
				<p class="col-span-2 text-sm text-muted-foreground py-4 text-center">
					{t('library.organize_tabs_empty')}
				</p>
			{:else if filteredTabStates.length === 0}
				<p class="col-span-2 text-sm text-muted-foreground py-4 text-center">
					{t('library.organize_tabs_no_results')}
				</p>
			{:else}
				{#each filteredTabStates as { tab, allIn, someIn } (tab.id)}
					<button
						onclick={() => handleToggleTab(tab.id, allIn)}
						class="flex w-full min-w-0 items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors hover:bg-accent hover:text-accent-foreground"
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
