<script lang="ts">
	import UserCheck from '@lucide/svelte/icons/user-check';
	import UserPlus from '@lucide/svelte/icons/user-plus';
	import { t } from '$lib/i18n/t.js';

	/**
	 * Subscribe toggle button for CreatorPages.
	 *
	 * UI label: "Inscrito" (active) / "Inscrever-se" (inactive).
	 * Maps to ConsumerState.enabled in the domain.
	 *
	 * - `sm` → compact for cards (icon-only + short text)
	 * - `md` → detail pages (full label)
	 */
	interface Props {
		subscribed: boolean;
		size?: 'sm' | 'md';
		onclick: (e: MouseEvent) => void;
	}

	let { subscribed, size = 'sm', onclick }: Props = $props();
</script>

{#if size === 'sm'}
	<button
		{onclick}
		class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors
			{subscribed
				? 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20'
				: 'text-muted-foreground hover:text-foreground hover:bg-muted'}"
		aria-label={subscribed ? t('aria.unsubscribe') : t('aria.subscribe')}
	>
		{#if subscribed}
			<UserCheck class="size-3.5" />
			<span>{t('subscribe.subscribed')}</span>
		{:else}
			<UserPlus class="size-3.5" />
			<span>{t('subscribe.subscribe')}</span>
		{/if}
	</button>
{:else}
	<button
		{onclick}
		class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors
			{subscribed
				? 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20'
				: 'text-muted-foreground hover:text-foreground hover:bg-muted border border-border'}"
		aria-label={subscribed ? t('aria.unsubscribe') : t('aria.subscribe')}
	>
		{#if subscribed}
			<UserCheck class="size-4" />
			<span>{t('subscribe.subscribed')}</span>
		{:else}
			<UserPlus class="size-4" />
			<span>{t('subscribe.subscribe')}</span>
		{/if}
	</button>
{/if}
