<script lang="ts">
	import UnifiedEmbedPlayer from '../shared/mediaPlayer/UnifiedEmbedPlayer.svelte';
	import { parseEmbed } from '$lib/ingestion/media/media.resolver.js';

	interface Props {
		url?: string | null;
		imageUrl?: string | null;
		videoUrl?: string | null;
		title?: string;
		onclick?: () => void;
	}

	let { url, imageUrl, videoUrl, title = '', onclick }: Props = $props();

	let mediaUrl = $derived(videoUrl ?? url);
	let embed = $derived(parseEmbed(mediaUrl));
	let showMedia = $derived(embed !== null || !!imageUrl);
	const unifiedProviders = new Set(['youtube', 'x', 'twitch', 'dailymotion', 'vimeo', 'rumble', 'internet-archive', 'odysee', 'peertube', 'kick']);
</script>

{#if showMedia}
	<div class="w-full border-t border-border/40 overflow-hidden bg-muted">
		{#if embed?.type === 'iframe'}
			<div class="{embed.aspectClass} w-full bg-black relative group">
				{#if unifiedProviders.has(embed.provider)}
					<UnifiedEmbedPlayer
						title={title}
						embedUrl={embed.embedUrl}
						provider={embed.provider}
						thumbnailUrl={embed.thumbnailUrl}
					/>
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
		{:else if embed?.type === 'video'}
			<div class="{embed.aspectClass} w-full bg-black relative group">
				<!-- svelte-ignore a11y_media_has_caption -->
				<video
					class="w-full h-full"
					src={embed.videoUrl}
					controls
					preload="metadata"
					playsinline
				></video>
			</div>
		{:else if imageUrl}
			<!-- svelte-ignore a11y_click_events_have_key_events -->
			<!-- svelte-ignore a11y_no_static_element_interactions -->
			<div class="w-full cursor-pointer bg-muted" {onclick} aria-hidden="true">
				<img
					src={imageUrl}
					alt={title}
					class="w-full max-h-150 object-contain hover:opacity-95 transition-opacity"
					loading="lazy"
				/>
			</div>
		{/if}
	</div>
{/if}
