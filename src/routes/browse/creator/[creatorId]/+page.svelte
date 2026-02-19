<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import type { CreatorPage } from '$lib/domain/creator-page/creator-page.js';
	import type { Profile } from '$lib/domain/profile/profile.js';
	import { consumer } from '$lib/stores/consumer.svelte.js';
	import { createCreatorPageStore } from '$lib/persistence/creator-page.store.js';
	import { createProfileStore } from '$lib/persistence/profile.store.js';
	import { EntityCard } from '$lib/components/browse/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';
	import Globe from '@lucide/svelte/icons/globe';
	import Star from '@lucide/svelte/icons/star';
	import StarOff from '@lucide/svelte/icons/star-off';

	let creatorPage = $state<CreatorPage | null>(null);
	let profiles: Profile[] = $state([]);
	let loading = $state(true);
	let notFound = $state(false);

	let entityState = $derived(creatorPage ? consumer.stateMap.get(creatorPage.id) : undefined);
	let isFavorite = $derived(entityState?.favorite ?? false);

	const creatorId = $derived(page.params.creatorId!);

	onMount(async () => {
		const pageStore = createCreatorPageStore();
		const profileStore = createProfileStore();

		const found = await pageStore.getById(creatorId);
		if (!found) {
			notFound = true;
			loading = false;
			return;
		}

		creatorPage = found;
		profiles = await profileStore.getByCreatorPageId(creatorId);
		loading = false;
	});

	async function handleFavorite() {
		if (!creatorPage) return;
		await consumer.setFavorite(creatorPage.id, 'creator_page', !isFavorite);
	}
</script>

<svelte:head>
	<title>Notfeed — {creatorPage?.title ?? 'Creator Page'}</title>
</svelte:head>

<div class="container mx-auto max-w-2xl px-4 py-4">
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
			<!-- Avatar placeholder -->
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

		<!-- Profiles list -->
		<div>
			<h2 class="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
				Profiles ({profiles.length})
			</h2>

			{#if profiles.length === 0}
				<p class="text-sm text-muted-foreground py-4">Nenhum profile nesta page.</p>
			{:else}
				<div class="flex flex-col gap-2">
					{#each profiles as profile (profile.id)}
						<EntityCard
							entity={{ type: 'profile', data: profile }}
							href="/browse/creator/{creatorId}/profile/{profile.id}"
						/>
					{/each}
				</div>
			{/if}
		</div>
	{/if}
</div>
