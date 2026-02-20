<script lang="ts">
	import type { Profile } from '$lib/domain/profile/profile.js';
	import type { Font } from '$lib/domain/font/font.js';
	import type { CanonicalPost } from '$lib/normalization/canonical-post.js';
	import type { Category } from '$lib/domain/category/category.js';
	import { consumer } from '$lib/stores/consumer.svelte.js';
	import { layout } from '$lib/stores/layout.svelte.js';
	import { createProfileStore } from '$lib/persistence/profile.store.js';
	import { createFontStore } from '$lib/persistence/font.store.js';
	import { createCategoryStore } from '$lib/persistence/category.store.js';
	import { getPosts } from '$lib/persistence/post.store.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Separator } from '$lib/components/ui/separator/index.js';
	import FontCard from '$lib/components/browse/FontCard.svelte';
	import { PostCard } from '$lib/components/feed/index.js';
	import { sortByPriority, type SortedPost } from '$lib/domain/shared/feed-sorter.js';
	import { buildPriorityMap, type PriorityContext } from '$lib/domain/shared/priority-resolver.js';
	import { formatRelativeDate } from '$lib/utils/date.js';
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';
	import User from '@lucide/svelte/icons/user';
	import Star from '@lucide/svelte/icons/star';
	import StarOff from '@lucide/svelte/icons/star-off';

	/**
	 * Reusable Profile detail page.
	 *
	 * Shared between both DDD lifecycle modes:
	 * - Standalone: rendered at /browse/profile/{id}, backHref → /browse
	 * - Dependent: rendered at /browse/creator/{pageId}/profile/{id}, backHref → /browse/creator/{pageId}
	 *
	 * The caller (route page) determines backHref/backLabel based on context.
	 */
	interface Props {
		profileId: string;
		backHref: string;
		backLabel: string;
	}

	let { profileId, backHref, backLabel }: Props = $props();

	let profile = $state<Profile | null>(null);
	let fonts: Font[] = $state([]);
	let posts: CanonicalPost[] = $state([]);
	let categoryLabels: string[] = $state([]);
	let loading = $state(true);
	let notFound = $state(false);

	let entityState = $derived(profile ? consumer.stateMap.get(profile.id) : undefined);
	let isFavorite = $derived(entityState?.favorite ?? false);

	let sortedPosts: SortedPost[] = $derived.by(() => {
		if (posts.length === 0) return [];
		const contexts: PriorityContext[] = fonts.map(f => ({
			fontId: f.id,
			profileId: f.profileId,
			creatorPageId: profile?.creatorPageId ?? null
		}));
		const priorityMap = buildPriorityMap(contexts, consumer.stateMap);
		return sortByPriority(posts, priorityMap);
	});

	import { onMount } from 'svelte';

	onMount(async () => {
		try {
			const profileStore = createProfileStore();
			const fontStore = createFontStore();
			const categoryStore = createCategoryStore();

			const found = await profileStore.getById(profileId);
			if (!found) {
				notFound = true;
				loading = false;
				return;
			}

			profile = found;

			// Load fonts
			fonts = await fontStore.getByProfileId(profileId);

			// Load posts from all fonts
			const allPosts: CanonicalPost[] = [];
			for (const font of fonts) {
				const fontPosts = await getPosts({ fontId: font.id });
				allPosts.push(...fontPosts);
			}
			posts = allPosts;

			// Resolve category labels
			const labels: string[] = [];
			for (const assignment of (profile.categoryAssignments ?? [])) {
				for (const catId of assignment.categoryIds) {
					const cat = await categoryStore.getById(catId);
					if (cat) labels.push(cat.label);
				}
			}
			categoryLabels = labels;
		} catch (err) {
			console.error('[ProfilePage] Failed to load profile:', err);
			notFound = true;
		} finally {
			loading = false;
		}
	});

	async function handleFavorite() {
		if (!profile) return;
		await consumer.setFavorite(profile.id, 'profile', !isFavorite);
	}

	function fontPageHref(fontId: string): string {
		if (profile?.creatorPageId) {
			return `/browse/creator/${profile.creatorPageId}/profile/${profileId}/font/${fontId}`;
		}
		return `/browse/profile/${profileId}/font/${fontId}`;
	}

	let creatorPageHref = $derived(
		profile?.creatorPageId ? `/browse/creator/${profile.creatorPageId}` : null
	);

	let postLimit = $derived(layout.isExpanded ? 8 : 4);
	let postGridCols = $derived(layout.isExpanded ? 'grid-cols-2' : 'grid-cols-1');
</script>

<svelte:head>
	<title>Notfeed — {profile?.title ?? 'Profile'}</title>
</svelte:head>

<div class="container mx-auto px-4 py-4 {layout.isExpanded ? 'max-w-4xl' : 'max-w-2xl'}">
	<!-- Back navigation -->
	<a
		href={backHref}
		class="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4"
	>
		<ArrowLeft class="size-4" />
		{backLabel}
	</a>

	{#if loading}
		<div class="animate-pulse space-y-4">
			<div class="h-8 w-48 bg-muted rounded"></div>
			<div class="h-4 w-64 bg-muted rounded"></div>
			<div class="h-20 bg-muted rounded-lg"></div>
		</div>
	{:else if notFound}
		<div class="py-12 text-center">
			<p class="text-sm text-muted-foreground">Profile não encontrado.</p>
			<a href={backHref} class="text-sm text-primary hover:underline mt-2 inline-block">
				Voltar
			</a>
		</div>
	{:else if profile}
		<!-- Header -->
		<div class="flex items-start gap-4 mb-6">
			<div class="flex items-center justify-center size-14 shrink-0 rounded-lg bg-muted text-muted-foreground">
				<User class="size-7" />
			</div>

			<div class="flex-1 min-w-0">
				<div class="flex items-center gap-2 mb-1">
					<h1 class="text-xl font-bold truncate">{profile.title}</h1>
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

				{#if profile.tags.length > 0}
					<div class="flex flex-wrap gap-1 mb-2">
						{#each profile.tags as tag}
							<Badge variant="secondary" class="text-xs">{tag}</Badge>
						{/each}
					</div>
				{/if}

				{#if categoryLabels.length > 0}
					<div class="flex flex-wrap gap-1">
						{#each categoryLabels as label}
							<Badge variant="outline" class="text-xs">{label}</Badge>
						{/each}
					</div>
				{/if}

				{#if creatorPageHref}
					<p class="text-xs text-muted-foreground mt-2">
						Creator Page:
						<a href={creatorPageHref} class="text-primary hover:underline">
							Ver Creator Page →
						</a>
					</p>
				{/if}
			</div>
		</div>

		<!-- Fonts -->
		<section class="mb-6">
			<h2 class="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
				Fonts ({fonts.length})
			</h2>

			{#if fonts.length === 0}
				<p class="text-sm text-muted-foreground">Nenhuma font neste profile.</p>
			{:else}
				<div class="flex flex-col gap-3">
					{#each fonts as font (font.id)}
						<FontCard {font} fontPageHref={fontPageHref(font.id)} />
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
