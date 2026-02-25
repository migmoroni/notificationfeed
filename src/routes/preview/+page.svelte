<script lang="ts">
	import { onMount } from 'svelte';
	import { layout } from '$lib/stores/layout.svelte.js';
	import { activeUser } from '$lib/stores/active-user.svelte.js';
	import { creator } from '$lib/stores/creator.svelte.js';
	import { previewFeed } from '$lib/stores/preview-feed.svelte.js';
	import { createImagePreviewUrl } from '$lib/services/image.service.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import * as Card from '$lib/components/ui/card/index.js';
	import * as Tabs from '$lib/components/ui/tabs/index.js';
	import { Separator } from '$lib/components/ui/separator/index.js';
	import { PostCard } from '$lib/components/feed/index.js';
	import type { SortedPost } from '$lib/domain/shared/feed-sorter.js';
	import Eye from '@lucide/svelte/icons/eye';
	import Rss from '@lucide/svelte/icons/rss';
	import User from '@lucide/svelte/icons/user';

	function toSortedPost(post: import('$lib/normalization/canonical-post.js').CanonicalPost): SortedPost {
		return { post, priority: 3 };
	}

	let publishedPages = $derived(creator.pages.filter((p) => p.publishedSnapshot !== null));
	let activePageId = $state<string | null>(null);
	let activePage = $derived(publishedPages.find((p) => p.id === activePageId) ?? publishedPages[0] ?? null);

	onMount(async () => {
		if (publishedPages.length > 0) {
			activePageId = publishedPages[0].id;
			await previewFeed.loadPreviewFeed(publishedPages);
		}
	});

	async function handlePageSelect(pageId: string) {
		activePageId = pageId;
		if (activePage) {
			await previewFeed.loadPreviewFeed([activePage]);
		}
	}
</script>

<svelte:head>
	<title>Notfeed — Preview</title>
</svelte:head>

<div class="container mx-auto px-4 py-6 {layout.isExpanded ? 'max-w-4xl' : 'max-w-2xl'}">
	<h1 class="text-xl font-bold mb-6">Preview</h1>

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
		<!-- Page selector (if multiple published pages) -->
		{#if publishedPages.length > 1}
			<div class="flex gap-2 mb-6 overflow-x-auto pb-1">
				{#each publishedPages as pg (pg.id)}
					<button
						type="button"
						class="shrink-0 px-3 py-1.5 rounded-full text-sm border transition-colors {pg.id === activePage?.id
							? 'bg-primary text-primary-foreground border-primary'
							: 'hover:bg-muted border-border'}"
						onclick={() => handlePageSelect(pg.id)}
					>
						{pg.title}
					</button>
				{/each}
			</div>
		{/if}

		{#if activePage}
			<Tabs.Root value="overview">
				<Tabs.List>
					<Tabs.Trigger value="overview">Visão Geral</Tabs.Trigger>
					<Tabs.Trigger value="feed">Feed</Tabs.Trigger>
				</Tabs.List>

				<Tabs.Content value="overview" class="mt-4">
					<!-- Page Overview (from published snapshot) -->
					{@const snapshot = activePage.publishedSnapshot}
					{#if snapshot}
						<Card.Root class="overflow-hidden">
							{#if snapshot.page.banner}
								<div class="h-32 w-full overflow-hidden">
									<img
										src={createImagePreviewUrl(snapshot.page.banner)}
										alt=""
										class="w-full h-full object-cover"
									/>
								</div>
							{/if}
							<Card.Header>
								<div class="flex items-start gap-4">
									{#if snapshot.page.avatar}
										<img
											src={createImagePreviewUrl(snapshot.page.avatar)}
											alt=""
											class="size-16 rounded-full object-cover border shrink-0 {snapshot.page.banner ? '-mt-10 ring-4 ring-background' : ''}"
										/>
									{/if}
									<div>
										<Card.Title class="text-lg">{snapshot.page.title}</Card.Title>
										{#if snapshot.page.bio}
											<Card.Description class="mt-1">{snapshot.page.bio}</Card.Description>
										{/if}
									</div>
								</div>
								{#if snapshot.page.tags.length > 0}
									<div class="flex flex-wrap gap-1 mt-2">
										{#each snapshot.page.tags as tag}
											<Badge variant="outline" class="text-xs">{tag}</Badge>
										{/each}
									</div>
								{/if}
							</Card.Header>
						</Card.Root>

						<Separator class="my-4" />

						<!-- Profiles -->
						<div class="space-y-3">
							<h3 class="text-sm font-semibold">Profiles ({snapshot.profiles.length})</h3>
							{#each snapshot.profiles as profile, i}
								<Card.Root>
									<Card.Header class="pb-2">
										<div class="flex items-center gap-2">
											<User class="size-4 text-muted-foreground" />
											<Card.Title class="text-sm">{profile.title}</Card.Title>
										</div>
										{#if profile.tags.length > 0}
											<div class="flex flex-wrap gap-1 mt-1">
												{#each profile.tags as tag}
													<Badge variant="outline" class="text-[10px] h-4">{tag}</Badge>
												{/each}
											</div>
										{/if}
									</Card.Header>
									<Card.Content class="pt-0">
										<div class="space-y-1">
											{#each profile.fonts as font}
												<div class="flex items-center gap-2 text-sm text-muted-foreground">
													<Rss class="size-3" />
													<span class="truncate">{font.title}</span>
													<Badge variant="outline" class="text-[10px] uppercase ml-auto">{font.protocol}</Badge>
												</div>
											{/each}
											{#if profile.fonts.length === 0}
												<p class="text-xs text-muted-foreground italic">Nenhuma font</p>
											{/if}
										</div>
									</Card.Content>
								</Card.Root>
							{/each}
						</div>

						<div class="mt-4 text-xs text-muted-foreground text-center">
							v{snapshot.version} — Publicado em {new Date(snapshot.exportedAt).toLocaleDateString('pt-BR')}
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
		{/if}
	{/if}
</div>
