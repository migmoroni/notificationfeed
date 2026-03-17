<!--
  NodeDetailPage — node detail view.

  Replaces the legacy CreatorPage, ProfilePage, FontPage components.
  Loads a ContentNode by ID and displays its header, body, and actions.
  Used by browse/favorites/preview entity detail routes.
-->
<script lang="ts">
	import { onMount } from 'svelte';
	import type { ContentNode, ContentNodeHeader } from '$lib/domain/content-node/content-node.js';
	import { isFontNode, isProfileNode, isCreatorNode } from '$lib/domain/content-node/content-node.js';
	import type { ContentTree } from '$lib/domain/content-tree/content-tree.js';
	import { consumer } from '$lib/stores/consumer.svelte.js';
	import { layout } from '$lib/stores/layout.svelte.js';
	import { createContentNodeStore } from '$lib/persistence/content-node.store.js';
	import { createContentTreeStore } from '$lib/persistence/content-tree.store.js';
	import { getPosts } from '$lib/persistence/post.store.js';
	import { getMediaPreviewUrl } from '$lib/services/media.service.js';
	import { createContentMediaStore } from '$lib/persistence/content-media.store.js';
	import { sortByPriority, type SortedPost } from '$lib/domain/shared/feed-sorter.js';
	import type { CanonicalPost } from '$lib/normalization/canonical-post.js';
	import type { PriorityLevel } from '$lib/domain/user/priority-level.js';
	import PostCard from '$lib/components/feed/PostCard.svelte';
	import FavoriteButton from '$lib/components/shared/FavoriteButton.svelte';
	import PriorityButtons from '$lib/components/shared/priority/PriorityButtons.svelte';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Separator } from '$lib/components/ui/separator/index.js';
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';
	import Globe from '@lucide/svelte/icons/globe';
	import User from '@lucide/svelte/icons/user';
	import Rss from '@lucide/svelte/icons/rss';
	import ConfirmDialog from '$lib/components/shared/dialog/ConfirmDialog.svelte';

	interface Props {
		nodeId: string;
		baseHref: string;
	}

	let { nodeId, baseHref }: Props = $props();

	let node = $state<ContentNode | null>(null);
	let childNodes = $state<ContentNode[]>([]);
	let posts = $state<SortedPost<CanonicalPost>[]>([]);
	let avatarUrl = $state<string | null>(null);
	let bannerUrl = $state<string | null>(null);
	let loading = $state(true);
	let showUnfavConfirm = $state(false);

	const nodeRepo = createContentNodeStore();
	const treeRepo = createContentTreeStore();
	const mediaRepo = createContentMediaStore();

	const roleMeta: Record<string, { label: string; icon: typeof Globe }> = {
		creator: { label: 'Creator', icon: Globe },
		profile: { label: 'Profile', icon: User },
		font: { label: 'Font', icon: Rss }
	};

	let meta = $derived(node ? roleMeta[node.role] ?? { label: node.role, icon: Globe } : null);
	let activation = $derived(node ? consumer.getActivation(node.metadata.id) : null);
	let currentPriority = $derived(activation?.priority ?? null);
	let isFavorite = $derived(activation?.favorite ?? false);
	let isEnabled = $derived(activation?.enabled ?? true);

	onMount(async () => {
		loading = true;
		try {
			const loaded = await nodeRepo.getById(nodeId);
			if (!loaded) return;
			node = loaded;

			// Load avatar
			const header = loaded.data.header;
			if (header.coverMediaId) {
				const media = await mediaRepo.getById(header.coverMediaId);
				if (media) avatarUrl = getMediaPreviewUrl(media);
			}
			if (header.bannerMediaId) {
				const media = await mediaRepo.getById(header.bannerMediaId);
				if (media) bannerUrl = getMediaPreviewUrl(media);
			}

			// For creator/profile nodes, load children from trees
			if (isCreatorNode(loaded) || isProfileNode(loaded)) {
				// Find trees that contain this node, then load child nodes
				const author = loaded.metadata.author;
				if (author) {
					const trees = await treeRepo.getByAuthor(author);
					const childIds = new Set<string>();
					for (const tree of trees) {
						for (const [, mapping] of Object.entries(tree.root.nodes)) {
							for (const [, nid] of Object.entries(mapping)) {
								if (nid !== nodeId) childIds.add(nid);
							}
						}
					}
					if (childIds.size > 0) {
						childNodes = await nodeRepo.getByIds([...childIds]);
					}
				}
			}

			// For font nodes, load posts
			if (isFontNode(loaded)) {
				const allPosts = await getPosts({ nodeId: loaded.metadata.id });
				const priorityMap = new Map<string, PriorityLevel>();
				priorityMap.set(loaded.metadata.id, currentPriority ?? 3);
				posts = sortByPriority(allPosts, priorityMap);
			}
		} finally {
			loading = false;
		}
	});

	async function handlePriorityChange(level: PriorityLevel | null) {
		if (!node) return;
		await consumer.setPriority(node.metadata.id, level);
	}

	async function handleFavorite() {
		if (!node) return;
		if (isFavorite) {
			showUnfavConfirm = true;
			return;
		}
		await consumer.setFavorite(node.metadata.id, true);
	}

	async function confirmUnfavorite() {
		if (!node) return;
		await consumer.setFavorite(node.metadata.id, false);
		showUnfavConfirm = false;
	}

	async function handleToggleEnabled() {
		if (!node) return;
		await consumer.toggleNodeEnabled(node.metadata.id);
	}
