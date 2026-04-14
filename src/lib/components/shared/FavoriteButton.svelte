<script lang="ts">
	import Star from '@lucide/svelte/icons/star';
	import StarOff from '@lucide/svelte/icons/star-off';
	import { t } from '$lib/i18n/t.js';

	/**
	 * Reusable star-toggle button for favorite state.
	 *
	 * - `sm` → size-6 container, size-4 icons (cards)
	 * - `md` → size-5 icons, no fixed container (detail pages)
	 */
	interface Props {
		favorite: boolean;
		size?: 'sm' | 'md';
		onclick: (e: MouseEvent) => void;
	}

	let { favorite, size = 'sm', onclick }: Props = $props();

	const containerClass = $derived(
		size === 'sm'
			? 'inline-flex items-center justify-center size-6 rounded transition-colors'
			: 'shrink-0 transition-colors'
	);

	const iconClass = $derived(size === 'sm' ? 'size-4' : 'size-5');
</script>

<button
	{onclick}
	class="{containerClass} {favorite ? 'text-yellow-500' : 'text-muted-foreground hover:text-foreground'}"
	aria-label={favorite ? t('aria.remove_from_favorites') : t('aria.add_to_favorites')}
>
	{#if favorite}
		<Star class="{iconClass} fill-current" />
	{:else}
		<StarOff class={iconClass} />
	{/if}
</button>
