<!--
  EntityCard — displays a TreeNode (creator, profile, or font).

  Replaces the old EntityCard that worked with BrowseEntity union type.
  Actions (priority, favorite, enabled) use the consumer activation map.
-->
<script lang="ts">
	import type { TreeNode } from '$lib/domain/content-tree/content-tree.js';
	import { isFontNode } from '$lib/domain/content-tree/content-tree.js';
	import { consumer } from '$lib/stores/consumer.svelte.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import PriorityBadge from '$lib/components/shared/priority/PriorityBadge.svelte';
	import FavoriteButton from '$lib/components/shared/FavoriteButton.svelte';
	import Globe from '@lucide/svelte/icons/globe';
	import User from '@lucide/svelte/icons/user';
	import Rss from '@lucide/svelte/icons/rss';
	import Atom from '@lucide/svelte/icons/atom';
	import Zap from '@lucide/svelte/icons/zap';
	import ArrowUpRight from '@lucide/svelte/icons/arrow-up-right';
	import ConfirmUnfavoriteDialog from '$lib/components/shared/dialog/ConfirmUnfavoriteDialog.svelte';
	import ConfirmUnfollowDialog from '$lib/components/shared/dialog/ConfirmUnfollowDialog.svelte';
	import ConfirmUnsubscribeDialog from '$lib/components/shared/dialog/ConfirmUnsubscribeDialog.svelte';
	import ConfirmUnpinDialog from '$lib/components/shared/dialog/ConfirmUnpinDialog.svelte';

	interface Props {
		node: TreeNode;
		href?: string | null;
		/** Pre-resolved avatar URL (data-url or blob URL from ContentMedia) */
		avatarUrl?: string | null;
	}

	let { node, href = null, avatarUrl = null }: Props = $props();

	let showDisableConfirm = $state(false);
	let showUnfavConfirm = $state(false);
	let showUnfollowConfirm = $state(false);
	let showUnsubscribeConfirm = $state(false);
	let showUnsaveConfirm = $state(false);

	const roleMeta: Record<string, { label: string; activeLabel: string; inactiveLabel: string; icon: typeof Globe }> = {
		creator: { label: 'Creator', activeLabel: 'Fixado', inactiveLabel: 'Fixar', icon: Globe },
		profile: { label: 'Profile', activeLabel: 'Inscrito', inactiveLabel: 'Inscrever', icon: User },
		font: { label: 'Font', activeLabel: 'Seguindo', inactiveLabel: 'Seguir', icon: Rss },
		collection: { label: 'Collection', activeLabel: 'Fixado', inactiveLabel: 'Fixar', icon: Globe }
	};

	let meta = $derived(roleMeta[node.role] ?? { label: node.role, activeLabel: 'Seguindo', inactiveLabel: 'Seguir', icon: Globe });
	let activation = $derived(consumer.getActivation(node.metadata.id));
	let isActivated = $derived(!!activation);
	let currentPriority = $derived(activation?.priority ?? null);
	let isFavorite = $derived(activation?.favorite ?? false);
	let isEnabled = $derived(activation?.enabled ?? true);
	let isActive = $derived(node.role === 'font' ? (isActivated && isEnabled) : isActivated);

	/**
	 * Determine protocol icon for font nodes.
	 */
	let protocolIcon = $derived.by(() => {
		if (!isFontNode(node)) return null;
		const proto = node.data.body.protocol;
		if (proto === 'atom') return Atom;
		if (proto === 'nostr') return Zap;
		return Rss;
	});

	async function handleFavorite(e: MouseEvent) {
		e.preventDefault();
		e.stopPropagation();
		if (isFavorite) {
			showUnfavConfirm = true;
			return;
		}
		await consumer.setFavorite(node.metadata.id, true);
	}

	async function confirmUnfavorite() {
		await consumer.setFavorite(node.metadata.id, false);
		showUnfavConfirm = false;
	}

	async function handleToggleEnabled(e: MouseEvent) {
		e.preventDefault();
		e.stopPropagation();
		if (isActive) {
			if (node.role === 'font') {
				showUnfollowConfirm = true;
			} else if (node.role === 'profile') {
				showUnsubscribeConfirm = true;
			} else {
				showUnsaveConfirm = true;
			}
			return;
		}
		// Font that's activated but disabled → re-enable
		if (node.role === 'font' && isActivated && !isEnabled) {
			await consumer.toggleNodeEnabled(node.metadata.id);
		} else {
			await consumer.activateNode(node.metadata.id);
		}
	}

	async function confirmDisable() {
		if (node.role === 'font') {
			await consumer.toggleNodeEnabled(node.metadata.id);
		} else {
			await consumer.deactivateNode(node.metadata.id);
		}
		showUnfollowConfirm = false;
		showUnsubscribeConfirm = false;
		showUnsaveConfirm = false;
	}
