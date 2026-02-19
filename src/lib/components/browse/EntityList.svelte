<script lang="ts">
	import type { BrowseEntity } from '$lib/stores/browse.svelte.js';
	import type { Profile } from '$lib/domain/profile/profile.js';
	import type { Font } from '$lib/domain/font/font.js';
	import EntityCard from './EntityCard.svelte';
	import { Separator } from '$lib/components/ui/separator/index.js';

	interface Props {
		entities: BrowseEntity[];
		loading: boolean;
	}

	let { entities, loading }: Props = $props();

	let pages = $derived(entities.filter((e) => e.type === 'creator_page'));
	let profiles = $derived(entities.filter((e) => e.type === 'profile'));
	let fonts = $derived(entities.filter((e) => e.type === 'font'));

	// Build a profile lookup for resolving font hrefs
	let profileMap = $derived.by(() => {
		const map = new Map<string, Profile>();
		for (const e of profiles) {
			map.set(e.data.id, e.data as Profile);
		}
		return map;
	});

	/**
	 * Profile URL follows DDD lifecycle modes:
	 * - Dependent (creatorPageId set) → scoped under creator: /browse/creator/{pageId}/profile/{id}
	 * - Standalone (creatorPageId null) → independent root: /browse/profile/{id}
	 */
	function profileHref(entity: BrowseEntity): string {
		if (entity.type !== 'profile') return '';
		const profile = entity.data as Profile;
		if (profile.creatorPageId) {
			return `/browse/creator/${profile.creatorPageId}/profile/${profile.id}`;
		}
		return `/browse/profile/${profile.id}`;
	}

	function pageHref(entity: BrowseEntity): string {
		if (entity.type !== 'creator_page') return '';
		return `/browse/creator/${entity.data.id}`;
	}

	/**
	 * Font URL resolved through its parent profile:
	 * - If profile is dependent → /browse/creator/{pageId}/profile/{profileId}/font/{fontId}
	 * - If profile is standalone → /browse/profile/{profileId}/font/{fontId}
	 */
	function fontHref(entity: BrowseEntity): string {
		if (entity.type !== 'font') return '';
		const font = entity.data as Font;
		const profile = profileMap.get(font.profileId);
		if (profile?.creatorPageId) {
			return `/browse/creator/${profile.creatorPageId}/profile/${font.profileId}/font/${font.id}`;
		}
		return `/browse/profile/${font.profileId}/font/${font.id}`;
	}
</script>

{#if loading}
	<!-- Skeleton loader -->
	<div class="flex flex-col gap-3">
		{#each { length: 3 } as _}
			<div class="rounded-lg border border-border bg-card p-3 animate-pulse">
				<div class="flex items-start gap-3">
					<div class="size-10 rounded-md bg-muted"></div>
					<div class="flex-1">
						<div class="h-4 w-32 bg-muted rounded mb-2"></div>
						<div class="h-3 w-48 bg-muted rounded"></div>
					</div>
				</div>
			</div>
		{/each}
	</div>
{:else if entities.length === 0}
	<div class="flex flex-col items-center justify-center py-12 text-center">
		<p class="text-sm text-muted-foreground">Selecione uma categoria para ver conteúdo.</p>
	</div>
{:else}
	<div class="flex flex-col gap-3">
		<!-- CreatorPages -->
		{#if pages.length > 0}
			<div>
				<h3 class="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 px-1">
					Creator Pages ({pages.length})
				</h3>
				<div class="flex flex-col gap-2">
					{#each pages as entity (entity.data.id)}
						<EntityCard {entity} href={pageHref(entity)} />
					{/each}
				</div>
			</div>
		{/if}

		{#if pages.length > 0 && profiles.length > 0}
			<Separator />
		{/if}

		<!-- Profiles -->
		{#if profiles.length > 0}
			<div>
				<h3 class="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 px-1">
					Profiles ({profiles.length})
				</h3>
				<div class="flex flex-col gap-2">
					{#each profiles as entity (entity.data.id)}
						<EntityCard {entity} href={profileHref(entity)} />
					{/each}
				</div>
			</div>
		{/if}

		{#if (pages.length > 0 || profiles.length > 0) && fonts.length > 0}
			<Separator />
		{/if}

		<!-- Fonts -->
		{#if fonts.length > 0}
			<div>
				<h3 class="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 px-1">
					Fonts ({fonts.length})
				</h3>
				<div class="flex flex-col gap-2">
					{#each fonts as entity (entity.data.id)}
						<EntityCard {entity} href={fontHref(entity)} />
					{/each}
				</div>
			</div>
		{/if}
	</div>
{/if}
