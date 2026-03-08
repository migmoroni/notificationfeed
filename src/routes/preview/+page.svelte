<script lang="ts">
	import { onMount } from 'svelte';
	import { layout } from '$lib/stores/layout.svelte.js';
	import { activeUser } from '$lib/stores/active-user.svelte.js';
	import { creator } from '$lib/stores/creator.svelte.js';
	import { previewFeed } from '$lib/stores/preview-feed.svelte.js';
	import { previewEntityFilter } from '$lib/stores/preview-entity-filter.svelte.js';
	import { createProfileStore } from '$lib/persistence/profile.store.js';
	import { createFontStore } from '$lib/persistence/font.store.js';
	import type { CreatorPage } from '$lib/domain/creator-page/creator-page.js';
	import type { Profile } from '$lib/domain/profile/profile.js';
	import type { Font } from '$lib/domain/font/font.js';
	import type { BrowseEntity } from '$lib/stores/browse.svelte.js';
	import type { SortedPost } from '$lib/domain/shared/feed-sorter.js';
	import { EntityCard } from '$lib/components/shared/entity/index.js';
	import EntityTreeFilter from '$lib/components/shared/EntityTreeFilter.svelte';
	import { Separator } from '$lib/components/ui/separator/index.js';
	import { PostCard } from '$lib/components/feed/index.js';
	import * as Tabs from '$lib/components/ui/tabs/index.js';
	import Eye from '@lucide/svelte/icons/eye';
	import Rss from '@lucide/svelte/icons/rss';

	function toSortedPost(post: import('$lib/normalization/canonical-post.js').CanonicalPost): SortedPost {
		return { post, priority: 3 };
	}

	let publishedPages = $derived(creator.pages.filter((p) => p.publishedVersion > 0));

	let allProfiles: Profile[] = $state([]);
	let allFonts: Font[] = $state([]);
	let loading = $state(true);

	onMount(async () => {
		if (publishedPages.length > 0) {
			const profileStore = createProfileStore();
			const fontStore = createFontStore();
			const ps: Profile[] = [];
			const fs: Font[] = [];
			for (const pg of publishedPages) {
				const pgProfiles = await profileStore.getByCreatorPageId(pg.id);
				ps.push(...pgProfiles);
				for (const p of pgProfiles) {
					const pFonts = await fontStore.getByProfileId(p.id);
					fs.push(...pFonts);
				}
			}
			allProfiles = ps;
			allFonts = fs;
			await previewFeed.loadPreviewFeed(publishedPages);
		}
		await previewEntityFilter.loadPages();
		loading = false;
	});

	// Build full entity list from published pages
	let allEntities = $derived<BrowseEntity[]>([
		...publishedPages.map((p): BrowseEntity => ({ type: 'creator_page', data: p })),
		...allProfiles.map((p): BrowseEntity => ({ type: 'profile', data: p })),
		...allFonts.map((f): BrowseEntity => ({ type: 'font', data: f }))
	]);

	// Apply entity filter
	let filteredEntities = $derived.by(() => {
		if (!previewEntityFilter.hasFilters) return allEntities;
		const allowedFonts = previewEntityFilter.getAllowedFontIds();
		const allowedProfiles = previewEntityFilter.getAllowedProfileIds();
		return allEntities.filter((e) => {
			if (e.type === 'font') return allowedFonts.has(e.data.id);
			if (e.type === 'profile') {
				return allowedProfiles.has(e.data.id);
			}
			if (e.type === 'creator_page') {
				return allProfiles.some(
					(p) =>
						p.creatorPageId === e.data.id &&
						allowedProfiles.has(p.id)
				);
			}
			return true;
		});
	});

	// Group filtered entities by type
	let groupedPages = $derived(filteredEntities.filter((e) => e.type === 'creator_page'));
	let groupedProfiles = $derived(filteredEntities.filter((e) => e.type === 'profile'));
	let groupedFonts = $derived(filteredEntities.filter((e) => e.type === 'font'));

	function entityHref(entity: BrowseEntity): string {
		switch (entity.type) {
			case 'creator_page':
				return `/preview/creator/${entity.data.id}`;
			case 'profile': {
				const profile = entity.data as Profile;
				return `/preview/creator/${profile.creatorPageId}/profile/${profile.id}`;
			}
			case 'font': {
				const font = entity.data as Font;
				const profile = allProfiles.find((p) => p.id === font.profileId);
				return `/preview/creator/${profile?.creatorPageId}/profile/${font.profileId}/font/${font.id}`;
			}
		}
	}
</script>

<svelte:head>
	<title>Notfeed — Preview</title>
</svelte:head>

