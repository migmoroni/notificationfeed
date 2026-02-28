<script lang="ts">
	import { onMount } from 'svelte';
	import type { CreatorPage } from '$lib/domain/creator-page/creator-page.js';
	import type { Profile } from '$lib/domain/profile/profile.js';
	import type { Font } from '$lib/domain/font/font.js';
	import type { CanonicalPost } from '$lib/normalization/canonical-post.js';
	import type { PriorityLevel } from '$lib/domain/shared/consumer-state.js';
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
	import ConfirmUnfavoriteDialog from '$lib/components/shared/ConfirmUnfavoriteDialog.svelte';
	import ConfirmUnsubscribeDialog from '$lib/components/shared/ConfirmUnsubscribeDialog.svelte';
	import FavoriteButton from '$lib/components/shared/FavoriteButton.svelte';
	import SubscribeButton from '$lib/components/shared/SubscribeButton.svelte';
	import PriorityButtons from '$lib/components/shared/PriorityButtons.svelte';

	/**
	 * Reusable Creator Page detail view.
	 *
	 * Used by both /browse/creator/{id} and /favorites/creator/{id}.
	 * Back button uses history.back() to respect browsing history.
	 */
	interface Props {
		creatorId: string;
		/** Root prefix for generating child links (e.g. '/browse' or '/favorites') */
		baseHref: string;
	}

	let { creatorId, baseHref }: Props = $props();

	let creatorPage = $state<CreatorPage | null>(null);
	let profiles: Profile[] = $state([]);
	let allFonts: Font[] = $state([]);
	let posts: CanonicalPost[] = $state([]);
	let loading = $state(true);
	let notFound = $state(false);

	let entityState = $derived(creatorPage ? consumer.stateMap.get(creatorPage.id) : undefined);
	let currentPriority = $derived(entityState?.priority ?? null);
	let isFavorite = $derived(entityState?.favorite ?? false);
	let isSubscribed = $derived(entityState?.enabled ?? true);

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
	let showUnsubscribeConfirm = $state(false);

	async function handlePriorityChange(level: PriorityLevel | null) {
		if (!creatorPage) return;
		await consumer.setPriority(creatorPage.id, 'creator_page', level);
	}

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

	async function handleSubscribe() {
		if (!creatorPage) return;
		if (isSubscribed) {
			showUnsubscribeConfirm = true;
			return;
		}
		await consumer.toggleEnabled(creatorPage.id, 'creator_page');
	}

	async function confirmUnsubscribe() {
		if (!creatorPage) return;
		await consumer.toggleEnabled(creatorPage.id, 'creator_page');
		showUnsubscribeConfirm = false;
	}

	function profilePageHref(profileId: string): string {
		return `${baseHref}/creator/${creatorId}/profile/${profileId}`;
	}

	function fontPageHref(profileId: string, fontId: string): string {
		return `${baseHref}/creator/${creatorId}/profile/${profileId}/font/${fontId}`;
	}
</script>

<svelte:head>
	<title>Notfeed — {creatorPage?.title ?? 'Creator Page'}</title>
</svelte:head>

<div class="container mx-auto px-4 py-4 {layout.isExpanded ? 'max-w-4xl' : 'max-w-2xl'}">
	<!-- Back navigation -->
	<button
		onclick={() => history.back()}
		class="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4"
	>
		<ArrowLeft class="size-4" />
		Voltar
	</button>

	{#if loading}
		<div class="animate-pulse space-y-4">
			<div class="h-8 w-48 bg-muted rounded"></div>
			<div class="h-4 w-64 bg-muted rounded"></div>
			<div class="h-20 bg-muted rounded-lg"></div>
		</div>
	{:else if notFound}
		<div class="py-12 text-center">
			<p class="text-sm text-muted-foreground">Creator Page não encontrada.</p>
			<button onclick={() => history.back()} class="text-sm text-primary hover:underline mt-2 inline-block">
				Voltar
			</button>
		</div>
	{:else if creatorPage}
		<!-- Banner -->
		{#if creatorPage.banner?.data}
			<div class="rounded-lg overflow-hidden mb-4" style="aspect-ratio: 3.6 / 1;">
				<img src="data:image/webp;base64,{creatorPage.banner.data}" alt="" class="w-full h-full object-cover" />
			</div>
		{/if}

		<!-- Header -->
		<div class="flex items-start gap-4 mb-6">
			<div class="shrink-0 w-16 h-16 rounded-lg bg-muted text-muted-foreground overflow-hidden">
				{#if creatorPage.avatar?.data}
					<img src="data:image/webp;base64,{creatorPage.avatar.data}" alt="" class="w-full h-full object-cover" />
				{:else}
					<div class="flex items-center justify-center w-full h-full">
						<Globe class="size-8" />
					</div>
				{/if}
			</div>

			<div class="flex-1 min-w-0">
				<div class="flex items-center gap-2 mb-1">
					<h1 class="text-xl font-bold truncate">{creatorPage.title}</h1>
					<FavoriteButton favorite={isFavorite} size="md" onclick={handleFavorite} />
					<SubscribeButton subscribed={isSubscribed} size="md" onclick={handleSubscribe} />
				</div>

				<!-- Priority -->
				<div class="flex items-center gap-2 mb-2">
					<span class="text-xs text-muted-foreground">Prioridade:</span>
					<PriorityButtons current={currentPriority} size="md" onchange={handlePriorityChange} />
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

		<!-- Profiles -->
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
							profilePageHref={profilePageHref(profile.id)}
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
<ConfirmUnsubscribeDialog bind:open={showUnsubscribeConfirm} title={creatorPage?.title ?? ''} onconfirm={confirmUnsubscribe} oncancel={() => (showUnsubscribeConfirm = false)} />
