<script lang="ts">
	import { browser } from '$app/environment';
	import { t } from '$lib/i18n/t.js';

	interface Props {
		title: string;
		embedUrl: string;
	}

	let { title, embedUrl }: Props = $props();

	let iframeLoaded = $state(false);
	let preconnected = $state(false);

	let iframeSrc = $derived.by(() => {
		const source = embedUrl?.trim();
		if (!source) return '';

		let parsed: URL;
		try {
			parsed = new URL(source);
		} catch {
			return source;
		}

		const parentHost = browser ? window.location.hostname : 'localhost';
		if (parentHost) {
			parsed.searchParams.set('parent', parentHost);
		}

		if (!parsed.searchParams.has('autoplay')) {
			parsed.searchParams.set('autoplay', 'true');
		}

		return parsed.toString();
	});

	function warmConnection() {
		if (!preconnected) preconnected = true;
	}

	function loadIframe() {
		iframeLoaded = true;
	}
</script>

<svelte:head>
	{#if preconnected}
		<link rel="preconnect" href="https://player.twitch.tv" />
		<link rel="preconnect" href="https://clips.twitch.tv" />
	{/if}
</svelte:head>

<div class="absolute inset-0 z-0 bg-gradient-to-br from-sky-900 via-cyan-800 to-slate-900"></div>

{#if !iframeLoaded}
	<button
		class="absolute inset-0 z-10 w-full h-full border-none p-0 bg-black/15 flex items-center justify-center cursor-pointer group/facade focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 hover:bg-black/5 transition-colors"
		type="button"
		aria-label={t('aria.play_video', { title })}
		onclick={loadIframe}
		onpointerenter={warmConnection}
	>
		<div class="relative flex items-center gap-3 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 text-white transition-transform duration-200 group-hover/facade:scale-105 group-focus-visible/facade:scale-105">
			<div class="w-8 h-8 rounded-full bg-cyan-500 flex items-center justify-center">
				<svg viewBox="0 0 24 24" class="w-4 h-4 fill-white" aria-hidden="true">
					<path d="M8 5.14v13.72a1 1 0 0 0 1.5.86l10.5-6.86a1 1 0 0 0 0-1.72L9.5 4.28A1 1 0 0 0 8 5.14z" />
				</svg>
			</div>
			<span class="text-sm font-medium tracking-wide">Twitch</span>
		</div>
	</button>
{:else}
	<iframe
		class="absolute inset-0 w-full h-full z-20"
		src={iframeSrc}
		title={title}
		frameborder="0"
		allowfullscreen
		scrolling="no"
	></iframe>
{/if}
