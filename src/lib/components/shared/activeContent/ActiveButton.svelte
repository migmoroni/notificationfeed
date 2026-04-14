<script lang="ts">
	import ToggleRight from '@lucide/svelte/icons/toggle-right';
	import ToggleLeft from '@lucide/svelte/icons/toggle-left';
	import { t } from '$lib/i18n/t.js';

	/**
	 * Active toggle button for Fonts.
	 *
	 * UI label: "Ativo" (active) / "Ativar" (inactive).
	 * Maps to ConsumerState.enabled in the domain.
	 *
	 * - `sm` → compact for cards (icon + short text)
	 * - `md` → detail pages (full label)
	 */
	interface Props {
		active: boolean;
		size?: 'sm' | 'md';
		onclick: (e: MouseEvent) => void;
	}

	let { active, size = 'sm', onclick }: Props = $props();
</script>

{#if size === 'sm'}
	<button
		{onclick}
		class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors
			{active
				? 'text-blue-600 dark:text-blue-400 bg-blue-500/10 hover:bg-blue-500/20'
				: 'text-muted-foreground hover:text-foreground hover:bg-muted'}"
		aria-label={active ? t('aria.deactivate') : t('aria.activate')}
	>
		{#if active}
			<ToggleRight class="size-3.5" />
			<span>{t('active.active')}</span>
		{:else}
			<ToggleLeft class="size-3.5" />
			<span>{t('active.activate')}</span>
		{/if}
	</button>
{:else}
	<button
		{onclick}
		class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors
			{active
				? 'text-blue-600 dark:text-blue-400 bg-blue-500/10 hover:bg-blue-500/20'
				: 'text-muted-foreground hover:text-foreground hover:bg-muted border border-border'}"
		aria-label={active ? t('aria.deactivate') : t('aria.activate')}
	>
		{#if active}
			<ToggleRight class="size-4" />
			<span>{t('active.active')}</span>
		{:else}
			<ToggleLeft class="size-4" />
			<span>{t('active.activate')}</span>
		{/if}
	</button>
{/if}
