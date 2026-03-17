<script lang="ts">
	import { onMount } from 'svelte';
	import { layout } from '$lib/stores/layout.svelte.js';
	import { activeUser } from '$lib/stores/active-user.svelte.js';
	import { creator } from '$lib/stores/creator.svelte.js';
	import { previewFeed } from '$lib/stores/preview-feed.svelte.js';
	import { previewEntityFilter } from '$lib/stores/preview-entity-filter.svelte.js';
	import type { ContentNode } from '$lib/domain/content-node/content-node.js';
	import type { SortedPost } from '$lib/domain/shared/feed-sorter.js';
	import type { CanonicalPost } from '$lib/normalization/canonical-post.js';
	import EntityCard from '$lib/components/shared/entity/EntityCard.svelte';
	import EntityTreeFilter from '$lib/components/shared/EntityTreeFilter.svelte';
	import { Separator } from '$lib/components/ui/separator/index.js';
	import PostCard from '$lib/components/feed/PostCard.svelte';
	import * as Tabs from '$lib/components/ui/tabs/index.js';
	import Eye from '@lucide/svelte/icons/eye';
	import Rss from '@lucide/svelte/icons/rss';

	function toSortedPost(post: CanonicalPost): SortedPost<CanonicalPost> {
		return { post, priority: 3 };
	}

	let loading = $state(true);
	let allNodes: ContentNode[] = $state([]);

	onMount(async () => {
		await previewEntityFilter.loadNodes();
		const trees = previewEntityFilter.getTrees?.() ?? [];
		const nodes = previewEntityFilter.getNodes?.() ?? [];
		allNodes = nodes;

		if (trees.length > 0) {
			await previewFeed.loadPreviewFeed(trees, nodes);
		}
		loading = false;
	});

	// Group nodes by role
	let creatorNodes = $derived(allNodes.filter((n) => n.role === 'creator'));
	let profileNodes = $derived(allNodes.filter((n) => n.role === 'profile'));
	let fontNodes = $derived(allNodes.filter((n) => n.role === 'font'));

	// Apply entity filter
	let filteredNodes = $derived.by(() => {
		if (!previewEntityFilter.hasFilters) return allNodes;
		const allowedFonts = previewEntityFilter.getAllowedFontNodeIds();
		// When filtering, show only font nodes that match, plus their ancestors
		if (allowedFonts.size === 0) return allNodes;
		return allNodes.filter((n) => {
			if (n.role === 'font') return allowedFonts.has(n.metadata.id);
			// Show all creators and profiles (filter narrows fonts)
			return true;
		});
	});

	let filteredCreators = $derived(filteredNodes.filter((n) => n.role === 'creator'));
	let filteredProfiles = $derived(filteredNodes.filter((n) => n.role === 'profile'));
	let filteredFonts = $derived(filteredNodes.filter((n) => n.role === 'font'));

	function nodeHref(node: ContentNode): string {
		return `/preview/node/${node.metadata.id}`;
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
	{:else if creator.trees.length === 0}
		<div class="py-12 text-center">
			<Eye class="size-12 mx-auto text-muted-foreground mb-3" />
			<p class="text-sm text-muted-foreground mb-2">
				Nenhuma página criada ainda.
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
						{:else if filteredNodes.length === 0}
							<div class="py-12 text-center">
								<p class="text-sm text-muted-foreground">Nenhum resultado para o filtro selecionado.</p>
							</div>
						{:else}
							<div class="flex flex-col gap-4">
								{#if filteredCreators.length > 0}
									<div>
										<h3 class="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 px-1">
											Creators ({filteredCreators.length})
										</h3>
										<div class="grid gap-3 {layout.isExpanded ? 'grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'}">
											{#each filteredCreators as node (node.metadata.id)}
												<EntityCard {node} href={nodeHref(node)} />
											{/each}
										</div>
									</div>
								{/if}

								{#if filteredCreators.length > 0 && (filteredProfiles.length > 0 || filteredFonts.length > 0)}
									<Separator />
								{/if}

								{#if filteredProfiles.length > 0}
									<div>
										<h3 class="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 px-1">
											Profiles ({filteredProfiles.length})
										</h3>
										<div class="grid gap-3 {layout.isExpanded ? 'grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'}">
											{#each filteredProfiles as node (node.metadata.id)}
												<EntityCard {node} href={nodeHref(node)} />
											{/each}
										</div>
									</div>
								{/if}

								{#if filteredProfiles.length > 0 && filteredFonts.length > 0}
									<Separator />
								{/if}

								{#if filteredFonts.length > 0}
									<div>
										<h3 class="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 px-1">
											Fonts ({filteredFonts.length})
										</h3>
										<div class="grid gap-3 {layout.isExpanded ? 'grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'}">
											{#each filteredFonts as node (node.metadata.id)}
												<EntityCard {node} href={nodeHref(node)} />
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
