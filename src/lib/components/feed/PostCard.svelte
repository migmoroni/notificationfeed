<!--
  PostCard — displays a single post using TreeNode model.

  Resolves font node from feed store (instead of Font entity).
-->
<script lang="ts">
	import type { SortedPost } from '$lib/domain/shared/feed-sorter.js';
	import type { CanonicalPost } from '$lib/normalization/canonical-post.js';
	import PriorityBadge from '$lib/components/shared/priority/PriorityBadge.svelte';
	import { feed } from '$lib/stores/feed.svelte.js';
	import { formatRelativeDate } from '$lib/utils/date.js';
	import CircleDot from '@lucide/svelte/icons/circle-dot';
	import ExternalLink from '@lucide/svelte/icons/external-link';
	import { t } from '$lib/i18n/t.js';

	interface Props {
		sortedPost: SortedPost<CanonicalPost>;
	}

	let { sortedPost }: Props = $props();

	// Resolve font node for the side tab
	let fontNode = $derived(feed.getNode(sortedPost.post.nodeId));
	let fontTitle = $derived(fontNode?.data.header.title ?? '');
	let fontHref = $derived(fontNode ? `/browse/node/${fontNode.metadata.id}` : null);

	function handleClick() {
		if (!sortedPost.post.read) {
			feed.markRead(sortedPost.post.nodeId, sortedPost.post.id);
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
	aria-label={t('aria.open_post', { title: sortedPost.post.title })}
>
	<!-- Font side tab -->
	{#if fontNode}
		<a
			href={fontHref}
			class="relative shrink-0 w-6 rounded-l-lg flex items-center justify-center overflow-hidden transition-colors {sortedPost.post.read ? 'bg-muted/60' : 'bg-primary'} hover:bg-accent-foreground group/font"
			onclick={(e) => e.stopPropagation()}
			title={fontTitle}
		>
			<span
				class="absolute whitespace-nowrap text-[10px] font-semibold tracking-wide uppercase truncate max-w-[120px] {sortedPost.post.read ? 'text-muted-foreground' : 'text-primary-foreground'} group-hover/font:text-accent"
				style="writing-mode: vertical-rl; transform: rotate(180deg);"
			>
				{fontTitle}
			</span>
		</a>
	{:else if !sortedPost.post.read}
		<div class="shrink-0 w-1 rounded-l-lg bg-primary"></div>
	{/if}

	<div class="flex-1 min-w-0 p-4 {fontNode ? '' : 'pl-5'}">
		<div class="flex items-start justify-between gap-2 mb-1">
			<h3 class="text-sm font-semibold leading-snug line-clamp-2 flex-1">
				{sortedPost.post.title}
			</h3>
			{#if sortedPost.post.url}
				<ExternalLink class="size-3.5 shrink-0 text-muted-foreground mt-0.5" />
			{/if}
		</div>

		{#if sortedPost.post.content}
			<p class="text-sm text-muted-foreground leading-relaxed mb-3 line-clamp-2">
				{truncate(sortedPost.post.content, 180)}
			</p>
		{/if}

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