<div class="mx-auto w-full h-full flex flex-col overflow-hidden py-4" class:max-w-8xl={layout.isExpanded} class:max-w-2xl={!layout.isExpanded} class:px-4={!layout.isExpanded} class:pl-4={layout.isExpanded}>
	<div class="mb-4">
		<h1 class="text-xl font-bold">Preview</h1>
	</div>

	{#if !activeUser.isCreator}
		<div class="py-12 text-center">
			<Eye class="size-12 mx-auto text-muted-foreground mb-3" />
			<p class="text-sm text-muted-foreground mb-2">
				Acesse com um usuário Creator para ver o preview.
			</p>
			<a href="/user" class="text-sm text-primary hover:underline">
				Trocar de usuário →
			</a>
		</div>
	{:else if publishedPages.length === 0}
		<div class="py-12 text-center">
			<Eye class="size-12 mx-auto text-muted-foreground mb-3" />
			<p class="text-sm text-muted-foreground mb-2">
				Nenhuma página publicada ainda.
			</p>
			<a href="/pages" class="text-sm text-primary hover:underline">
				Ir para Pages →
			</a>
		</div>
	{:else}
		<div class="grid gap-12 flex-1 min-h-0 overflow-hidden {layout.isExpanded ? 'lg:grid-cols-[295px_1fr]' : 'md:grid-cols-[265px_1fr]'}">
			<!-- Sidebar -->
			<aside class="overflow-y-auto">
				<EntityTreeFilter store={previewEntityFilter} />
			</aside>

			<!-- Main content -->
			<div class="overflow-y-auto pr-24 pb-24">
				<Tabs.Root value="overview">
					<Tabs.List>
						<Tabs.Trigger value="overview">Visão Geral</Tabs.Trigger>
						<Tabs.Trigger value="feed">Feed</Tabs.Trigger>
					</Tabs.List>

					<Tabs.Content value="overview" class="mt-4">
						{#if loading}
							<div class="grid gap-3 {layout.isExpanded ? 'grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'}">
								{#each Array(4) as _}
									<div class="h-24 rounded-lg bg-muted animate-pulse"></div>
								{/each}
							</div>
						{:else if filteredEntities.length === 0}
							<div class="py-12 text-center">
								<p class="text-sm text-muted-foreground">Nenhum resultado para o filtro selecionado.</p>
							</div>
						{:else}
							<div class="flex flex-col gap-4">
								{#if groupedPages.length > 0}
									<div>
										<h3 class="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 px-1">
											Pages ({groupedPages.length})
										</h3>
										<div class="grid gap-3 {layout.isExpanded ? 'grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'}">
											{#each groupedPages as pe (pe.data.id)}
												<EntityCard entity={pe} href={entityHref(pe)} />
											{/each}
										</div>
									</div>
								{/if}

								{#if groupedPages.length > 0 && (groupedProfiles.length > 0 || groupedFonts.length > 0)}
									<Separator />
								{/if}

								{#if groupedProfiles.length > 0}
									<div>
										<h3 class="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 px-1">
											Profiles ({groupedProfiles.length})
										</h3>
										<div class="grid gap-3 {layout.isExpanded ? 'grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'}">
											{#each groupedProfiles as pe (pe.data.id)}
												<EntityCard entity={pe} href={entityHref(pe)} />
											{/each}
										</div>
									</div>
								{/if}

								{#if groupedProfiles.length > 0 && groupedFonts.length > 0}
									<Separator />
								{/if}

								{#if groupedFonts.length > 0}
									<div>
										<h3 class="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 px-1">
											Fonts ({groupedFonts.length})
										</h3>
										<div class="grid gap-3 {layout.isExpanded ? 'grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'}">
											{#each groupedFonts as fe (fe.data.id)}
												<EntityCard entity={fe} href={entityHref(fe)} />
											{/each}
										</div>
									</div>
								{/if}
							</div>
						{/if}
					</Tabs.Content>

					<Tabs.Content value="feed" class="mt-4">
						{#if previewFeed.loading}
							<div class="space-y-3">
								{#each Array(3) as _}
									<div class="h-24 rounded-lg bg-muted animate-pulse"></div>
								{/each}
							</div>
						{:else if previewFeed.posts.length === 0}
							<div class="py-12 text-center">
								<Rss class="size-8 mx-auto text-muted-foreground mb-2" />
								<p class="text-sm text-muted-foreground">
									Nenhum post encontrado para as fonts desta página.
								</p>
								<p class="text-xs text-muted-foreground mt-1">
									As fonts precisam ser ingeridas para que posts apareçam aqui.
								</p>
							</div>
						{:else}
							<div class="space-y-3">
								{#each previewFeed.posts as post (post.id)}
									<PostCard sortedPost={toSortedPost(post)} />
								{/each}
							</div>
						{/if}
					</Tabs.Content>
				</Tabs.Root>
			</div>
		</div>
	{/if}
</div>
