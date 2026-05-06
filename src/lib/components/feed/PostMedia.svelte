<script lang="ts">
	import DailymotionPlayer from '../shared/mediaPlayer/DailymotionPlayer.svelte';
	import InternetArchivePlayer from '../shared/mediaPlayer/InternetArchivePlayer.svelte';
	import { parseEmbed } from '$lib/ingestion/media/media.resolver.js';
	import RumblePlayer from '../shared/mediaPlayer/RumblePlayer.svelte';
	import TwitchPlayer from '../shared/mediaPlayer/TwitchPlayer.svelte';
	import YoutubePlayer from '../shared/mediaPlayer/YoutubePlayer.svelte';
	import VimeoPlayer from '../shared/mediaPlayer/VimeoPlayer.svelte';

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
</script>

{#if showMedia}
	<div class="w-full border-t border-border/40 overflow-hidden bg-muted">
		{#if embed?.type === 'iframe'}
			<div class="{embed.aspectClass} w-full bg-black relative group">
				{#if embed.provider === 'youtube'}
					<YoutubePlayer title={title} embedUrl={embed.embedUrl} thumbnailUrl={embed.thumbnailUrl} />
				{:else if embed.provider === 'twitch'}
					<TwitchPlayer title={title} embedUrl={embed.embedUrl} />
				{:else if embed.provider === 'dailymotion'}
					<DailymotionPlayer title={title} embedUrl={embed.embedUrl} thumbnailUrl={embed.thumbnailUrl} />
				{:else if embed.provider === 'vimeo'}
					<VimeoPlayer title={title} embedUrl={embed.embedUrl} />
				{:else if embed.provider === 'rumble'}
					<RumblePlayer title={title} embedUrl={embed.embedUrl} />
				{:else if embed.provider === 'internet-archive'}
					<InternetArchivePlayer title={title} embedUrl={embed.embedUrl} />
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
