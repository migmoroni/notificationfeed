<script lang="ts">
	import type { SortedPost } from '$lib/domain/shared/feed-sorter.js';
	import PriorityBadge from '$lib/components/shared/priority/PriorityBadge.svelte';
	import { feed } from '$lib/stores/feed.svelte.js';
	import { formatRelativeDate } from '$lib/utils/date.js';
	import CircleDot from '@lucide/svelte/icons/circle-dot';
	import ExternalLink from '@lucide/svelte/icons/external-link';

	interface Props {
		sortedPost: SortedPost;
	}

	let { sortedPost }: Props = $props();

	// Resolve font & profile for the "font strip"
	let font = $derived(feed.fonts.find((f) => f.id === sortedPost.post.fontId));
	let profile = $derived.by(() => {
		if (!font) return undefined;
		const pf = feed.profileFonts.find((pf) => pf.fontId === font!.id);
		return pf ? feed.profiles.find((p) => p.id === pf.profileId) : undefined;
	});

	let fontHref = $derived(font ? `/browse/font/${font.id}` : null);

	function handleClick() {
		if (!sortedPost.post.read) {
			feed.markRead(sortedPost.post.fontId, sortedPost.post.id);
		}
		if (sortedPost.post.url) {
			window.open(sortedPost.post.url, '_blank', 'noopener,noreferrer');
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			handleClick();
		}
	}

	function truncate(text: string, maxLength: number): string {
		if (text.length <= maxLength) return text;
		return text.slice(0, maxLength).trimEnd() + '…';
	}
</script>

<!-- svelte-ignore a11y_no_static_element_interactions, a11y_no_noninteractive_element_to_interactive_role -->
<article
	class="group relative flex rounded-lg border border-border bg-card text-card-foreground transition-colors hover:bg-accent/50 cursor-pointer {sortedPost.post.read ? 'opacity-60' : ''}"
	onclick={handleClick}
	onkeydown={handleKeydown}
	tabindex="0"
	role="button"
	aria-label="Abrir post: {sortedPost.post.title}"
>
	<!-- Font side tab — rotated text on the left edge -->
	{#if font}
		<a
			href={fontHref}
			class="relative shrink-0 w-6 rounded-l-lg flex items-center justify-center overflow-hidden transition-colors {sortedPost.post.read ? 'bg-muted/60' : 'bg-primary'} hover:bg-accent-foreground group/font"
			onclick={(e) => e.stopPropagation()}
			title={font.title}
		>
			<span
				class="absolute whitespace-nowrap text-[10px] font-semibold tracking-wide uppercase truncate max-w-[120px] {sortedPost.post.read ? 'text-muted-foreground' : 'text-primary-foreground'} group-hover/font:text-accent"
				style="writing-mode: vertical-rl; transform: rotate(180deg);"
			>
				{font.title}
			</span>
		</a>
	{:else}
		<!-- Unread indicator fallback — left border accent -->
		{#if !sortedPost.post.read}
			<div class="shrink-0 w-1 rounded-l-lg bg-primary"></div>
		{/if}
	{/if}

	<div class="flex-1 min-w-0 p-4 {font ? '' : 'pl-5'}">
	
		<!-- Header: title + author -->
		<div class="flex items-start justify-between gap-2 mb-1">
			<h3 class="text-sm font-semibold leading-snug line-clamp-2 flex-1">
				{sortedPost.post.title}
			</h3>
			{#if sortedPost.post.url}
				<ExternalLink class="size-3.5 shrink-0 text-muted-foreground mt-0.5" />
			{/if}
		</div>

		<!-- Content excerpt -->
		{#if sortedPost.post.content}
			<p class="text-sm text-muted-foreground leading-relaxed mb-3 line-clamp-2">
				{truncate(sortedPost.post.content, 180)}
			</p>
		{/if}

		<!-- Footer: date + priority badge + unread dot -->
		<div class="flex items-center gap-2 text-xs text-muted-foreground">
			<time datetime={new Date(sortedPost.post.publishedAt).toISOString()}>
				{formatRelativeDate(sortedPost.post.publishedAt)}
			</time>

			<PriorityBadge level={sortedPost.priority} />

			{#if !sortedPost.post.read}
				<CircleDot class="size-3 text-primary ml-auto" />
			{/if}
		</div>
	</div>
</article>
