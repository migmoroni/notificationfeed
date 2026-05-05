<!--
  PostCard — displays a single post using TreeNode model.

  Resolves font node from feed store (instead of Font entity).
-->
<script lang="ts">
	import type { SortedPost } from '$lib/domain/shared/feed-sorter.js';
	import type { CanonicalPost } from '$lib/normalization/canonical-post.js';
	import PriorityBadge from '$lib/components/shared/priority/PriorityBadge.svelte';
	import { feed } from '$lib/stores/feed.svelte.js';
	import { viewModeStore } from '$lib/stores/view-mode.svelte.js';
	import { formatRelativeDate } from '$lib/utils/date.js';
	import CircleDot from '@lucide/svelte/icons/circle-dot';
	import ExternalLink from '@lucide/svelte/icons/external-link';
	import Bookmark from '@lucide/svelte/icons/bookmark';
	import BookmarkCheck from '@lucide/svelte/icons/bookmark-check';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import RotateCcw from '@lucide/svelte/icons/rotate-ccw';
	import ShareMenu from '$lib/components/shared/share/ShareMenu.svelte';
	import { t } from '$lib/i18n/t.js';
	import PostMedia from './PostMedia.svelte';
	import { hasMedia, getThumbnail, getImageQualityCandidates, rememberWorkingImageCandidate } from '$lib/utils/media.js';

	interface Props {
		sortedPost: SortedPost<CanonicalPost & { imageUrl?: string }>;
	}

	let { sortedPost }: Props = $props();

	// Resolve font node for the side tab
	let fontNode = $derived(feed.getNode(sortedPost.post.nodeId));
	let fontTitle = $derived(fontNode?.data.header.title ?? '');
	let fontHref = $derived(fontNode ? `/browse/node/${fontNode.metadata.id}` : null);

	let postHasMedia = $derived(hasMedia(sortedPost.post.url, sortedPost.post.imageUrl));
	let postThumbnail = $derived(getThumbnail(sortedPost.post.url, sortedPost.post.imageUrl));
	let postThumbnailCandidates = $derived(getImageQualityCandidates(postThumbnail));
	let postThumbnailCandidateIndex = $state(0);
	let activePostThumbnail = $derived(postThumbnailCandidates[postThumbnailCandidateIndex] ?? null);

	$effect(() => {
		postThumbnail;
		postThumbnailCandidateIndex = 0;
	});

	function onPostThumbnailError() {
		if (postThumbnailCandidateIndex >= postThumbnailCandidates.length - 1) return;
		postThumbnailCandidateIndex += 1;
	}

	function onPostThumbnailLoad() {
		rememberWorkingImageCandidate(postThumbnail, activePostThumbnail);
	}

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

	let isSaved = $derived(sortedPost.post.savedAt != null);
	let isTrashed = $derived(sortedPost.post.trashedAt != null);

	function toggleSaved(e: MouseEvent) {
		e.stopPropagation();
		void feed.setSaved(sortedPost.post.nodeId, sortedPost.post.id, !isSaved);
	}

	function toggleTrashed(e: MouseEvent) {
		e.stopPropagation();
		void feed.setTrashed(sortedPost.post.nodeId, sortedPost.post.id, !isTrashed);
	}

	let mode = $derived(viewModeStore.mode);
</script>

