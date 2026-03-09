<script lang="ts">
	import type { Profile } from '$lib/domain/profile/profile.js';
	import type { PriorityLevel } from '$lib/domain/shared/consumer-state.js';
	import { consumer } from '$lib/stores/consumer.svelte.js';
	import User from '@lucide/svelte/icons/user';
	import ArrowUpRight from '@lucide/svelte/icons/arrow-up-right';
	import ConfirmUnfavoriteDialog from '$lib/components/shared/dialog/ConfirmUnfavoriteDialog.svelte';
	import ConfirmUnfollowDialog from '$lib/components/shared/dialog/ConfirmUnfollowDialog.svelte';
	import FavoriteButton from '$lib/components/shared/FavoriteButton.svelte';
	import FollowButton from '$lib/components/shared/activeContent/FollowButton.svelte';
	import PriorityBadge from '$lib/components/shared/priority/PriorityBadge.svelte';

	interface Props {
		profile: Profile;
		profilePageHref: string;
	}

	let { profile, profilePageHref }: Props = $props();

	let showUnfavConfirm = $state(false);
	let showUnfollowConfirm = $state(false);

	let entityState = $derived(consumer.stateMap.get(profile.id));
	let currentPriority = $derived(entityState?.priority ?? null);
	let isFavorite = $derived(entityState?.favorite ?? false);
	let isEnabled = $derived(entityState?.enabled ?? true);

	async function handleFavorite(e: MouseEvent) {
		e.stopPropagation();
		if (isFavorite) {
			showUnfavConfirm = true;
			return;
		}
		await consumer.setFavorite(profile.id, 'profile', true);
	}

	async function confirmUnfavorite() {
		await consumer.setFavorite(profile.id, 'profile', false);
		showUnfavConfirm = false;
	}

	async function handleFollow(e: MouseEvent) {
		e.stopPropagation();
		if (isEnabled) {
			showUnfollowConfirm = true;
			return;
		}
		await consumer.toggleEnabled(profile.id, 'profile');
	}

	async function confirmUnfollow() {
		await consumer.toggleEnabled(profile.id, 'profile');
		showUnfollowConfirm = false;
	}
</script>

<div class="rounded-lg border border-border bg-card overflow-hidden {!isEnabled ? 'opacity-50' : ''}">
	<div class="flex items-stretch">
		<a href={profilePageHref} class="shrink-0 w-20 block">
			{#if profile.avatar?.data}
				<img src="data:image/webp;base64,{profile.avatar.data}" alt="" class="w-full h-full object-cover" />
			{:else}
				<div class="flex items-center justify-center w-full h-full bg-muted text-muted-foreground">
					<User class="size-5" />
				</div>
			{/if}
		</a>

		<div class="flex items-center gap-3 p-3 flex-1 min-w-0">
			<a
				href={profilePageHref}
				class="flex flex-1 items-center gap-3 text-left transition-colors hover:bg-accent/30 -m-1.5 p-1.5 rounded-md"
			>
				<div class="flex-1 min-w-0">
					<span class="text-sm font-medium truncate">{profile.title}</span>
				</div>
				
			</a>

			<!-- svelte-ignore a11y_no_static_element_interactions -->
			<div class="flex items-center gap-1.5" onclick={(e) => e.stopPropagation()} onkeydown={() => {}}>
				{#if currentPriority}
					<PriorityBadge level={currentPriority} />
				{/if}
				
				<!--
				<FavoriteButton favorite={isFavorite} onclick={handleFavorite} />
				<FollowButton following={isEnabled} onclick={handleFollow} />
				-->

				<ArrowUpRight class="size-4 shrink-0 text-muted-foreground" />
			</div>
		</div>
	</div>
</div>

<ConfirmUnfavoriteDialog bind:open={showUnfavConfirm} onconfirm={confirmUnfavorite} oncancel={() => (showUnfavConfirm = false)} />
<ConfirmUnfollowDialog bind:open={showUnfollowConfirm} title={profile.title} onconfirm={confirmUnfollow} oncancel={() => (showUnfollowConfirm = false)} />
