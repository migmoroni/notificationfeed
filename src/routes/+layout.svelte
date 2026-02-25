<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	import { layout, initLayout } from '$lib/stores/layout.svelte.js';
	import { activeUser } from '$lib/stores/active-user.svelte.js';
	import { consumer } from '$lib/stores/consumer.svelte.js';
	import { creator } from '$lib/stores/creator.svelte.js';
	import { feed } from '$lib/stores/feed.svelte.js';
	import { hasMockData, seedMockData } from '$lib/utils/mock-data.js';
	import { seedCategories } from '$lib/persistence/category-seed.service.js';
	import Newspaper from '@lucide/svelte/icons/newspaper';
	import Search from '@lucide/svelte/icons/search';
	import Star from '@lucide/svelte/icons/star';
	import CircleUser from '@lucide/svelte/icons/circle-user';
	import FileStack from '@lucide/svelte/icons/file-stack';
	import Eye from '@lucide/svelte/icons/eye';

	let { children } = $props();

	let ready = $state(false);

	const consumerNav = [
		{ href: '/', label: 'Feed', icon: Newspaper },
		{ href: '/browse', label: 'Browse', icon: Search },
		{ href: '/favorites', label: 'Favoritos', icon: Star },
		{ href: '/user', label: 'User', icon: CircleUser }
	] as const;

	const creatorNav = [
		{ href: '/pages', label: 'Pages', icon: FileStack },
		{ href: '/preview', label: 'Preview', icon: Eye },
		{ href: '/user', label: 'User', icon: CircleUser }
	] as const;

	let navItems = $derived(activeUser.isCreator ? creatorNav : consumerNav);

	function isActive(href: string): boolean {
		const path = page.url.pathname;
		return href === '/' ? path === '/' : path.startsWith(href);
	}

	onMount(() => {
		const layoutCleanup = initLayout();

		// Initialize data stores (seed categories → active user → consumer → mock → feed)
		// Must complete before child routes read from IndexedDB.
		(async () => {
			await seedCategories();
			await activeUser.init();
			await consumer.init();

			// After consumer.init(), sync the active user identity
			if (consumer.user) {
				activeUser.setActive(consumer.user);
			}

			if (!(await hasMockData())) {
				await seedMockData();
			}

			await feed.loadFeed();

			// Initialize creator store if a creator user exists
			const creators = activeUser.creators;
			if (creators.length > 0) {
				await creator.init(creators[0]);
			}

			ready = true;
		})();

		return () => {
			layoutCleanup();
		};
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
				{#each navItems as item}
					<a
						href={item.href}
						class="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors {isActive(item.href)
							? 'bg-sidebar-accent text-sidebar-accent-foreground'
							: 'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'}"
					>
						<item.icon class="size-5" />
						{item.label}
					</a>
				{/each}
			</nav>
		</aside>

		<main class="flex-1 overflow-y-auto">
			{#if ready}
				{@render children()}
			{:else}
				<div class="flex items-center justify-center h-full">
					<div class="animate-pulse text-sm text-muted-foreground">Carregando…</div>
				</div>
			{/if}
		</main>
	{:else}
		<!-- COMPACT: full-width content + fixed bottom navigation -->
		<div class="flex flex-col w-full h-full">
			<main class="flex-1 overflow-y-auto">
				{#if ready}
					{@render children()}
				{:else}
					<div class="flex items-center justify-center h-full">
						<div class="animate-pulse text-sm text-muted-foreground">Carregando…</div>
					</div>
				{/if}
			</main>

			<nav
				class="shrink-0 flex items-center justify-around border-t border-border bg-background"
				style="height: 56px; padding-bottom: env(safe-area-inset-bottom);"
			>
				{#each navItems as item}
					<a
						href={item.href}
						class="flex flex-col items-center justify-center gap-0.5 py-1 text-xs {isActive(item.href)
							? 'text-foreground'
							: 'text-muted-foreground'}"
					>
						<item.icon class="size-6" />
						{item.label}
					</a>
				{/each}
			</nav>
		</div>
	{/if}
</div>