</script>

{#snippet cardContent()}
	<div class="flex items-stretch h-24 overflow-hidden {!isEnabled ? 'opacity-50' : ''}">
		<!-- Avatar / Icon -->
		{#if avatarUrl}
			<div class="shrink-0 w-32 overflow-hidden">
				<img
					src={avatarUrl}
					alt=""
					class="w-full h-full object-cover rounded-l-lg"
				/>
			</div>
		{:else}
			<div class="flex items-center justify-center w-32 shrink-0 rounded-l-lg bg-muted text-muted-foreground">
				{#if protocolIcon}
					<svelte:component this={protocolIcon} class="size-5" />
				{:else}
					<svelte:component this={meta.icon} class="size-5" />
				{/if}
			</div>
		{/if}

		<!-- Body -->
		<div class="flex-1 min-w-0 p-3.5">
			<div class="flex items-center gap-2">
				<h3 class="text-sm font-semibold truncate">{node.data.header.title}</h3>
				<Badge variant="outline" class="text-[11px] px-1.5 py-0 shrink-0">{meta.label}</Badge>
				{#if href}
					<ArrowUpRight class="size-3.5 shrink-0 text-muted-foreground ml-auto" />
				{/if}
			</div>

			{#if node.data.header.subtitle}
				<p class="text-xs text-muted-foreground truncate mt-0.5">{node.data.header.subtitle}</p>
			{/if}

			<!-- Actions row -->
			<div class="flex items-center gap-2 mt-auto pt-2">
				{#if currentPriority}
					<PriorityBadge level={currentPriority} />
				{/if}

				<FavoriteButton favorite={isFavorite} onclick={handleFavorite} />

				<div class="ml-auto">
					<button
						onclick={handleToggleEnabled}
						class="text-xs px-2 py-1 rounded-md border transition-colors {isActive
							? 'bg-accent text-accent-foreground'
							: 'bg-muted text-muted-foreground hover:bg-accent/50'}"
					>
						{isActive ? meta.activeLabel : meta.inactiveLabel}
					</button>
				</div>
			</div>
		</div>
	</div>
{/snippet}

{#if href}
	<a {href} class="block rounded-lg border border-border bg-card text-card-foreground transition-colors hover:bg-accent/50">
		{@render cardContent()}
	</a>
{:else}
	<div class="rounded-lg border border-border bg-card text-card-foreground transition-colors hover:bg-accent/50">
		{@render cardContent()}
	</div>
{/if}

<!-- Unfollow confirm (font) -->
<ConfirmUnfollowDialog
	bind:open={showUnfollowConfirm}
	title={node.data.header.title}
	onconfirm={confirmDisable}
	oncancel={() => (showUnfollowConfirm = false)}
/>

<!-- Unsubscribe confirm (profile) -->
<ConfirmUnsubscribeDialog
	bind:open={showUnsubscribeConfirm}
	title={node.data.header.title}
	onconfirm={confirmDisable}
	oncancel={() => (showUnsubscribeConfirm = false)}
/>

<!-- Unpin confirm (creator/collection) -->
<ConfirmUnpinDialog
	bind:open={showUnsaveConfirm}
	title={node.data.header.title}
	onconfirm={confirmDisable}
	oncancel={() => (showUnsaveConfirm = false)}
/>

<!-- Unfavorite confirm -->
<ConfirmUnfavoriteDialog
	bind:open={showUnfavConfirm}
	onconfirm={confirmUnfavorite}
	oncancel={() => (showUnfavConfirm = false)}
/>