{#snippet actions()}
	<div class="flex items-center gap-1">
		<ShareMenu 
			title={sortedPost.post.title} 
			text={sortedPost.post.content ? truncate(sortedPost.post.content, 100) : undefined} 
			url={sortedPost.post.url} 
		/>
		<button
			type="button"
			class="rounded p-1 hover:bg-sky-500/20 text-muted-foreground hover:text-sky-500 transition-colors"
			onclick={toggleSaved}
			aria-label={isSaved ? t('post.action.unsave') : t('post.action.save')}
			title={isSaved ? t('post.action.saved') : t('post.action.save')}
		>
			{#if isSaved}
				<BookmarkCheck class="size-3.5 text-sky-500" />
			{:else}
				<Bookmark class="size-3.5" />
			{/if}
		</button>
		<button
			type="button"
			class="rounded p-1 hover:bg-sky-500/20 text-muted-foreground hover:text-sky-500 transition-colors"
			onclick={toggleTrashed}
			aria-label={isTrashed ? t('post.action.restore') : t('post.action.trash')}
			title={isTrashed ? t('post.action.restore') : t('post.action.trash')}
		>
			{#if isTrashed}
				<RotateCcw class="size-3.5" />
			{:else}
				<Trash2 class="size-3.5" />
			{/if}
		</button>
	</div>
{/snippet}

<!-- svelte-ignore a11y_no_static_element_interactions, a11y_no_noninteractive_element_to_interactive_role -->
{#if mode === 'list'}
	<article
		class="group flex items-stretch rounded-lg border border-border/50 bg-card text-card-foreground transition-all hover:bg-sky-500/5 hover:border-sky-500/30 {sortedPost.post.read ? 'opacity-60' : ''}"
	>
		<div class="flex items-center gap-3 pl-3 shrink-0">
			{#if !sortedPost.post.read}
				<CircleDot class="size-2 text-sky-500 shrink-0" />
			{:else}
				<div class="size-2 shrink-0"></div>
			{/if}

			{#if fontNode}
				<a
					href={fontHref}
					class="text-[10px] font-medium tracking-wide uppercase px-1.5 py-0.5 rounded bg-muted text-muted-foreground hover:bg-sky-500 hover:text-white transition-colors shrink-0 max-w-24 truncate"
					title={fontTitle}
				>
					{fontTitle}
				</a>
			{/if}
		</div>

		<!-- svelte-ignore a11y_no_static_element_interactions, a11y_no_noninteractive_element_to_interactive_role -->
		<div
			class="flex-1 flex items-center gap-3 p-2.5 pl-3 min-w-0 cursor-pointer"
			onclick={handleClick}
			onkeydown={handleKeydown}
			tabindex="0"
			role="button"
			aria-label={t('aria.open_post', { title: sortedPost.post.title || 'Post' })}
		>
			<h3 class="text-sm font-medium leading-snug truncate flex-1 flex flex-row items-center gap-1.5">
				<span class="truncate">
					{#if sortedPost.post.title?.trim()}
						{sortedPost.post.title}
						{#if sortedPost.post.content?.trim()}
							<span class="text-muted-foreground font-normal ml-1">— {sortedPost.post.content}</span>
						{/if}
					{:else if sortedPost.post.content?.trim()}
						{sortedPost.post.content}
					{/if}
				</span>
				<div class="shrink-0 flex items-center">
					<PriorityBadge level={sortedPost.priority} />
				</div>
			</h3>
		</div>

		<div class="flex items-center gap-4 shrink-0 pr-2.5">
			<time class="text-xs text-muted-foreground whitespace-nowrap text-right" datetime={new Date(sortedPost.post.publishedAt).toISOString()}>
				{formatRelativeDate(sortedPost.post.publishedAt)}
			</time>
			{@render actions()}
		</div>
	</article>

{:else if mode === 'cards'}
	<article
		class="group relative flex rounded-lg border border-border/60 bg-card shadow-sm text-card-foreground transition-all hover:shadow hover:border-sky-500/40 {sortedPost.post.read ? 'opacity-60' : ''}"
	>
		<!-- Font side tab -->
		{#if fontNode}
			<a
				href={fontHref}
				class="relative shrink-0 w-6 rounded-l-lg flex items-center justify-center overflow-hidden transition-colors {sortedPost.post.read ? 'bg-muted/50' : 'bg-sky-900 dark:bg-sky-800'} hover:bg-sky-600 group/font"
				title={fontTitle}
			>
				<span
					class="absolute whitespace-nowrap text-[10px] font-semibold tracking-wide uppercase truncate max-w-30 {sortedPost.post.read ? 'text-muted-foreground' : 'text-sky-50'} group-hover/font:text-white"
					style="writing-mode: vertical-rl; transform: rotate(180deg);"
				>
					{fontTitle}
				</span>
			</a>
		{:else if !sortedPost.post.read}
			<div class="shrink-0 w-1 rounded-l-lg bg-sky-500"></div>
		{/if}

		<div class="flex-1 min-w-0 flex flex-col {fontNode ? '' : 'pl-5'}">
			<!-- svelte-ignore a11y_no_static_element_interactions, a11y_no_noninteractive_element_to_interactive_role -->
			<div
				class="flex-1 p-4 pb-0 flex cursor-pointer"
				onclick={handleClick}
				onkeydown={handleKeydown}
				tabindex="0"
				role="button"
				aria-label={t('aria.open_post', { title: sortedPost.post.title })}
			>
				<div class="flex-1 flex flex-col pr-3">
					<div class="flex items-start justify-between gap-2 mb-1.5">
						<h3 class="text-sm font-semibold leading-snug line-clamp-2 flex-1 group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors">
							{sortedPost.post.title}
						</h3>
						{#if sortedPost.post.url}
							<ExternalLink class="size-3.5 shrink-0 text-muted-foreground/60 mt-0.5" />
						{/if}
					</div>

					{#if sortedPost.post.content}
						<p class="text-xs text-muted-foreground leading-relaxed mb-3 line-clamp-2 flex-1">
							{truncate(sortedPost.post.content, 140)}
						</p>
					{:else}
						<div class="flex-1 mb-3"></div>
					{/if}
				</div>
				
				{#if activePostThumbnail}
					<div class="shrink-0 mb-3">
						<img
							src={activePostThumbnail}
							alt=""
							class="w-28 aspect-video object-cover rounded-md bg-muted border border-border/40 shadow-sm"
							loading="lazy"
							onerror={onPostThumbnailError}
							onload={onPostThumbnailLoad}
						/>
					</div>
				{/if}
			</div>

			<div class="flex items-center justify-between border-t border-border/40 pt-2 pb-2.5 px-4 mt-auto">
				<div class="flex items-center gap-2 text-[11px] text-muted-foreground">
					<time datetime={new Date(sortedPost.post.publishedAt).toISOString()}>
						{formatRelativeDate(sortedPost.post.publishedAt)}
					</time>
					<PriorityBadge level={sortedPost.priority} />
				</div>

				<div class="flex items-center gap-1">
					{#if !sortedPost.post.read}
						<CircleDot class="size-3 text-sky-500 mr-1" />
					{/if}
					{@render actions()}
				</div>
			</div>
		</div>
	</article>

{:else if mode === 'posts'}
	<article
		class="group relative flex flex-col rounded-xl border border-border/80 bg-card shadow-sm text-card-foreground transition-all hover:shadow-md hover:border-sky-500/50 overflow-hidden"
	>
		<!-- Header (Safe Area) -->
		<div class="px-5 pt-3 pb-3 flex items-center justify-between border-b border-border/30 bg-muted/10 {sortedPost.post.read ? 'opacity-70' : ''}">
			<div class="flex items-center gap-2 shrink-0">
				{#if fontNode}
					<a
						href={fontHref}
						class="text-[11px] font-bold tracking-wide uppercase px-2 py-0.5 rounded bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300 hover:bg-sky-500 hover:text-white transition-colors"
						title={fontTitle}
					>
						{fontTitle}
					</a>
				{/if}
				<time class="text-xs text-muted-foreground" datetime={new Date(sortedPost.post.publishedAt).toISOString()}>
					{formatRelativeDate(sortedPost.post.publishedAt)}
				</time>
				<PriorityBadge level={sortedPost.priority} />
			</div>

			<!-- Menu contextuel / Actions -->
			<div class="flex items-center gap-2">
				{#if !sortedPost.post.read}
					<CircleDot class="size-3 text-sky-500 ml-1" />
				{/if}
				{@render actions()}
			</div>
		</div>

		<div class="flex flex-col flex-1">
			<div class="p-5 pb-4 flex flex-col {sortedPost.post.read ? 'opacity-70' : ''}">
				<div class="flex items-start justify-between gap-4 mb-2">
					<h3 class="text-base font-bold leading-snug hover:text-sky-600 dark:hover:text-sky-400 transition-colors">
						{sortedPost.post.title}
					</h3>
					<button
						class="text-xs font-medium px-3 py-1.5 rounded-md bg-sky-500 text-white flex items-center gap-1.5 hover:bg-sky-600 transition-colors shrink-0 shadow-sm mt-0.5 cursor-pointer"
						onclick={handleClick}
						title={t('aria.open_post', { title: sortedPost.post.title })}
					>
						{t('btn.read_more')}
						<ExternalLink class="size-3.5" />
					</button>
				</div>

				{#if sortedPost.post.content}
					<p class="text-sm text-foreground/80 leading-relaxed {postHasMedia ? 'mb-4 line-clamp-3' : 'mb-1 line-clamp-6'}">
						{truncate(sortedPost.post.content, 400)}
					</p>
				{/if}
			</div>

			<PostMedia 
				url={sortedPost.post.url} 
				imageUrl={sortedPost.post.imageUrl} 
				title={sortedPost.post.title} 
				onclick={handleClick} 
			/>
		</div>
	</article>
{/if}