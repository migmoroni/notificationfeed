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
	import { getPosts } from '$lib/persistence/post.store.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Separator } from '$lib/components/ui/separator/index.js';
	import { PostCard } from '$lib/components/feed/index.js';
	import { sortByPriority, type SortedPost } from '$lib/domain/shared/feed-sorter.js';
	import { buildPriorityMap, type PriorityContext } from '$lib/domain/shared/priority-resolver.js';
	import { formatRelativeDate } from '$lib/utils/date.js';
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';
	import Rss from '@lucide/svelte/icons/rss';
	import Star from '@lucide/svelte/icons/star';
	import StarOff from '@lucide/svelte/icons/star-off';
	import ConfirmUnfavoriteDialog from '$lib/components/shared/ConfirmUnfavoriteDialog.svelte';

	interface Props {
		backHref: string;
		backLabel: string;
	}

	let { backHref, backLabel }: Props = $props();

	let font = $state<Font | null>(null);
	let parentProfile = $state<Profile | null>(null);
	let posts = $state<CanonicalPost[]>([]);
	let showUnfavConfirm = $state(false);
	let loading = $state(true);
	let notFound = $state(false);

	const fontId = $derived(page.params.fontId!);

	let entityState = $derived(font ? consumer.stateMap.get(font.id) : undefined);
	let currentPriority = $derived(entityState?.priority ?? null);
	let isFavorite = $derived(entityState?.favorite ?? false);
	let isEnabled = $derived(entityState?.enabled ?? true);

	const priorityConfig: Record<PriorityLevel, { label: string }> = {
		1: { label: '1' },
		2: { label: '2' },
		3: { label: '3' }
	};

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
		} catch (err) {
			console.error('[FontPage] Failed to load font:', err);
			notFound = true;
		} finally {
			loading = false;
		}
	});

	async function handlePriority(level: PriorityLevel) {
		if (!font) return;
		const newLevel = currentPriority === level ? null : level;
		await consumer.setPriority(font.id, 'font', newLevel);
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

	let postGridCols = $derived(layout.isExpanded ? 'grid-cols-2' : 'grid-cols-1');
</script>

<svelte:head>
	<title>Notfeed — {font?.title ?? 'Font'}</title>
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
			<p class="text-sm text-muted-foreground">Font não encontrada.</p>
			<a href={backHref} class="text-sm text-primary hover:underline mt-2 inline-block">Voltar</a>
		</div>
	{:else if font}
		<!-- Header -->
		<div class="flex items-start gap-4 mb-6">
			<div class="flex items-center justify-center size-14 shrink-0 rounded-lg bg-muted text-muted-foreground">
				<Rss class="size-7" />
			</div>

			<div class="flex-1 min-w-0">
				<div class="flex items-center gap-2 mb-1">
					<h1 class="text-xl font-bold truncate">{font.title}</h1>
					<Badge variant="outline" class="text-[10px] px-1.5 py-0 shrink-0">
						{protocolBadge[font.protocol] ?? font.protocol}
					</Badge>
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

				<!-- Config info -->
				<div class="text-xs text-muted-foreground mb-2">
					{#if font.protocol === 'nostr'}
						{@const nostrConfig = font.config as import('$lib/domain/font/font.js').FontNostrConfig}
						<p>Relays: {nostrConfig.relays?.join(', ') ?? '—'}</p>
						<p class="truncate">Pubkey: {nostrConfig.pubkey ?? '—'}</p>
					{:else}
						{@const feedConfig = font.config as import('$lib/domain/font/font.js').FontRssConfig}
						<p class="truncate">URL: {feedConfig.url ?? '—'}</p>
					{/if}
				</div>

				{#if font.tags.length > 0}
					<div class="flex flex-wrap gap-1 mb-2">
						{#each font.tags as tag}
							<Badge variant="secondary" class="text-xs">{tag}</Badge>
						{/each}
					</div>
				{/if}

				<!-- Parent profile link -->
				{#if parentProfile}
					<p class="text-xs text-muted-foreground">
						Profile:
						<a href={backHref} class="text-primary hover:underline">
							{parentProfile.title}
						</a>
					</p>
				{/if}
			</div>
		</div>

		<!-- Priority actions -->
		<div class="flex items-center gap-2 mb-6">
			<span class="text-xs text-muted-foreground">Prioridade:</span>
			<div class="flex gap-0.5">
				{#each [1, 2, 3] as level}
					{@const pConfig = priorityConfig[level as PriorityLevel]}
					<button
						onclick={() => handlePriority(level as PriorityLevel)}
						class="inline-flex items-center justify-center size-7 rounded text-xs font-bold transition-colors border
							{currentPriority === level
							? level === 1 ? 'bg-destructive text-destructive-foreground border-destructive'
								: level === 2 ? 'bg-secondary text-secondary-foreground border-secondary'
								: 'bg-accent text-accent-foreground border-accent'
							: 'border-border text-muted-foreground hover:bg-accent hover:text-accent-foreground'}"
						aria-label="Prioridade {pConfig.label}"
					>
						{pConfig.label}
					</button>
				{/each}
			</div>

			<span class="text-xs ml-2 {isEnabled ? 'text-muted-foreground' : 'text-destructive'}">
				{isEnabled ? 'Ativo' : 'Inativo'}
			</span>
		</div>

		<Separator class="mb-6" />

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
