<script lang="ts">
	import { parseEmbed } from '$lib/utils/media.js';

	interface Props {
		url?: string | null;
		imageUrl?: string | null;
		title?: string;
		onclick?: () => void;
	}

	let { url, imageUrl, title = '', onclick }: Props = $props();

	let embed = $derived(parseEmbed(url));
	let showMedia = $derived(embed !== null || !!imageUrl);
</script>

{#if showMedia}
	<div class="w-full border-t border-border/40 overflow-hidden bg-muted">
		{#if embed?.type === 'iframe'}
			<div class="{embed.aspectClass} w-full bg-black">
				<iframe
					class="w-full h-full"
					src={embed.embedUrl}
					title={title}
					frameborder="0"
					allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
					allowfullscreen
					loading="lazy"
				></iframe>
			</div>
		{:else if imageUrl}
			<!-- svelte-ignore a11y_click_events_have_key_events -->
			<!-- svelte-ignore a11y_no_static_element_interactions -->
			<div class="w-full cursor-pointer bg-muted" {onclick} aria-hidden="true">
				<img src={imageUrl} alt={title} class="w-full max-h-150 object-contain hover:opacity-95 transition-opacity" loading="lazy" />
			</div>
		{/if}
	</div>
{/if}
