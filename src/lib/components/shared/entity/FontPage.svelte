<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import type { Font } from '$lib/domain/font/font.js';
	import type { Profile } from '$lib/domain/profile/profile.js';
	import type { CanonicalPost } from '$lib/normalization/canonical-post.js';
	import type { PriorityLevel } from '$lib/domain/shared/consumer-state.js';
	import { consumer } from '$lib/stores/consumer.svelte.js';
	import { layout } from '$lib/stores/layout.svelte.js';
	import { createFontStore } from '$lib/persistence/font.store.js';
	import { createProfileStore } from '$lib/persistence/profile.store.js';
	import { createCategoryStore } from '$lib/persistence/category.store.js';
	import { getPosts } from '$lib/persistence/post.store.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Separator } from '$lib/components/ui/separator/index.js';
	import { PostCard } from '$lib/components/feed/index.js';
	import { sortByPriority, type SortedPost } from '$lib/domain/shared/feed-sorter.js';
	import { buildPriorityMap, type PriorityContext } from '$lib/domain/shared/priority-resolver.js';
	import { formatRelativeDate } from '$lib/utils/date.js';
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';
	import Rss from '@lucide/svelte/icons/rss';
	import Atom from '@lucide/svelte/icons/atom';
	import Zap from '@lucide/svelte/icons/zap';
	import User from '@lucide/svelte/icons/user';
	import ArrowUpRight from '@lucide/svelte/icons/arrow-up-right';
	import ConfirmUnfavoriteDialog from '$lib/components/shared/dialog/ConfirmUnfavoriteDialog.svelte';
	import ConfirmDeactivateDialog from '$lib/components/shared/dialog/ConfirmDeactivateDialog.svelte';
	import FavoriteButton from '$lib/components/shared/FavoriteButton.svelte';
	import ActiveButton from '$lib/components/shared/activeContent/ActiveButton.svelte';
	import PriorityButtons from '$lib/components/shared/priority/PriorityButtons.svelte';

	let font = $state<Font | null>(null);
	let parentProfile = $state<Profile | null>(null);

	interface Props {
		/** Root prefix for generating parent links (e.g. '/browse' or '/favorites') */
		baseHref: string;
	}

	let { baseHref }: Props = $props();

	let posts = $state<CanonicalPost[]>([]);
	let categoryLabels: string[] = $state([]);
	let showUnfavConfirm = $state(false);
	let showDeactivateConfirm = $state(false);
	let loading = $state(true);
	let notFound = $state(false);

	const fontId = $derived(page.params.fontId!);

	let entityState = $derived(font ? consumer.stateMap.get(font.id) : undefined);
	let currentPriority = $derived(entityState?.priority ?? null);
	let isFavorite = $derived(entityState?.favorite ?? false);
	let isEnabled = $derived(entityState?.enabled ?? true);

	const protocolBadge: Record<string, string> = {
		rss: 'RSS',
		atom: 'Atom',
		nostr: 'Nostr'
	};

	let sortedPosts: SortedPost[] = $derived.by(() => {
		if (posts.length === 0 || !font) return [];
		const contexts: PriorityContext[] = [{
			fontId: font.id,
			profileId: font.profileId,
			creatorPageId: parentProfile?.creatorPageId ?? null
		}];
		const priorityMap = buildPriorityMap(contexts, consumer.stateMap);
		return sortByPriority(posts, priorityMap);
	});

	onMount(async () => {
		try {
			const fontStore = createFontStore();
			const profileStore = createProfileStore();
			const categoryStore = createCategoryStore();

			const found = await fontStore.getById(fontId);
			if (!found) {
				notFound = true;
				loading = false;
				return;
			}
			font = found;

			// Load parent profile
			const profile = await profileStore.getById(found.profileId);
			parentProfile = profile;

			// Load ALL posts for this font
			const result = await getPosts({ fontId: found.id });
			posts = result;

			// Resolve category labels
			const labels: string[] = [];
			for (const assignment of (found.categoryAssignments ?? [])) {
				for (const catId of assignment.categoryIds) {
					const cat = await categoryStore.getById(catId);
					if (cat) labels.push(cat.label);
				}
			}
			categoryLabels = labels;
		} catch (err) {
			console.error('[FontPage] Failed to load font:', err);
			notFound = true;
		} finally {
			loading = false;
		}
	});

	async function handlePriorityChange(level: PriorityLevel | null) {
		if (!font) return;
		await consumer.setPriority(font.id, 'font', level);
	}

	async function handleFavorite() {
		if (!font) return;
		if (isFavorite) {
			showUnfavConfirm = true;
			return;
		}
		await consumer.setFavorite(font.id, 'font', true);
	}

	async function confirmUnfavorite() {
		if (!font) return;
		await consumer.setFavorite(font.id, 'font', false);
		showUnfavConfirm = false;
	}

	async function handleToggleActive() {
		if (!font) return;
		if (isEnabled) {
			showDeactivateConfirm = true;
			return;
		}
		await consumer.toggleEnabled(font.id, 'font');
	}

	async function confirmDeactivate() {
		if (!font) return;
		await consumer.toggleEnabled(font.id, 'font');
		showDeactivateConfirm = false;
	}

	let parentProfileHref = $derived.by(() => {
		if (!parentProfile) return null;
		if (parentProfile.creatorPageId) {
			return `${baseHref}/creator/${parentProfile.creatorPageId}/profile/${parentProfile.id}`;
		}
		return `${baseHref}/profile/${parentProfile.id}`;
	});

	let postGridCols = $derived(layout.isExpanded ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1 sm:grid-cols-2');
</script>

<svelte:head>
	<title>Notfeed — {font?.title ?? 'Font'}</title>
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
			<p class="text-sm text-muted-foreground">Font não encontrada.</p>
			<button onclick={() => history.back()} class="text-sm text-primary hover:underline mt-2 inline-block">Voltar</button>
		</div>
	{:else if font}
		<!-- Header -->
		<div class="mb-10 px-2">
			<div class="flex flex-col sm:flex-row items-start sm:items-center gap-6 mb-6">
				<!-- Avatar / Protocol Icon -->
				<div class="shrink-0 w-20 h-20 rounded-xl bg-muted text-muted-foreground overflow-hidden shadow-sm flex items-center justify-center">
					{#if font.avatar?.data}
						<img src="data:image/webp;base64,{font.avatar.data}" alt="" class="w-full h-full object-cover" />
					{:else if font.protocol === 'atom'}
						<Atom class="size-10" />
					{:else if font.protocol === 'nostr'}
						<Zap class="size-10" />
					{:else}
						<Rss class="size-10" />
					{/if}
				</div>

				<div class="flex-1 min-w-0 w-full">
					<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2">
						<div class="flex items-center gap-3 w-full">
							<h1 class="text-2xl font-extrabold tracking-tight truncate">{font.title}</h1>
							<Badge variant="secondary" class="text-xs uppercase px-2 py-0.5 shrink-0 bg-secondary/50">
								{protocolBadge[font.protocol] ?? font.protocol}
							</Badge>
						</div>

						<!-- Actions grouped together -->
						<div class="flex items-center gap-2 p-1.5 bg-background shadow-sm border rounded-xl w-fit">
							<PriorityButtons current={currentPriority} size="md" onchange={handlePriorityChange} />
							<div class="w-px h-6 bg-border mx-0.5"></div>
							<FavoriteButton favorite={isFavorite} size="md" onclick={handleFavorite} />
							<ActiveButton active={isEnabled} size="md" onclick={handleToggleActive} />
						</div>
					</div>

					<!-- Config info -->
					<div class="text-sm font-medium text-muted-foreground mb-4 max-w-2xl bg-muted/30 rounded-md p-3">
						{#if font.protocol === 'nostr'}
							{@const nostrConfig = font.config as import('$lib/domain/font/font.js').FontNostrConfig}
							<p><strong>Relays:</strong> {nostrConfig.relays?.join(', ') ?? '—'}</p>
							<p class="truncate mt-1"><strong>Pubkey:</strong> {nostrConfig.pubkey ?? '—'}</p>
						{:else}
							{@const feedConfig = font.config as import('$lib/domain/font/font.js').FontRssConfig}
							<p class="truncate"><strong>URL:</strong> <a href={feedConfig.url} target="_blank" rel="noopener noreferrer" class="hover:underline">{feedConfig.url ?? '—'}</a></p>
						{/if}
					</div>

					{#if categoryLabels.length > 0}
						<div class="flex flex-wrap gap-1.5 mt-2">
							{#each categoryLabels as label}
								<Badge variant="outline" class="text-xs font-medium bg-background text-foreground/80">{label}</Badge>
							{/each}
						</div>
					{/if}

					<!-- Parent profile link -->
					{#if parentProfile && parentProfileHref}
						<div class="mt-2">
							<a href={parentProfileHref} class="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border bg-muted/30 text-xs font-medium text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-colors">
								<User class="size-3.5" />
								<span>Parte de: <strong class="font-semibold text-foreground tracking-tight ml-0.5">{parentProfile.title}</strong></span>
								<ArrowUpRight class="size-3.5 opacity-70 ml-1" />
							</a>
						</div>
					{/if}
				</div>
			</div>
		</div>

		<Separator class="mb-8" />

		<!-- All Posts -->
		<section>
			<h2 class="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
				Posts ({posts.length})
			</h2>

			{#if sortedPosts.length === 0}
				<p class="text-sm text-muted-foreground">Nenhum post ainda.</p>
			{:else}
				<div class="grid {postGridCols} gap-2">
					{#each sortedPosts as sp (sp.post.id)}
						<PostCard sortedPost={sp} />
					{/each}
				</div>
			{/if}
		</section>
	{/if}
</div>

<ConfirmUnfavoriteDialog bind:open={showUnfavConfirm} onconfirm={confirmUnfavorite} oncancel={() => (showUnfavConfirm = false)} />
<ConfirmDeactivateDialog bind:open={showDeactivateConfirm} title={font?.title ?? ''} onconfirm={confirmDeactivate} oncancel={() => (showDeactivateConfirm = false)} />
