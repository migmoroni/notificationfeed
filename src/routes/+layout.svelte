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
	import { sidebarSlot } from '$lib/stores/sidebar-slot.svelte.js';
	import { createImagePreviewUrl } from '$lib/services/image.service.js';
	import { t, initLanguage, setLanguage } from '$lib/i18n/index.js';
	import Newspaper from '@lucide/svelte/icons/newspaper';
	import Search from '@lucide/svelte/icons/search';
	import LibraryBig from '@lucide/svelte/icons/library-big';
	import CircleUser from '@lucide/svelte/icons/circle-user';
	import FileStack from '@lucide/svelte/icons/file-stack';
	import Eye from '@lucide/svelte/icons/eye';

	let { children } = $props();

	let ready = $state(false);

	const consumerNav = [
		{ href: '/', labelKey: 'nav.feed', icon: Newspaper },
		{ href: '/browse', labelKey: 'nav.browse', icon: Search },
		{ href: '/library', labelKey: 'nav.library', icon: LibraryBig },
		{ href: '/user', labelKey: 'nav.user', icon: CircleUser }
	] as const;

	const creatorNav = [
		{ href: '/pages', labelKey: 'nav.pages', icon: FileStack },
		{ href: '/preview', labelKey: 'nav.preview', icon: Eye },
		{ href: '/user', labelKey: 'nav.user', icon: CircleUser }
	] as const;

	let navItems = $derived(activeUser.isCreator ? creatorNav : consumerNav);

	let userNavLabel = $derived(activeUser.current?.displayName ?? 'User');
	let userAvatarUrl = $derived(
		activeUser.current?.profileImage ? createImagePreviewUrl(activeUser.current.profileImage) : null
	);
	let userEmoji = $derived(activeUser.current?.profileEmoji ?? null);

	function isActive(href: string): boolean {
		const path = page.url.pathname;
		return href === '/' ? path === '/' : path.startsWith(href);
	}

	onMount(() => {
		const layoutCleanup = initLayout();

		// Initialize data stores (seed categories → active user → role-specific stores → mock → feed)
		// Must complete before child routes read from IndexedDB.
		(async () => {
			await seedCategories();
			await activeUser.init();

			// Initialize i18n language from user preference
			const detectedLang = initLanguage(activeUser.current?.language);
			// Persist detected language if user has none saved
			if (activeUser.current && !activeUser.current.language) {
				await activeUser.setLanguage(activeUser.current.id, detectedLang);
			}

			// Always init consumer (needed for feed data even when creator is active)
			await consumer.init(activeUser.current?.role === 'consumer' ? activeUser.current.id : undefined);

			// If restored user is a creator, init creator store
			if (activeUser.isCreator) {
				await creator.init(activeUser.current as any);
			} else {
				// Consumer flow: sync identity
				if (consumer.user) {
					activeUser.setActive(consumer.user);
				}
			}

			if (!(await hasMockData())) {
				await seedMockData();
			}

			await feed.loadFeed();

			// Pre-load creator store if creators exist but active user is consumer
			if (!activeUser.isCreator) {
				const creators = activeUser.creators;
				if (creators.length > 0) {
					await creator.init(creators[0]);
				}
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
			class="flex flex-col w-73.75 shrink-0 border-r border-border bg-sidebar text-sidebar-foreground"
		>
			<div class="p-4 border-b border-sidebar-border">
				<span class="text-lg font-bold tracking-tight">Notfeed</span>
			</div>
			<nav class="flex flex-col gap-1 p-3">
				{#each navItems as item}
					<a
						href={item.href}
						class="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors min-w-0 {isActive(item.href)
							? 'bg-sidebar-accent text-sidebar-accent-foreground'
							: 'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'}"
					>
						{#if item.href === '/user' && userAvatarUrl}
							<img src={userAvatarUrl} alt="" class="size-5 rounded-full object-cover shrink-0" />
						{:else if item.href === '/user' && userEmoji}
							<span class="text-base leading-none shrink-0">{userEmoji}</span>
						{:else}
							<item.icon class="size-5 shrink-0" />
						{/if}
						<span class="truncate">{item.href === '/user' ? userNavLabel : t(item.labelKey)}</span>
					</a>
				{/each}
			</nav>

			{#if sidebarSlot.snippet}
				<div class="flex-1 min-h-0 min-w-0 overflow-hidden border-t border-sidebar-border">
					{@render sidebarSlot.snippet()}
				</div>
			{/if}
		</aside>

		<main class="flex-1 overflow-y-auto">
			{#if ready}
				{@render children()}
			{:else}
				<div class="flex items-center justify-center h-full">
					<div class="animate-pulse text-sm text-muted-foreground">{t('app.loading')}</div>
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
						<div class="animate-pulse text-sm text-muted-foreground">{t('app.loading')}</div>
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
						{#if item.href === '/user' && userAvatarUrl}
							<img src={userAvatarUrl} alt="" class="size-6 rounded-full object-cover" />
						{:else if item.href === '/user' && userEmoji}
							<span class="text-lg leading-none">{userEmoji}</span>
						{:else}
							<item.icon class="size-6" />
						{/if}
						{item.href === '/user' ? userNavLabel : t(item.labelKey)}
					</a>
				{/each}
			</nav>
		</div>
	{/if}
</div>
