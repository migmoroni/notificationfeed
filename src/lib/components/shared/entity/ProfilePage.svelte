<script lang="ts">
	import type { Profile } from '$lib/domain/profile/profile.js';
	import type { Font } from '$lib/domain/font/font.js';
	import type { Section } from '$lib/domain/section/section.js';
	import type { CanonicalPost } from '$lib/normalization/canonical-post.js';
	import type { Category } from '$lib/domain/category/category.js';
	import type { PriorityLevel } from '$lib/domain/shared/consumer-state.js';
	import { consumer } from '$lib/stores/consumer.svelte.js';
	import { layout } from '$lib/stores/layout.svelte.js';
	import { createProfileStore } from '$lib/persistence/profile.store.js';
	import { createFontStore } from '$lib/persistence/font.store.js';
	import { createSectionStore } from '$lib/persistence/section.store.js';
	import { createCategoryStore } from '$lib/persistence/category.store.js';
	import { getPosts } from '$lib/persistence/post.store.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Separator } from '$lib/components/ui/separator/index.js';
	import FontCard from './FontCard.svelte';
	import { PostCard } from '$lib/components/feed/index.js';
	import { sortByPriority, type SortedPost } from '$lib/domain/shared/feed-sorter.js';
	import { buildPriorityMap, type PriorityContext } from '$lib/domain/shared/priority-resolver.js';
	import { formatRelativeDate } from '$lib/utils/date.js';
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';
	import User from '@lucide/svelte/icons/user';
	import Folder from '@lucide/svelte/icons/folder';
	import ConfirmUnfavoriteDialog from '$lib/components/shared/dialog/ConfirmUnfavoriteDialog.svelte';
	import ConfirmUnfollowDialog from '$lib/components/shared/dialog/ConfirmUnfollowDialog.svelte';
	import FavoriteButton from '$lib/components/shared/FavoriteButton.svelte';
	import FollowButton from '$lib/components/shared/activeContent/FollowButton.svelte';
	import PriorityButtons from '$lib/components/shared/priority/PriorityButtons.svelte';

	/**
	 * Reusable Profile detail page.
	 *
	 * Shared between both DDD lifecycle modes:
	 * - Standalone: rendered at /browse/profile/{id}
	 * - Dependent: rendered at /browse/creator/{pageId}/profile/{id}
	 *
	 * Back button uses history.back() to respect browsing history.
	 */
	interface Props {
		profileId: string;
		/** Root prefix for generating child links (e.g. '/browse' or '/favorites') */
		baseHref: string;
	}

	let { profileId, baseHref }: Props = $props();

	let profile = $state<Profile | null>(null);
	let fonts: Font[] = $state([]);
	let fontSections: Section[] = $state([]);
	let posts: CanonicalPost[] = $state([]);
	let categoryLabels: string[] = $state([]);
	let loading = $state(true);
	let notFound = $state(false);

	let entityState = $derived(profile ? consumer.stateMap.get(profile.id) : undefined);
	let currentPriority = $derived(entityState?.priority ?? null);
	let isFavorite = $derived(entityState?.favorite ?? false);
	let isFollowing = $derived(entityState?.enabled ?? true);

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
			const sectionStore = createSectionStore();
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
			const container = await sectionStore.getByContainer(profileId);
			fontSections = container?.sections ?? [];

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

	let showUnfavConfirm = $state(false);
	let showUnfollowConfirm = $state(false);

	async function handlePriorityChange(level: PriorityLevel | null) {
		if (!profile) return;
		await consumer.setPriority(profile.id, 'profile', level);
	}

	async function handleFavorite() {
		if (!profile) return;
		if (isFavorite) {
			showUnfavConfirm = true;
			return;
		}
		await consumer.setFavorite(profile.id, 'profile', true);
	}

	async function confirmUnfavorite() {
		if (!profile) return;
		await consumer.setFavorite(profile.id, 'profile', false);
		showUnfavConfirm = false;
	}

	async function handleFollow() {
		if (!profile) return;
		if (isFollowing) {
			showUnfollowConfirm = true;
			return;
		}
		await consumer.toggleEnabled(profile.id, 'profile');
	}

	async function confirmUnfollow() {
		if (!profile) return;
		await consumer.toggleEnabled(profile.id, 'profile');
		showUnfollowConfirm = false;
	}

	function fontPageHref(fontId: string): string {
		if (profile?.creatorPageId) {
			return `${baseHref}/creator/${profile.creatorPageId}/profile/${profileId}/font/${fontId}`;
		}
		return `${baseHref}/profile/${profileId}/font/${fontId}`;
	}

	let creatorPageHref = $derived(
		profile?.creatorPageId ? `${baseHref}/creator/${profile.creatorPageId}` : null
	);

	let postLimit = $derived(layout.isExpanded ? 8 : 4);
	let postGridCols = $derived(layout.isExpanded ? 'grid-cols-2' : 'grid-cols-1');
