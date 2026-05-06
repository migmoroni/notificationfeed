<script lang="ts">
	import UnifiedAudioPlayer from '../shared/mediaPlayer/UnifiedAudioPlayer.svelte';
	import UnifiedEmbedPlayer from '../shared/mediaPlayer/UnifiedEmbedPlayer.svelte';
	import { parseAudioEmbed, parseVideoEmbed } from '$lib/ingestion/media/media.resolver.js';

	interface Props {
		url?: string | null;
		imageUrl?: string | null;
		videoUrl?: string | null;
		audioUrl?: string | null;
		title?: string;
	}

	let { url, imageUrl, videoUrl, audioUrl, title = '' }: Props = $props();

	let videoEmbed = $derived(parseVideoEmbed(videoUrl ?? url));
	let audioEmbed = $derived(videoEmbed ? null : parseAudioEmbed(audioUrl ?? url));
	let showMedia = $derived(videoEmbed !== null || audioEmbed !== null || !!imageUrl);
	const unifiedProviders = new Set(['youtube', 'x', 'twitch', 'dailymotion', 'vimeo', 'rumble', 'internet-archive', 'odysee', 'peertube', 'kick']);
	const unifiedAudioProviders = new Set(['spotify', 'soundcloud']);
</script>

{#if showMedia}
	<div class="w-full border-t border-border/40 overflow-hidden bg-muted">
		{#if videoEmbed?.type === 'iframe'}
			<div class="{videoEmbed.aspectClass} w-full bg-black relative group">
				{#if unifiedProviders.has(videoEmbed.provider)}
					<UnifiedEmbedPlayer
						title={title}
						embedUrl={videoEmbed.embedUrl}
						provider={videoEmbed.provider}
						thumbnailUrl={videoEmbed.thumbnailUrl ?? imageUrl ?? undefined}
					/>
				{:else}
					<iframe
						class="w-full h-full"
						src={videoEmbed.embedUrl}
						title={title}
						frameborder="0"
						allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
						allowfullscreen
						loading="lazy"
					></iframe>
				{/if}
			</div>
		{:else if videoEmbed?.type === 'video'}
			<div class="{videoEmbed.aspectClass} w-full bg-black relative group">
				<!-- svelte-ignore a11y_media_has_caption -->
				<video
					class="w-full h-full"
					src={videoEmbed.videoUrl}
					controls
					preload="metadata"
					playsinline
				></video>
			</div>
		{:else if audioEmbed?.type === 'iframe'}
			<div class="w-full bg-muted">
				{#if imageUrl}
					<div class="w-full bg-muted">
						<img
							src={imageUrl}
							alt={title}
							class="w-full max-h-150 object-contain"
							loading="lazy"
						/>
					</div>
				{/if}

				<div class="{audioEmbed.aspectClass} w-full bg-black relative group">
					{#if unifiedAudioProviders.has(audioEmbed.provider)}
						<UnifiedAudioPlayer
							title={title}
							embedUrl={audioEmbed.embedUrl}
							provider={audioEmbed.provider}
						/>
					{:else}
						<iframe
							class="w-full h-full"
							src={audioEmbed.embedUrl}
							title={title}
							frameborder="0"
							allow="autoplay; clipboard-write; encrypted-media; picture-in-picture"
							loading="lazy"
						></iframe>
					{/if}
				</div>
			</div>
		{:else if audioEmbed?.type === 'audio'}
			<div class="w-full bg-muted">
				{#if imageUrl}
					<div class="w-full bg-muted">
						<img
							src={imageUrl}
							alt={title}
							class="w-full max-h-150 object-contain"
							loading="lazy"
						/>
					</div>
				{/if}

				<div class="w-full bg-muted px-4 py-3">
					<!-- svelte-ignore a11y_media_has_caption -->
					<audio
						class="w-full"
						src={audioEmbed.audioUrl}
						controls
						preload="metadata"
					></audio>
				</div>
			</div>
		{:else if imageUrl}
			<div class="w-full bg-muted">
				<img
					src={imageUrl}
					alt={title}
					class="w-full max-h-150 object-contain"
					loading="lazy"
				/>
			</div>
		{/if}
	</div>
{/if}
