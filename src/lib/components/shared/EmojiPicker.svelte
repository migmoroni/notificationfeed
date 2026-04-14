<script lang="ts">
	import { Input } from '$lib/components/ui/input/index.js';
	import Search from '@lucide/svelte/icons/search';
	import { CATEGORIES, type EmojiEntry } from './emojis/index.js';
	import { t } from '$lib/i18n/t.js';

	interface Props {
		value?: string;
		onselect: (emoji: string) => void;
	}

	let { value = '', onselect }: Props = $props();

	let search = $state('');

	let activeCategory = $state(CATEGORIES[0].label);

	let visibleEmojis = $derived.by(() => {
		if (search.trim()) {
			const q = search.trim().toLowerCase();
			return CATEGORIES.flatMap((c) => c.emojis).filter((e) => e.name.includes(q));
		}
		const cat = CATEGORIES.find((c) => c.label === activeCategory);
		return cat?.emojis ?? [];
	});
</script>

<div class="flex flex-col gap-2">
	<!-- Category tabs -->
	<div class="flex gap-1 overflow-x-auto pb-1 scrollbar-none">
		{#each CATEGORIES as cat (cat.label)}
			<button
				type="button"
				onclick={() => { activeCategory = cat.label; search = ''; }}
				class="shrink-0 px-2 py-1 text-xs rounded-md transition-colors
					{activeCategory === cat.label && !search.trim()
					? 'bg-accent text-accent-foreground font-medium'
					: 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'}"
			>
				{cat.label}
			</button>
		{/each}
	</div>

	<!-- Search -->
	<div class="relative">
		<Search class="absolute left-2 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
		<Input
			bind:value={search}
			placeholder={t('emoji.search_placeholder')}
			class="h-8 text-xs pl-7"
		/>
	</div>

	<!-- Emoji grid -->
	<div class="grid grid-cols-8 h-48 overflow-y-auto p-0.5 rounded-md border border-border bg-muted/30">
		{#each visibleEmojis as em (em.emoji)}
			<button
				type="button"
				title={em.name}
				onclick={() => onselect(em.emoji)}
				class="flex items-center justify-center aspect-square rounded hover:bg-accent transition-colors text-3xl
					{value === em.emoji ? 'bg-accent ring-1 ring-primary' : ''}"
			>
				{em.emoji}
			</button>
		{/each}
		{#if visibleEmojis.length === 0}
			<div class="col-span-8 py-4 text-center text-xs text-muted-foreground">
				{t('emoji.not_found')}
			</div>
		{/if}
	</div>
</div>
