<script lang="ts">
	import type { BrowseEntity } from '$lib/stores/browse.svelte.js';
	import type { ConsumerEntityType, PriorityLevel } from '$lib/domain/shared/consumer-state.js';
	import { consumer } from '$lib/stores/consumer.svelte.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import PriorityBadge from '$lib/components/shared/PriorityBadge.svelte';
	import Globe from '@lucide/svelte/icons/globe';
	import User from '@lucide/svelte/icons/user';
	import Rss from '@lucide/svelte/icons/rss';
	import Atom from '@lucide/svelte/icons/atom';
	import Zap from '@lucide/svelte/icons/zap';
	import ArrowUpRight from '@lucide/svelte/icons/arrow-up-right';
	import ConfirmUnfavoriteDialog from '$lib/components/shared/ConfirmUnfavoriteDialog.svelte';
	import ConfirmUnsubscribeDialog from '$lib/components/shared/ConfirmUnsubscribeDialog.svelte';
	import ConfirmUnfollowDialog from '$lib/components/shared/ConfirmUnfollowDialog.svelte';
	import ConfirmDeactivateDialog from '$lib/components/shared/ConfirmDeactivateDialog.svelte';
	import FavoriteButton from '$lib/components/shared/FavoriteButton.svelte';
	import SubscribeButton from '$lib/components/shared/SubscribeButton.svelte';
	import FollowButton from '$lib/components/shared/FollowButton.svelte';
	import ActiveButton from '$lib/components/shared/ActiveButton.svelte';

	interface Props {
		entity: BrowseEntity;
		href?: string | null;
	}

	let { entity, href = null }: Props = $props();

	let showUnfavConfirm = $state(false);
	let showUnsubscribeConfirm = $state(false);
	let showUnfollowConfirm = $state(false);
	let showDeactivateConfirm = $state(false);

	const typeConfig: Record<BrowseEntity['type'], { label: string; icon: typeof Globe; consumerType: ConsumerEntityType }> = {
		creator_page: { label: 'Page', icon: Globe, consumerType: 'creator_page' },
		profile: { label: 'Profile', icon: User, consumerType: 'profile' },
		font: { label: 'Font', icon: Rss, consumerType: 'font' }
	};

	let config = $derived(typeConfig[entity.type]);
	let entityState = $derived(consumer.stateMap.get(entity.data.id));
	let currentPriority = $derived(entityState?.priority ?? null);
	let isFavorite = $derived(entityState?.favorite ?? false);
	let isEnabled = $derived(entityState?.enabled ?? true);

	async function handleFavorite(e: MouseEvent) {
		e.preventDefault();
		e.stopPropagation();
		if (isFavorite) {
			showUnfavConfirm = true;
			return;
		}
		await consumer.setFavorite(entity.data.id, config.consumerType, true);
	}

	async function confirmUnfavorite() {
		await consumer.setFavorite(entity.data.id, config.consumerType, false);
		showUnfavConfirm = false;
	}

	async function handleToggleEnabled(e: MouseEvent) {
		e.preventDefault();
		e.stopPropagation();
		// If currently enabled (subscribed/following/active), show confirmation
		if (isEnabled) {
			if (entity.type === 'creator_page') {
				showUnsubscribeConfirm = true;
			} else if (entity.type === 'font') {
				showDeactivateConfirm = true;
			} else {
				showUnfollowConfirm = true;
			}
			return;
		}
		await consumer.toggleEnabled(entity.data.id, config.consumerType);
	}

	async function confirmUnsubscribe() {
		await consumer.toggleEnabled(entity.data.id, config.consumerType);
		showUnsubscribeConfirm = false;
	}

	async function confirmUnfollow() {
		await consumer.toggleEnabled(entity.data.id, config.consumerType);
		showUnfollowConfirm = false;
	}

	async function confirmDeactivate() {
		await consumer.toggleEnabled(entity.data.id, config.consumerType);
		showDeactivateConfirm = false;
	}

	function stopPropagation(e: MouseEvent) {
		e.preventDefault();
		e.stopPropagation();
	}
</script>

{#snippet cardContent()}
	<div class="flex items-start gap-3 p-3.5 {!isEnabled ? 'opacity-50' : ''}">
		<!-- Icon -->
		<div class="flex items-center justify-center size-10 shrink-0 rounded-md bg-muted text-muted-foreground">
			{#if entity.type === 'font'}
				{@const font = entity.data as import('$lib/domain/font/font.js').Font}
				{#if font.protocol === 'atom'}
					<Atom class="size-5" />
				{:else if font.protocol === 'nostr'}
					<Zap class="size-5" />
				{:else}
					<Rss class="size-5" />
				{/if}
			{:else}
				<config.icon class="size-5" />
			{/if}
		</div>

		<!-- Body -->
		<div class="flex-1 min-w-0">
			<div class="flex items-center gap-2">
				<h3 class="text-sm font-semibold truncate">{entity.data.title}</h3>
				<Badge variant="outline" class="text-[11px] px-1.5 py-0 shrink-0">{config.label}</Badge>
				{#if href}
					<ArrowUpRight class="size-3.5 shrink-0 text-muted-foreground ml-auto" />
				{/if}
			</div>

			{#if entity.data.tags.length > 0}
				<div class="flex flex-wrap gap-1 mt-1">
					{#each entity.data.tags.slice(0, 4) as tag}
						<span class="text-[11px] text-muted-foreground bg-muted rounded px-1.5 py-0.5">{tag}</span>
					{/each}
				</div>
			{/if}

			<!-- Actions row -->
			<!-- svelte-ignore a11y_no_static_element_interactions -->
			<div class="flex items-center gap-2 mt-2" onclick={stopPropagation} onkeydown={() => {}}>
				<!-- Priority label (read-only) -->
				{#if currentPriority}
					<PriorityBadge level={currentPriority} />
				{/if}

				<!-- Favorite toggle -->
				<FavoriteButton favorite={isFavorite} onclick={handleFavorite} />

				<!-- Subscribe/Follow/Active toggle -->
				<div class="ml-auto">
					{#if entity.type === 'creator_page'}
						<SubscribeButton subscribed={isEnabled} onclick={handleToggleEnabled} />
					{:else if entity.type === 'font'}
						<ActiveButton active={isEnabled} onclick={handleToggleEnabled} />
					{:else}
						<FollowButton following={isEnabled} onclick={handleToggleEnabled} />
					{/if}
				</div>
			</div>
		</div>
	</div>
{/snippet}

{#if href}
	<a
		{href}
		class="block rounded-lg border border-border bg-card text-card-foreground transition-colors hover:bg-accent/50"
	>
		{@render cardContent()}
	</a>
{:else}
	<div class="rounded-lg border border-border bg-card text-card-foreground">
		{@render cardContent()}
	</div>
{/if}

<ConfirmUnfavoriteDialog bind:open={showUnfavConfirm} onconfirm={confirmUnfavorite} oncancel={() => (showUnfavConfirm = false)} />
<ConfirmUnsubscribeDialog bind:open={showUnsubscribeConfirm} title={entity.data.title} onconfirm={confirmUnsubscribe} oncancel={() => (showUnsubscribeConfirm = false)} />
<ConfirmUnfollowDialog bind:open={showUnfollowConfirm} title={entity.data.title} onconfirm={confirmUnfollow} oncancel={() => (showUnfollowConfirm = false)} />
<ConfirmDeactivateDialog bind:open={showDeactivateConfirm} title={entity.data.title} onconfirm={confirmDeactivate} oncancel={() => (showDeactivateConfirm = false)} />
