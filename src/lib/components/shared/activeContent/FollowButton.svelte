<script lang="ts">
	import Eye from '@lucide/svelte/icons/eye';
	import EyeOff from '@lucide/svelte/icons/eye-off';
	import { t } from '$lib/i18n/t.js';

	/**
	 * Follow toggle button for Profiles and Fonts.
	 *
	 * UI label: "Segue" (active) / "Seguir" (inactive).
	 * Maps to ConsumerState.enabled in the domain.
	 *
	 * - `sm` → compact for cards (icon + short text)
	 * - `md` → detail pages (full label)
	 */
	interface Props {
		following: boolean;
		size?: 'sm' | 'md';
		onclick: (e: MouseEvent) => void;
	}

	let { following, size = 'sm', onclick }: Props = $props();
</script>

{#if size === 'sm'}
	<button
		{onclick}
		class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors
			{following
				? 'text-blue-600 dark:text-blue-400 bg-blue-500/10 hover:bg-blue-500/20'
				: 'text-muted-foreground hover:text-foreground hover:bg-muted'}"
		aria-label={following ? t('aria.unfollow') : t('aria.follow')}
	>
		{#if following}
			<Eye class="size-3.5" />
			<span>{t('follow.following')}</span>
		{:else}
			<EyeOff class="size-3.5" />
			<span>{t('follow.follow')}</span>
		{/if}
	</button>
{:else}
	<button
		{onclick}
		class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors
			{following
				? 'text-blue-600 dark:text-blue-400 bg-blue-500/10 hover:bg-blue-500/20'
				: 'text-muted-foreground hover:text-foreground hover:bg-muted border border-border'}"
		aria-label={following ? t('aria.unfollow') : t('aria.follow')}
	>
		{#if following}
			<Eye class="size-4" />
			<span>{t('follow.following')}</span>
		{:else}
			<EyeOff class="size-4" />
			<span>{t('follow.follow')}</span>
		{/if}
	</button>
{/if}