</script>

<svelte:head>
	<title>Notfeed — {node?.data.header.title ?? 'Carregando...'}</title>
</svelte:head>

<div class="mx-auto w-full px-4 py-4 {layout.isExpanded ? 'max-w-3xl' : 'max-w-xl'}">
	<!-- Back button -->
	<a
		href={baseHref}
		class="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4"
	>
		<ArrowLeft class="size-4" />
		<span>Voltar</span>
	</a>

	{#if loading}
		<div class="text-center py-12 text-muted-foreground text-sm">Carregando…</div>
	{:else if !node}
		<div class="text-center py-12 text-muted-foreground text-sm">Node não encontrado.</div>
	{:else}
		<!-- Banner -->
		{#if bannerUrl}
			<div class="w-full h-40 rounded-lg overflow-hidden mb-4">
				<img src={bannerUrl} alt="" class="w-full h-full object-cover" />
			</div>
		{/if}

		<!-- Header -->
		<div class="flex items-start gap-4 mb-4">
			{#if avatarUrl}
				<div class="size-20 shrink-0 rounded-lg overflow-hidden">
					<img src={avatarUrl} alt="" class="w-full h-full object-cover" />
				</div>
			{:else if meta}
				<div class="size-20 shrink-0 flex items-center justify-center rounded-lg bg-muted text-muted-foreground">
					<svelte:component this={meta.icon} class="size-8" />
				</div>
			{/if}

			<div class="flex-1 min-w-0">
				<div class="flex items-center gap-2 flex-wrap">
					<h1 class="text-xl font-bold truncate">{node.data.header.title}</h1>
					{#if meta}
						<Badge variant="outline" class="text-xs">{meta.label}</Badge>
					{/if}
				</div>

				{#if node.data.header.subtitle}
					<p class="text-sm text-muted-foreground mt-1">{node.data.header.subtitle}</p>
				{/if}

				{#if node.data.header.summary}
					<p class="text-sm mt-2">{node.data.header.summary}</p>
				{/if}
			</div>
		</div>

		<!-- Actions -->
		<div class="flex items-center gap-3 mb-4 p-2 rounded-lg border">
			<PriorityButtons current={currentPriority} size="md" onchange={handlePriorityChange} />
			<FavoriteButton favorite={isFavorite} onclick={handleFavorite} />
			<button
				onclick={handleToggleEnabled}
				class="ml-auto text-xs px-3 py-1.5 rounded-md border transition-colors {isEnabled
					? 'bg-accent text-accent-foreground'
					: 'bg-muted text-muted-foreground hover:bg-accent/50'}"
			>
				{isEnabled ? 'Ativo' : 'Inativo'}
			</button>
		</div>

		<!-- Tags -->
		{#if node.data.header.tags.length > 0}
			<div class="flex flex-wrap gap-1.5 mb-4">
				{#each node.data.header.tags as tag}
					<Badge variant="secondary" class="text-xs">{tag}</Badge>
				{/each}
			</div>
		{/if}

		<Separator class="my-4" />

		<!-- Child nodes (for creator/profile) -->
		{#if childNodes.length > 0}
			<section class="mb-6">
				<h2 class="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
					{isCreatorNode(node) ? 'Profiles' : 'Fonts'}
				</h2>
				<div class="flex flex-col gap-2">
					{#each childNodes as child (child.metadata.id)}
						{@const childMeta = roleMeta[child.role]}
						<a
							href="{baseHref}/node/{child.metadata.id}"
							class="flex items-center gap-3 p-3 rounded-lg border hover:bg-accent/50 transition-colors"
						>
							{#if childMeta}
								<svelte:component this={childMeta.icon} class="size-5 text-muted-foreground shrink-0" />
							{/if}
							<div class="flex-1 min-w-0">
								<p class="text-sm font-medium truncate">{child.data.header.title}</p>
								{#if child.data.header.subtitle}
									<p class="text-xs text-muted-foreground truncate">{child.data.header.subtitle}</p>
								{/if}
							</div>
							<Badge variant="outline" class="text-[10px] shrink-0">{childMeta?.label ?? child.role}</Badge>
						</a>
					{/each}
				</div>
			</section>
		{/if}

		<!-- Posts (for font nodes) -->
		{#if posts.length > 0}
			<section>
				<h2 class="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
					Posts ({posts.length})
				</h2>
				<div class="flex flex-col gap-2">
					{#each posts as sortedPost (sortedPost.post.id)}
						<PostCard {sortedPost} />
					{/each}
				</div>
			</section>
		{/if}
	{/if}
</div>

<ConfirmDialog
	bind:open={showUnfavConfirm}
	title="Remover dos favoritos?"
	description="Este item será removido da lista de favoritos."
	confirmLabel="Remover"
	onconfirm={confirmUnfavorite}
	oncancel={() => (showUnfavConfirm = false)}
/>
