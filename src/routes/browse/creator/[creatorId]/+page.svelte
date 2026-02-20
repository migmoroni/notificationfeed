<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import type { CreatorPage } from '$lib/domain/creator-page/creator-page.js';
	import type { Profile } from '$lib/domain/profile/profile.js';
	import type { Font } from '$lib/domain/font/font.js';
	import type { CanonicalPost } from '$lib/normalization/canonical-post.js';
	import { consumer } from '$lib/stores/consumer.svelte.js';
	import { layout } from '$lib/stores/layout.svelte.js';
	import { createCreatorPageStore } from '$lib/persistence/creator-page.store.js';
	import { createProfileStore } from '$lib/persistence/profile.store.js';
	import { createFontStore } from '$lib/persistence/font.store.js';
	import { getPosts } from '$lib/persistence/post.store.js';
	import { ProfileCard } from '$lib/components/browse/index.js';
	import { PostCard } from '$lib/components/feed/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Separator } from '$lib/components/ui/separator/index.js';
	import { sortByPriority, type SortedPost } from '$lib/domain/shared/feed-sorter.js';
	import { buildPriorityMap, type PriorityContext } from '$lib/domain/shared/priority-resolver.js';
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';
	import Globe from '@lucide/svelte/icons/globe';
	import Star from '@lucide/svelte/icons/star';
	import StarOff from '@lucide/svelte/icons/star-off';
	import ConfirmUnfavoriteDialog from '$lib/components/shared/ConfirmUnfavoriteDialog.svelte';

	let creatorPage = $state<CreatorPage | null>(null);
	let profiles: Profile[] = $state([]);
	let allFonts: Font[] = $state([]);
	let posts: CanonicalPost[] = $state([]);
	let loading = $state(true);
	let notFound = $state(false);

	let entityState = $derived(creatorPage ? consumer.stateMap.get(creatorPage.id) : undefined);
	let isFavorite = $derived(entityState?.favorite ?? false);

	const creatorId = $derived(page.params.creatorId!);

	let postLimit = $derived(layout.isExpanded ? 8 : 4);
	let postGridCols = $derived(layout.isExpanded ? 'grid-cols-2' : 'grid-cols-1');

	let sortedPosts: SortedPost[] = $derived.by(() => {
		if (posts.length === 0) return [];
		const contexts: PriorityContext[] = allFonts.map(f => ({
			fontId: f.id,
			profileId: f.profileId,
			creatorPageId: creatorId
		}));
		const priorityMap = buildPriorityMap(contexts, consumer.stateMap);
		return sortByPriority(posts, priorityMap);
	});

	onMount(async () => {
		try {
			const pageStore = createCreatorPageStore();
			const profileStore = createProfileStore();
			const fontStore = createFontStore();

			const found = await pageStore.getById(creatorId);
			if (!found) {
				notFound = true;
				loading = false;
				return;
			}

			creatorPage = found;
			profiles = await profileStore.getByCreatorPageId(creatorId);

			// Load fonts + posts for aggregated posts section
			const fonts: Font[] = [];
			const allPosts: CanonicalPost[] = [];

			for (const profile of profiles) {
				const profileFonts = await fontStore.getByProfileId(profile.id);
				fonts.push(...profileFonts);

				for (const font of profileFonts) {
					const fontPosts = await getPosts({ fontId: font.id });
					allPosts.push(...fontPosts);
				}
			}

			allFonts = fonts;
			posts = allPosts;
		} catch (err) {
			console.error('[CreatorPage] Failed to load:', err);
			notFound = true;
		} finally {
			loading = false;
		}
	});

	let showUnfavConfirm = $state(false);

	async function handleFavorite() {
		if (!creatorPage) return;
		if (isFavorite) {
			showUnfavConfirm = true;
			return;
		}
		await consumer.setFavorite(creatorPage.id, 'creator_page', true);
	}

	async function confirmUnfavorite() {
		if (!creatorPage) return;
		await consumer.setFavorite(creatorPage.id, 'creator_page', false);
		showUnfavConfirm = false;
	}

	function fontPageHref(profileId: string, fontId: string): string {
		return `/browse/creator/${creatorId}/profile/${profileId}/font/${fontId}`;
	}
