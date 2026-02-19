<script lang="ts">
	import type { Font } from '$lib/domain/font/font.js';
	import type { CanonicalPost } from '$lib/normalization/canonical-post.js';
	import type { PriorityLevel } from '$lib/domain/shared/consumer-state.js';
	import { consumer } from '$lib/stores/consumer.svelte.js';
	import { getPosts } from '$lib/persistence/post.store.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { formatRelativeDate } from '$lib/utils/date.js';
	import Rss from '@lucide/svelte/icons/rss';
	import Star from '@lucide/svelte/icons/star';
	import StarOff from '@lucide/svelte/icons/star-off';
	import ExternalLink from '@lucide/svelte/icons/external-link';
	import ArrowUpRight from '@lucide/svelte/icons/arrow-up-right';
	import { onMount } from 'svelte';

	interface Props {
		font: Font;
		fontPageHref: string;
	}

	let { font, fontPageHref }: Props = $props();

	let posts: CanonicalPost[] = $state([]);
	let loadingPosts = $state(true);

	let entityState = $derived(consumer.stateMap.get(font.id));
	let currentPriority = $derived(entityState?.priority ?? null);
	let isFavorite = $derived(entityState?.favorite ?? false);
	let isEnabled = $derived(entityState?.enabled ?? true);

	const priorityConfig: Record<PriorityLevel, { label: string }> = {
		1: { label: '1' },
		2: { label: '2' },
		3: { label: '3' }
	};

	const protocolBadge: Record<string, string> = {
		rss: 'RSS',
		atom: 'Atom',
		nostr: 'Nostr'
	};

	onMount(async () => {
		try {
			const result = await getPosts({ fontId: font.id });
			posts = result.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
		} finally {
			loadingPosts = false;
		}
	});

	async function handlePriority(level: PriorityLevel) {
		const newLevel = currentPriority === level ? null : level;
		await consumer.setPriority(font.id, 'font', newLevel);
	}

	async function handleFavorite() {
		await consumer.setFavorite(font.id, 'font', !isFavorite);
	}
</script>

<div class="rounded-lg border border-border bg-card {!isEnabled ? 'opacity-50' : ''}">
	<!-- Header -->
	<div class="flex items-center gap-3 p-3">
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

		<!-- Navigate to font page -->
		<a
			href={fontPageHref}
			class="inline-flex items-center justify-center size-7 shrink-0 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
			aria-label="Abrir página da font"
		>
			<ArrowUpRight class="size-4" />
		</a>
	</div>

	<!-- Body -->
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
			<div class="flex gap-0.5">
				{#each [1, 2, 3] as level}
					{@const pConfig = priorityConfig[level as PriorityLevel]}
					<button
						onclick={() => handlePriority(level as PriorityLevel)}
						class="inline-flex items-center justify-center size-6 rounded text-[10px] font-bold transition-colors border
							{currentPriority === level
							? level === 1 ? 'bg-destructive text-destructive-foreground border-destructive'
								: level === 2 ? 'bg-secondary text-secondary-foreground border-secondary'
								: 'bg-accent text-accent-foreground border-accent'
							: 'border-border text-muted-foreground hover:bg-accent hover:text-accent-foreground'}"
						aria-label="Prioridade {pConfig.label}"
					>
						{pConfig.label}
					</button>
				{/each}
			</div>

			<button
				onclick={handleFavorite}
				class="inline-flex items-center justify-center size-6 rounded transition-colors
					{isFavorite ? 'text-yellow-500' : 'text-muted-foreground hover:text-foreground'}"
				aria-label={isFavorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
			>
				{#if isFavorite}
					<Star class="size-4 fill-current" />
				{:else}
					<StarOff class="size-4" />
				{/if}
			</button>
		</div>

		<!-- Posts preview (last 3) -->
		{#if loadingPosts}
			<div class="flex flex-col gap-2">
				{#each { length: 2 } as _}
					<div class="animate-pulse rounded border border-border p-2">
						<div class="h-3 w-40 bg-muted rounded mb-1"></div>
						<div class="h-2 w-24 bg-muted rounded"></div>
					</div>
				{/each}
			</div>
		{:else if posts.length === 0}
			<p class="text-xs text-muted-foreground">Nenhum post ainda.</p>
		{:else}
			<div class="flex flex-col gap-1.5">
				{#each posts.slice(0, 3) as post (post.id)}
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

				{#if posts.length > 3}
					<a
						href={fontPageHref}
						class="text-xs text-primary hover:underline text-center py-1"
					>
						Ver mais {posts.length - 3} posts →
					</a>
				{/if}
			</div>
		{/if}
	</div>
</div>
