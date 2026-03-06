<script lang="ts">
	import type { Font } from '$lib/domain/font/font.js';
	import type { PriorityLevel } from '$lib/domain/shared/consumer-state.js';
	import { consumer } from '$lib/stores/consumer.svelte.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import Rss from '@lucide/svelte/icons/rss';
	import Atom from '@lucide/svelte/icons/atom';
	import Zap from '@lucide/svelte/icons/zap';
	import ArrowUpRight from '@lucide/svelte/icons/arrow-up-right';
	import ConfirmUnfavoriteDialog from '$lib/components/shared/dialog/ConfirmUnfavoriteDialog.svelte';
	import ConfirmDeactivateDialog from '$lib/components/shared/dialog/ConfirmDeactivateDialog.svelte';
	import FavoriteButton from '$lib/components/shared/FavoriteButton.svelte';
	import ActiveButton from '$lib/components/shared/activeContent/ActiveButton.svelte';
	import PriorityBadge from '$lib/components/shared/priority/PriorityBadge.svelte';

	interface Props {
		font: Font;
		fontPageHref: string;
	}

	let { font, fontPageHref }: Props = $props();

	let showUnfavConfirm = $state(false);
	let showDeactivateConfirm = $state(false);

	let entityState = $derived(consumer.stateMap.get(font.id));
	let isFavorite = $derived(entityState?.favorite ?? false);
	let isEnabled = $derived(entityState?.enabled ?? true);
	let currentPriority = $derived((entityState?.priority as PriorityLevel) || undefined);

	const protocolBadge: Record<string, string> = {
		rss: 'RSS',
		atom: 'Atom',
		nostr: 'Nostr'
	};

	async function handleFavorite(e: MouseEvent) {
		e.stopPropagation();
		if (isFavorite) {
			showUnfavConfirm = true;
			return;
		}
		await consumer.setFavorite(font.id, 'font', true);
	}

	async function confirmUnfavorite() {
		await consumer.setFavorite(font.id, 'font', false);
		showUnfavConfirm = false;
	}

	async function handleToggleActive(e: MouseEvent) {
		e.stopPropagation();
		if (isEnabled) {
			showDeactivateConfirm = true;
			return;
		}
		await consumer.toggleEnabled(font.id, 'font');
	}

	async function confirmDeactivate() {
		await consumer.toggleEnabled(font.id, 'font');
		showDeactivateConfirm = false;
	}
</script>

<div class="rounded-lg border border-border bg-card overflow-hidden {!isEnabled ? 'opacity-50' : ''}">
	<div class="flex items-stretch">
		<a href={fontPageHref} class="shrink-0 w-14 block">
			{#if font.avatar?.data}
				<img src="data:image/webp;base64,{font.avatar.data}" alt="" class="w-full h-full object-cover" />
			{:else}
				<div class="flex items-center justify-center w-full h-full bg-muted text-muted-foreground">
					{#if font.protocol === 'atom'}
						<Atom class="size-4" />
					{:else if font.protocol === 'nostr'}
						<Zap class="size-4" />
					{:else}
						<Rss class="size-4" />
					{/if}
				</div>
			{/if}
		</a>

		<div class="flex items-center gap-3 p-3 flex-1 min-w-0">
			<a
				href={fontPageHref}
				class="flex flex-1 items-center gap-3 text-left transition-colors hover:bg-accent/30 -m-1.5 p-1.5 rounded-md"
			>
				<div class="flex-1 min-w-0">
					<div class="flex items-center gap-2">
						<span class="text-sm font-medium truncate">{font.title}</span>
						
					</div>
				</div>
				<ArrowUpRight class="size-4 shrink-0 text-muted-foreground" />
			</a>

			<!-- svelte-ignore a11y_no_static_element_interactions -->
			<div class="flex items-center gap-1.5" onclick={(e) => e.stopPropagation()} onkeydown={() => {}}>
				{#if currentPriority}
					<PriorityBadge level={currentPriority} />
				{/if}
				<FavoriteButton favorite={isFavorite} onclick={handleFavorite} />
				<ActiveButton active={isEnabled} onclick={handleToggleActive} />
			</div>
		</div>
	</div>
</div>

<ConfirmUnfavoriteDialog bind:open={showUnfavConfirm} onconfirm={confirmUnfavorite} oncancel={() => (showUnfavConfirm = false)} />
<ConfirmDeactivateDialog bind:open={showDeactivateConfirm} title={font.title} onconfirm={confirmDeactivate} oncancel={() => (showDeactivateConfirm = false)} />