</script>

<svelte:head>
	<title>Notfeed — {creatorPage?.title ?? 'Creator Page'}</title>
</svelte:head>

<div class="container mx-auto px-4 py-4 {layout.isExpanded ? 'max-w-4xl' : 'max-w-2xl'}">
	<!-- Back navigation -->
	<a
		href="/browse"
		class="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4"
	>
		<ArrowLeft class="size-4" />
		Browse
	</a>

	{#if loading}
		<div class="animate-pulse space-y-4">
			<div class="h-8 w-48 bg-muted rounded"></div>
			<div class="h-4 w-64 bg-muted rounded"></div>
			<div class="h-20 bg-muted rounded-lg"></div>
		</div>
	{:else if notFound}
		<div class="py-12 text-center">
			<p class="text-sm text-muted-foreground">Creator Page não encontrada.</p>
			<a href="/browse" class="text-sm text-primary hover:underline mt-2 inline-block">
				Voltar ao Browse
			</a>
		</div>
	{:else if creatorPage}
		<!-- Header -->
		<div class="flex items-start gap-4 mb-6">
			<div class="flex items-center justify-center size-16 shrink-0 rounded-lg bg-muted text-muted-foreground">
				<Globe class="size-8" />
			</div>

			<div class="flex-1 min-w-0">
				<div class="flex items-center gap-2 mb-1">
					<h1 class="text-xl font-bold truncate">{creatorPage.title}</h1>
					<button
						onclick={handleFavorite}
						class="shrink-0 transition-colors {isFavorite ? 'text-yellow-500' : 'text-muted-foreground hover:text-foreground'}"
						aria-label={isFavorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
					>
						{#if isFavorite}
							<Star class="size-5 fill-current" />
						{:else}
							<StarOff class="size-5" />
						{/if}
					</button>
				</div>

				{#if creatorPage.bio}
					<p class="text-sm text-muted-foreground line-clamp-3">{creatorPage.bio}</p>
				{/if}

				{#if creatorPage.tags.length > 0}
					<div class="flex flex-wrap gap-1 mt-2">
						{#each creatorPage.tags as tag}
							<Badge variant="secondary" class="text-xs">{tag}</Badge>
						{/each}
					</div>
				{/if}
			</div>
		</div>

		<!-- Profiles (collapsible cards with fonts inside) -->
		<section class="mb-6">
			<h2 class="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
				Profiles ({profiles.length})
			</h2>

			{#if profiles.length === 0}
				<p class="text-sm text-muted-foreground py-4">Nenhum profile nesta page.</p>
			{:else}
				<div class="flex flex-col gap-3">
					{#each profiles as profile (profile.id)}
						<ProfileCard
							{profile}
							profilePageHref="/browse/creator/{creatorId}/profile/{profile.id}"
							fontPageHref={(fontId) => fontPageHref(profile.id, fontId)}
						/>
					{/each}
				</div>
			{/if}
		</section>

		<Separator class="mb-6" />

		<!-- Aggregated Posts -->
		<section>
			<h2 class="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
				Posts ({posts.length})
			</h2>

			{#if sortedPosts.length === 0}
				<p class="text-sm text-muted-foreground">Nenhum post ainda.</p>
			{:else}
				<div class="grid {postGridCols} gap-2">
					{#each sortedPosts.slice(0, postLimit) as sp (sp.post.id)}
						<PostCard sortedPost={sp} />
					{/each}
				</div>
				{#if sortedPosts.length > postLimit}
					<p class="text-xs text-muted-foreground text-center py-2">
						Mostrando {postLimit} de {sortedPosts.length} posts
					</p>
				{/if}
			{/if}
		</section>
	{/if}
</div>

<ConfirmUnfavoriteDialog bind:open={showUnfavConfirm} onconfirm={confirmUnfavorite} oncancel={() => (showUnfavConfirm = false)} />
