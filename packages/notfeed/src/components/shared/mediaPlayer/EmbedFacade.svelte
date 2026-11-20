<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		title: string;
		iframeSrc: string;
		preconnectUrls: string[];
		iframeAllow?: string;
		iframeAllowFullscreen?: boolean;
		iframeScrolling?: string;
		iframeLazy?: boolean;
		background: Snippet;
		playButton: Snippet<[{ loadIframe: () => void; warmConnection: () => void }]>;
	}

	let {
		title,
		iframeSrc,
		preconnectUrls,
		iframeAllow,
		iframeAllowFullscreen = true,
		iframeScrolling,
		iframeLazy,
		background,
		playButton,
	}: Props = $props();

	let iframeLoaded = $state(false);
	let preconnected = $state(false);

	function warmConnection() {
		if (!preconnected) preconnected = true;
	}

	function loadIframe() {
		iframeLoaded = true;
	}
</script>

<svelte:head>
	{#if preconnected}
		{#each preconnectUrls as url (url)}
			<link rel="preconnect" href={url} />
		{/each}
	{/if}
</svelte:head>

{@render background()}

{#if !iframeLoaded}
	{@render playButton({ loadIframe, warmConnection })}
{:else}
	<iframe
		class="absolute inset-0 w-full h-full z-20"
		src={iframeSrc}
		{title}
		frameborder="0"
		allow={iframeAllow}
		scrolling={iframeScrolling}
		loading={iframeLazy ? 'lazy' : undefined}
		allowfullscreen={iframeAllowFullscreen || undefined}
	></iframe>
{/if}
