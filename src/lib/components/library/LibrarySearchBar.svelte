<script lang="ts">
	import { Input } from '$lib/components/ui/input/index.js';
	import Search from '@lucide/svelte/icons/search';
	import X from '@lucide/svelte/icons/x';
	import { t } from '$lib/i18n/t.js';

	interface Props {
		value: string;
		placeholderKey?: string;
		onchange: (v: string) => void;
	}

	let { value, placeholderKey = 'library.search_placeholder', onchange }: Props = $props();

	function handleInput(e: Event) {
		onchange((e.target as HTMLInputElement).value);
	}

	function handleClear() {
		onchange('');
	}
</script>

<div class="relative">
	<Search class="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
	<Input
		type="text"
		placeholder={t(placeholderKey)}
		{value}
		oninput={handleInput}
		class="pl-8 pr-8 h-9 text-sm"
	/>
	{#if value}
		<button
			onclick={handleClear}
			class="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
			aria-label={t('aria.clear_search')}
		>
			<X class="size-4" />
		</button>
	{/if}
</div>
