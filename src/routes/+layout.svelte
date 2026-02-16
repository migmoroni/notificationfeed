<script lang="ts">
	import { onMount } from 'svelte';
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	import { layout, initLayout } from '$lib/stores/layout.svelte.js';

	let { children } = $props();

	onMount(() => {
		const cleanup = initLayout();
		return cleanup;
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<div class="flex h-dvh w-full overflow-hidden bg-background text-foreground">
	{#if layout.isExpanded}
		<!-- EXPANDED: fixed sidebar + scrollable main content -->
		<aside
			class="flex flex-col w-64 shrink-0 border-r border-border bg-sidebar text-sidebar-foreground"
		>
			<div class="p-4 border-b border-sidebar-border">
				<span class="text-lg font-bold tracking-tight">Notfeed</span>
			</div>
			<nav class="flex flex-col gap-1 p-3">
				<a
					href="/"
					class="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
				>
					<span class="text-base" aria-hidden="true">📰</span>
					Feed
				</a>
				<a
					href="/browse"
					class="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
				>
					<span class="text-base" aria-hidden="true">🔍</span>
					Browse
				</a>
				<a
					href="/favorites"
					class="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
				>
					<span class="text-base" aria-hidden="true">⭐</span>
					Favorites
				</a>
				<a
					href="/settings"
					class="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
				>
					<span class="text-base" aria-hidden="true">⚙️</span>
					Settings
				</a>
			</nav>
		</aside>

		<main class="flex-1 overflow-y-auto">
			{@render children()}
		</main>
	{:else}
		<!-- COMPACT: full-width content + fixed bottom navigation -->
		<div class="flex flex-col w-full h-full">
			<main class="flex-1 overflow-y-auto">
				{@render children()}
			</main>

			<nav
				class="shrink-0 flex items-center justify-around border-t border-border bg-background"
				style="height: 56px; padding-bottom: env(safe-area-inset-bottom);"
			>
				<a
					href="/"
					class="flex flex-col items-center justify-center gap-0.5 py-1 text-xs text-muted-foreground"
				>
					<span class="text-lg" aria-hidden="true">📰</span>
					Feed
				</a>
				<a
					href="/browse"
					class="flex flex-col items-center justify-center gap-0.5 py-1 text-xs text-muted-foreground"
				>
					<span class="text-lg" aria-hidden="true">🔍</span>
					Browse
				</a>
				<a
					href="/favorites"
					class="flex flex-col items-center justify-center gap-0.5 py-1 text-xs text-muted-foreground"
				>
					<span class="text-lg" aria-hidden="true">⭐</span>
					Favorites
				</a>
				<a
					href="/settings"
					class="flex flex-col items-center justify-center gap-0.5 py-1 text-xs text-muted-foreground"
				>
					<span class="text-lg" aria-hidden="true">⚙️</span>
					Settings
				</a>
			</nav>
		</div>
	{/if}
</div>
