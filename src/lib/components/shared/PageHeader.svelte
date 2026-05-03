<script lang="ts">
	import NotificationBell from '$lib/components/notifications/NotificationBell.svelte';
	import type { Snippet } from 'svelte';

	interface Props {
		title: string;
		subtitle?: string | null;
		prefix?: Snippet;
		actions?: Snippet;
		bottomRow?: Snippet;
	}

	let { title, subtitle = null, prefix, actions, bottomRow }: Props = $props();
</script>

<header class="flex flex-col mb-4 space-y-4">
	<!-- Top Row -->
	<div class="flex items-center justify-between min-h-9">
		<div class="flex items-center gap-3 min-w-0 pr-4">
			{#if prefix}
				{@render prefix()}
			{/if}
			<h1 class="text-xl font-bold shrink-0">{title}</h1>
			{#if subtitle}
				<span class="text-xs text-muted-foreground truncate hidden sm:inline">
					{subtitle}
				</span>
			{/if}
		</div>

		<div class="flex items-center gap-3 shrink-0">
			{#if actions}
				{@render actions()}
			{/if}
			<NotificationBell />
		</div>
	</div>

	<!-- Bottom Row -->
	{#if bottomRow}
		<div class="flex items-center w-full">
			{@render bottomRow()}
		</div>
	{/if}
</header>