</script>

<svelte:head>
	<title>Notfeed — {profile?.title ?? 'Profile'}</title>
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
			<p class="text-sm text-muted-foreground">Profile não encontrado.</p>
			<button onclick={() => history.back()} class="text-sm text-primary hover:underline mt-2 inline-block">
				Voltar
			</button>
		</div>
	{:else if profile}
		<!-- Header -->
		<div class="flex items-start gap-4 mb-6">
			<div class="shrink-0 w-14 h-14 rounded-lg bg-muted text-muted-foreground overflow-hidden">
				{#if profile.avatar?.data}
					<img src="data:image/webp;base64,{profile.avatar.data}" alt="" class="w-full h-full object-cover" />
				{:else}
					<div class="flex items-center justify-center w-full h-full">
						<User class="size-7" />
					</div>
				{/if}
			</div>

			<div class="flex-1 min-w-0">
				<div class="flex items-center gap-2 mb-1">
					<h1 class="text-xl font-bold truncate">{profile.title}</h1>
					<FavoriteButton favorite={isFavorite} size="md" onclick={handleFavorite} />
					<FollowButton following={isFollowing} size="md" onclick={handleFollow} />
				</div>

				<!-- Priority -->
				<div class="flex items-center gap-2 mb-2">
					<span class="text-xs text-muted-foreground">Prioridade:</span>
					<PriorityButtons current={currentPriority} size="md" onchange={handlePriorityChange} />
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
			{:else if fontSections.length > 0}
				<!-- Section-grouped layout -->
				<div class="flex flex-col gap-4">
					{#each fontSections as section (section.id)}
						{@const sectionFonts = fonts.filter((f) => f.sectionId === section.id)}
						<div class="rounded-lg border" style="border-left: 3px solid {section.color};">
							<div class="flex items-center gap-2 px-3 py-2">
								<Folder class="size-4" style="color:{section.color};" />
								<span class="text-sm font-semibold flex-1">{section.title}</span>
								<Badge variant="outline" class="text-xs">{sectionFonts.length}</Badge>
							</div>
							{#if sectionFonts.length > 0}
								<div class="px-3 pb-3 flex flex-col gap-3">
									{#each sectionFonts as font (font.id)}
										<FontCard {font} fontPageHref={fontPageHref(font.id)} />
									{/each}
								</div>
							{/if}
						</div>
					{/each}

					<!-- Unsectioned fonts -->
					{#if true}
						{@const unsectioned = fonts.filter((f) => f.sectionId === null)}
						{#if unsectioned.length > 0}
							<div class="text-xs text-muted-foreground uppercase tracking-wider px-1">Sem seção</div>
							<div class="flex flex-col gap-3">
								{#each unsectioned as font (font.id)}
									<FontCard {font} fontPageHref={fontPageHref(font.id)} />
								{/each}
							</div>
						{/if}
					{/if}
				</div>
			{:else}
				<!-- Flat layout (no sections) -->
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

<ConfirmUnfavoriteDialog bind:open={showUnfavConfirm} onconfirm={confirmUnfavorite} oncancel={() => (showUnfavConfirm = false)} />
<ConfirmUnfollowDialog bind:open={showUnfollowConfirm} title={profile?.title ?? ''} onconfirm={confirmUnfollow} oncancel={() => (showUnfollowConfirm = false)} />
