<script lang="ts">
	import { browse } from '$lib/stores/browse.svelte.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import Search from '@lucide/svelte/icons/search';
	import X from '@lucide/svelte/icons/x';
	import { t } from '$lib/i18n/t.js';

	let inputValue = $state('');
	let debounceTimer: ReturnType<typeof setTimeout> | null = null;

	function handleInput(e: Event) {
		const value = (e.target as HTMLInputElement).value;
		inputValue = value;

		if (debounceTimer) clearTimeout(debounceTimer);
		debounceTimer = setTimeout(() => {
			browse.searchEntities(value);
		}, 300);
	}

	function handleClear() {
		inputValue = '';
		if (debounceTimer) clearTimeout(debounceTimer);
		browse.clearSearch();
	}
</script>

<div class="relative">
	<Search class="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
	<Input
		type="text"
		placeholder={t('browse.search_placeholder')}
		value={inputValue}
		oninput={handleInput}
		class="pl-8 pr-8 h-9 text-sm"
	/>
	{#if inputValue}
		<button
			onclick={handleClear}
			class="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
			aria-label={t('aria.clear_search')}
		>
			<X class="size-4" />
		</button>
	{/if}
</div>
