<script lang="ts">
	import { onMount } from 'svelte';
	import type { CreatorPage } from '$lib/domain/creator-page/creator-page.js';
	import type { Profile } from '$lib/domain/profile/profile.js';
	import type { Font } from '$lib/domain/font/font.js';
	import type { Section } from '$lib/domain/section/section.js';
	import type { CanonicalPost } from '$lib/normalization/canonical-post.js';
	import type { PriorityLevel } from '$lib/domain/shared/consumer-state.js';
	import { consumer } from '$lib/stores/consumer.svelte.js';
	import { layout } from '$lib/stores/layout.svelte.js';
	import { createCreatorPageStore } from '$lib/persistence/creator-page.store.js';
	import { createProfileStore } from '$lib/persistence/profile.store.js';
	import { createFontStore } from '$lib/persistence/font.store.js';
	import { createSectionStore } from '$lib/persistence/section.store.js';
	import { createCategoryStore } from '$lib/persistence/category.store.js';
	import { getPosts } from '$lib/persistence/post.store.js';
	import ProfileCard from './ProfileCard.svelte';
	import { PostCard } from '$lib/components/feed/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Separator } from '$lib/components/ui/separator/index.js';
	import { sortByPriority, type SortedPost } from '$lib/domain/shared/feed-sorter.js';
	import { buildPriorityMap, type PriorityContext } from '$lib/domain/shared/priority-resolver.js';
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';
	import Globe from '@lucide/svelte/icons/globe';
	import ConfirmUnfavoriteDialog from '$lib/components/shared/dialog/ConfirmUnfavoriteDialog.svelte';
	import ConfirmUnsubscribeDialog from '$lib/components/shared/dialog/ConfirmUnsubscribeDialog.svelte';
	import FavoriteButton from '$lib/components/shared/FavoriteButton.svelte';
	import SubscribeButton from '$lib/components/shared/activeContent/SubscribeButton.svelte';
	import PriorityButtons from '$lib/components/shared/priority/PriorityButtons.svelte';

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
	let sections: Section[] = $state([]);
	let posts: CanonicalPost[] = $state([]);
	let categoryLabels: string[] = $state([]);
	let loading = $state(true);
	let notFound = $state(false);

	let entityState = $derived(creatorPage ? consumer.stateMap.get(creatorPage.id) : undefined);
	let currentPriority = $derived(entityState?.priority ?? null);
	let isFavorite = $derived(entityState?.favorite ?? false);
	let isSubscribed = $derived(entityState?.enabled ?? true);

	let postLimit = $derived(layout.isExpanded ? 12 : 6);
	let postGridCols = $derived(layout.isExpanded ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1 sm:grid-cols-2');

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
			const sectionStore = createSectionStore();
			const categoryStore = createCategoryStore();

			const found = await pageStore.getById(creatorId);
			if (!found) {
				notFound = true;
				loading = false;
				return;
			}

			creatorPage = found;
			profiles = await profileStore.getByCreatorPageId(creatorId);
			const container = await sectionStore.getByContainer(creatorId);
			sections = container?.sections ?? [];

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

			// Resolve category labels
			const labels: string[] = [];
			for (const assignment of (creatorPage.categoryAssignments ?? [])) {
				for (const catId of assignment.categoryIds) {
					const cat = await categoryStore.getById(catId);
					if (cat) labels.push(cat.label);
				}
			}
			categoryLabels = labels;
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
		<!-- Banner & Avatar Header -->
		<div class="relative mb-16">
			<!-- Banner -->
			{#if creatorPage.banner?.data}
				<div class="rounded-t-xl overflow-hidden bg-muted" style="aspect-ratio: 3.6 / 1;">
					<img src="data:image/webp;base64,{creatorPage.banner.data}" alt="" class="w-full h-full object-cover" />
				</div>
			{:else}
				<div class="rounded-t-xl bg-gradient-to-r from-muted to-muted/50" style="aspect-ratio: 3.6 / 1;"></div>
			{/if}

			<!-- Avatar -->
			<div class="absolute -bottom-12 left-6">
				<div class="w-24 h-24 rounded-xl border-4 border-background bg-muted text-muted-foreground overflow-hidden shadow-sm flex items-center justify-center">
					{#if creatorPage.avatar?.data}
						<img src="data:image/webp;base64,{creatorPage.avatar.data}" alt="" class="w-full h-full object-cover" />
					{:else}
						<Globe class="size-10" />
					{/if}
				</div>
			</div>
			
			<!-- Actions (Right side of avatar, bottom of banner) -->
			<div class="absolute -bottom-14 right-4 flex items-center gap-2 p-1.5 bg-background shadow-md border rounded-xl z-10 transition-all hover:shadow-lg">
				<PriorityButtons current={currentPriority} size="md" onchange={handlePriorityChange} />
				<div class="w-px h-6 bg-border mx-0.5"></div>
				<FavoriteButton favorite={isFavorite} size="md" onclick={handleFavorite} />
				<SubscribeButton subscribed={isSubscribed} size="md" onclick={handleSubscribe} />
			</div>
		</div>

		<!-- Info -->
		<div class="px-6 mb-8">
			<h1 class="text-2xl font-extrabold tracking-tight mb-1">{creatorPage.title}</h1>

			{#if creatorPage.tagline}
				<p class="text-base font-medium text-foreground mb-2">{creatorPage.tagline}</p>
			{/if}

			{#if creatorPage.bio}
				<div class="text-sm text-muted-foreground leading-relaxed max-w-2xl prose prose-sm dark:prose-invert">{@html creatorPage.bio}</div>
			{/if}

			{#if categoryLabels.length > 0}
				<div class="flex flex-wrap gap-1.5 mt-3">
					{#each categoryLabels as label}
						<Badge variant="outline" class="text-xs font-medium bg-background text-foreground/80">{label}</Badge>
					{/each}
				</div>
			{/if}
		</div>

		<!-- Profiles -->
		<section class="mb-6">
			<h2 class="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
				Profiles ({profiles.length})
			</h2>

			{#if profiles.length === 0}
				<p class="text-sm text-muted-foreground py-4">Nenhum profile nesta page.</p>
			{:else if sections.length > 0}
				<!-- Section-grouped layout -->
				<div class="flex flex-col gap-4">
					{#each sections as section (section.id)}
						{@const sectionProfiles = profiles.filter((p) => p.sectionId === section.id)}
						<div class="rounded-lg border" style="border-left: 4px solid {section.color};">
							<div class="flex items-center gap-2 px-3 py-2">
								{#if !section.hideTitle}
									<span class="text-base" style="color:{section.color};">{section.emoji}</span>
									<span class="text-sm font-semibold flex-1">{section.title}</span>
								{:else}
									<span class="flex-1"></span>
								{/if}
								<Badge variant="outline" class="text-xs">{sectionProfiles.length}</Badge>
							</div>
							{#if sectionProfiles.length > 0}
								<div class="px-3 pb-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
									{#each sectionProfiles as profile (profile.id)}
										<ProfileCard
											{profile}
											profilePageHref={profilePageHref(profile.id)}
										/>
									{/each}
								</div>
							{/if}
						</div>
					{/each}

					<!-- Unsectioned profiles -->
					{#if true}
						{@const unsectioned = profiles.filter((p) => p.sectionId === null)}
						{#if unsectioned.length > 0}
							<div class="text-xs text-muted-foreground uppercase tracking-wider px-1">Sem seção</div>
							<div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
								{#each unsectioned as profile (profile.id)}
									<ProfileCard
										{profile}
										profilePageHref={profilePageHref(profile.id)}

									/>
								{/each}
							</div>
						{/if}
					{/if}
				</div>
			{:else}
				<!-- Flat layout (no sections) -->
				<div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
					{#each profiles as profile (profile.id)}
						<ProfileCard
							{profile}
							profilePageHref={profilePageHref(profile.id)}
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
