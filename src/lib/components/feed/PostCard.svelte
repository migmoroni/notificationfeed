<script lang="ts">
	import type { SortedPost } from '$lib/domain/shared/feed-sorter.js';
	import PriorityBadge from '$lib/components/shared/PriorityBadge.svelte';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { feed } from '$lib/stores/feed.svelte.js';
	import { formatRelativeDate } from '$lib/utils/date.js';
	import CircleDot from '@lucide/svelte/icons/circle-dot';
	import ExternalLink from '@lucide/svelte/icons/external-link';

	interface Props {
		sortedPost: SortedPost;
	}

	let { sortedPost }: Props = $props();

	function handleClick() {
		if (!sortedPost.post.read) {
			feed.markRead(sortedPost.post.id);
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
	class="group relative rounded-lg border border-border bg-card text-card-foreground transition-colors hover:bg-accent/50 cursor-pointer {sortedPost.post.read ? 'opacity-60' : ''}"
	onclick={handleClick}
	onkeydown={handleKeydown}
	tabindex="0"
	role="button"
	aria-label="Abrir post: {sortedPost.post.title}"
>
	<!-- Unread indicator — left border accent -->
	{#if !sortedPost.post.read}
		<div class="absolute left-0 top-0 bottom-0 w-1 rounded-l-lg bg-primary"></div>
	{/if}

	<div class="p-4 pl-5">
		<!-- Header: title + author -->
		<div class="flex items-start justify-between gap-2 mb-1">
			<h3 class="text-sm font-semibold leading-snug line-clamp-2 flex-1">
				{sortedPost.post.title}
			</h3>
			{#if sortedPost.post.url}
				<ExternalLink class="size-3.5 shrink-0 text-muted-foreground mt-0.5" />
			{/if}
		</div>

		<p class="text-xs text-muted-foreground mb-2">
			{sortedPost.post.author}
		</p>

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
