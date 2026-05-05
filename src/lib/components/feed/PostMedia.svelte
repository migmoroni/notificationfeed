<script lang="ts">
	import { getImageQualityCandidates, parseEmbed, rememberWorkingImageCandidate } from '$lib/utils/media.js';
	import YoutubePlayer from '../shared/mediaPlayer/YoutubePlayer.svelte';

	interface Props {
		url?: string | null;
		imageUrl?: string | null;
		title?: string;
		onclick?: () => void;
	}

	let { url, imageUrl, title = '', onclick }: Props = $props();

	let embed = $derived(parseEmbed(url));
	let imageCandidates = $derived(getImageQualityCandidates(imageUrl));
	let activeImageCandidateIndex = $state(0);
	let activeImageUrl = $derived(imageCandidates[activeImageCandidateIndex] ?? null);
	let showMedia = $derived(embed !== null || imageCandidates.length > 0);

	$effect(() => {
		imageUrl;
		activeImageCandidateIndex = 0;
	});

	function onImageError() {
		if (activeImageCandidateIndex >= imageCandidates.length - 1) return;
		activeImageCandidateIndex += 1;
	}

	function onImageLoad() {
		rememberWorkingImageCandidate(imageUrl, activeImageUrl);
	}
</script>

{#if showMedia}
	<div class="w-full border-t border-border/40 overflow-hidden bg-muted">
		{#if embed?.type === 'iframe'}
			<div class="{embed.aspectClass} w-full bg-black relative group">
				{#if embed.provider === 'youtube'}
					<YoutubePlayer title={title} embedUrl={embed.embedUrl} thumbnailUrl={embed.thumbnailUrl} />
				{:else}
					<iframe
						class="w-full h-full"
						src={embed.embedUrl}
						title={title}
						frameborder="0"
						allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
						allowfullscreen
						loading="lazy"
					></iframe>
				{/if}
			</div>
		{:else if activeImageUrl}
			<!-- svelte-ignore a11y_click_events_have_key_events -->
			<!-- svelte-ignore a11y_no_static_element_interactions -->
			<div class="w-full cursor-pointer bg-muted" {onclick} aria-hidden="true">
				<img
					src={activeImageUrl}
					alt={title}
					class="w-full max-h-150 object-contain hover:opacity-95 transition-opacity"
					loading="lazy"
					onerror={onImageError}
					onload={onImageLoad}
				/>
			</div>
		{/if}
	</div>
{/if}
