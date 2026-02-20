<script lang="ts">
	import type { Font } from '$lib/domain/font/font.js';
	import type { CanonicalPost } from '$lib/normalization/canonical-post.js';
	import type { PriorityLevel } from '$lib/domain/shared/consumer-state.js';
	import { consumer } from '$lib/stores/consumer.svelte.js';
	import { getPosts } from '$lib/persistence/post.store.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import * as Collapsible from '$lib/components/ui/collapsible/index.js';
	import { formatRelativeDate } from '$lib/utils/date.js';
	import PriorityButtons from '$lib/components/shared/PriorityButtons.svelte';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import Rss from '@lucide/svelte/icons/rss';
	import ExternalLink from '@lucide/svelte/icons/external-link';
	import FavoriteButton from '$lib/components/shared/FavoriteButton.svelte';

	interface Props {
		font: Font;
		defaultOpen?: boolean;
	}

	let { font, defaultOpen = false }: Props = $props();

	let open = $state(false);

	// Sync with prop (Svelte 5 doesn't let $state() capture a prop directly)
	$effect(() => {
		open = defaultOpen;
	});
	let posts: CanonicalPost[] = $state([]);
	let loadingPosts = $state(false);
	let loaded = $state(false);

	let entityState = $derived(consumer.stateMap.get(font.id));
	let currentPriority = $derived(entityState?.priority ?? null);
	let isFavorite = $derived(entityState?.favorite ?? false);
	let isEnabled = $derived(entityState?.enabled ?? true);

	const protocolBadge: Record<string, string> = {
		rss: 'RSS',
		atom: 'Atom',
		nostr: 'Nostr'
	};

	async function loadPosts() {
		if (loaded) return;
		loadingPosts = true;
		try {
			const result = await getPosts({ fontId: font.id });
			posts = result.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
			loaded = true;
		} finally {
			loadingPosts = false;
		}
	}

	function handleOpenChange() {
		open = !open;
		if (open && !loaded) {
			loadPosts();
		}
	}

	async function handlePriorityChange(level: PriorityLevel | null) {
		await consumer.setPriority(font.id, 'font', level);
	}

	async function handleFavorite() {
		await consumer.setFavorite(font.id, 'font', !isFavorite);
	}
</script>

<Collapsible.Root {open} onOpenChange={handleOpenChange}>
	<div class="rounded-lg border border-border bg-card {!isEnabled ? 'opacity-50' : ''}">
		<Collapsible.Trigger
			class="flex w-full items-center gap-3 p-3 text-left transition-colors hover:bg-accent/50"
		>
			<div class="flex items-center justify-center size-8 shrink-0 rounded-md bg-muted text-muted-foreground">
				<Rss class="size-4" />
			</div>

			<div class="flex-1 min-w-0">
				<div class="flex items-center gap-2">
					<span class="text-sm font-medium truncate">{font.title}</span>
					<Badge variant="outline" class="text-[10px] px-1.5 py-0 shrink-0">
						{protocolBadge[font.protocol] ?? font.protocol}
					</Badge>
				</div>
			</div>

			<ChevronRight
				class="size-4 shrink-0 text-muted-foreground transition-transform duration-200 {open ? 'rotate-90' : ''}"
			/>
		</Collapsible.Trigger>

		<Collapsible.Content>
			<div class="border-t border-border px-3 py-3">
				<!-- Config info -->
				<div class="text-xs text-muted-foreground mb-3">
					{#if font.protocol === 'nostr'}
						{@const nostrConfig = font.config as import('$lib/domain/font/font.js').FontNostrConfig}
						<p>Relays: {nostrConfig.relays?.join(', ') ?? '—'}</p>
						<p class="truncate">Pubkey: {nostrConfig.pubkey ?? '—'}</p>
					{:else}
						{@const feedConfig = font.config as import('$lib/domain/font/font.js').FontRssConfig}
						<p class="truncate">URL: {feedConfig.url ?? '—'}</p>
					{/if}
				</div>

				<!-- Actions -->
				<div class="flex items-center gap-2 mb-3">
					<PriorityButtons current={currentPriority} size="sm" onchange={handlePriorityChange} />

					<FavoriteButton favorite={isFavorite} onclick={handleFavorite} />
				</div>

				<!-- Posts -->
				{#if loadingPosts}
					<div class="flex flex-col gap-2">
						{#each { length: 2 } as _}
							<div class="animate-pulse rounded border border-border p-2">
								<div class="h-3 w-40 bg-muted rounded mb-1"></div>
								<div class="h-2 w-24 bg-muted rounded"></div>
							</div>
						{/each}
					</div>
				{:else if posts.length === 0 && loaded}
					<p class="text-xs text-muted-foreground">Nenhum post ainda.</p>
				{:else}
					<div class="flex flex-col gap-1.5 max-h-60 overflow-y-auto">
						{#each posts.slice(0, 10) as post (post.id)}
							<a
								href={post.url || undefined}
								target="_blank"
								rel="noopener noreferrer"
								class="group/post flex items-start gap-2 rounded border border-border p-2 text-left transition-colors hover:bg-accent/50 {post.read ? 'opacity-60' : ''}"
							>
								<div class="flex-1 min-w-0">
									<p class="text-xs font-medium line-clamp-1">{post.title}</p>
									<p class="text-[10px] text-muted-foreground mt-0.5">
										{post.author} · {formatRelativeDate(post.publishedAt)}
									</p>
								</div>
								{#if post.url}
									<ExternalLink class="size-3 shrink-0 text-muted-foreground mt-0.5" />
								{/if}
							</a>
						{/each}
						{#if posts.length > 10}
							<p class="text-[10px] text-muted-foreground text-center py-1">
								+{posts.length - 10} posts
							</p>
						{/if}
					</div>
				{/if}
			</div>
		</Collapsible.Content>
	</div>
</Collapsible.Root>
