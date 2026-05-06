<script lang="ts">
	import { browser } from '$app/environment';
	import { t } from '$lib/i18n/t.js';

	type SupportedProvider =
		| 'youtube'
		| 'x'
		| 'twitch'
		| 'dailymotion'
		| 'vimeo'
		| 'rumble'
		| 'internet-archive'
		| 'odysee'
		| 'peertube'
		| 'kick';

	interface ProviderSpec {
		preconnectUrls: string[];
		label: string;
		backgroundClass: string;
		buttonClass: string;
		iconBgClass: string;
		iframeAllow?: string;
		iframeAllowFullscreen?: boolean;
		iframeScrolling?: string;
		iframeLazy?: boolean;
		appendAutoplay?: boolean;
		appendAutoplayValue?: string;
	}

	// Keep class names static for Tailwind extraction.
	const providerSpecs: Record<SupportedProvider, ProviderSpec> = {
		youtube: {
			preconnectUrls: ['https://www.youtube.com', 'https://www.google.com'],
			label: 'YouTube',
			backgroundClass: 'bg-linear-to-br from-zinc-900 via-zinc-800 to-black',
			buttonClass: 'bg-black/10 hover:bg-transparent focus-visible:ring-sky-500',
			iconBgClass: 'bg-red-600',
			iframeAllow: 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share',
			appendAutoplay: true,
		},
		x: {
			preconnectUrls: ['https://platform.twitter.com', 'https://x.com'],
			label: 'Post',
			backgroundClass: 'bg-linear-to-br from-slate-900 via-neutral-800 to-black',
			buttonClass: 'bg-black/20 hover:bg-black/10 focus-visible:ring-neutral-400',
			iconBgClass: 'bg-white',
			iframeAllow: 'autoplay; clipboard-write; encrypted-media; picture-in-picture',
			iframeAllowFullscreen: false,
			iframeLazy: true,
		},
		twitch: {
			preconnectUrls: ['https://player.twitch.tv', 'https://clips.twitch.tv'],
			label: 'Twitch',
			backgroundClass: 'bg-linear-to-br from-sky-900 via-cyan-800 to-slate-900',
			buttonClass: 'bg-black/15 hover:bg-black/5 focus-visible:ring-cyan-400',
			iconBgClass: 'bg-cyan-500',
			iframeScrolling: 'no',
		},
		dailymotion: {
			preconnectUrls: ['https://www.dailymotion.com', 'https://dailymotion.com'],
			label: 'Dailymotion',
			backgroundClass: 'bg-linear-to-br from-sky-900 via-sky-800 to-slate-900',
			buttonClass: 'bg-black/15 hover:bg-black/5 focus-visible:ring-sky-400',
			iconBgClass: 'bg-sky-500',
			iframeAllow: 'autoplay; fullscreen; picture-in-picture; clipboard-write; encrypted-media',
			appendAutoplay: true,
		},
		vimeo: {
			preconnectUrls: ['https://player.vimeo.com', 'https://i.vimeocdn.com'],
			label: 'Vimeo',
			backgroundClass: 'bg-linear-to-br from-slate-900 via-slate-800 to-slate-900',
			buttonClass: 'bg-black/15 hover:bg-black/5 focus-visible:ring-sky-500',
			iconBgClass: 'bg-sky-500',
			iframeAllow: 'autoplay; fullscreen; picture-in-picture; clipboard-write; encrypted-media',
			appendAutoplay: true,
		},
		rumble: {
			preconnectUrls: ['https://rumble.com'],
			label: 'Rumble',
			backgroundClass: 'bg-linear-to-br from-emerald-900 via-emerald-800 to-slate-900',
			buttonClass: 'bg-black/15 hover:bg-black/5 focus-visible:ring-emerald-400',
			iconBgClass: 'bg-emerald-500',
			iframeAllow: 'autoplay; fullscreen; picture-in-picture; clipboard-write; encrypted-media',
		},
		'internet-archive': {
			preconnectUrls: ['https://archive.org'],
			label: 'Internet Archive',
			backgroundClass: 'bg-linear-to-br from-amber-900 via-amber-800 to-slate-900',
			buttonClass: 'bg-black/15 hover:bg-black/5 focus-visible:ring-amber-400',
			iconBgClass: 'bg-amber-500',
			iframeAllow: 'autoplay; fullscreen; picture-in-picture; clipboard-write; encrypted-media',
		},
		odysee: {
			preconnectUrls: ['https://odysee.com'],
			label: 'Odysee',
			backgroundClass: 'bg-linear-to-br from-orange-900 via-amber-800 to-slate-900',
			buttonClass: 'bg-black/15 hover:bg-black/5 focus-visible:ring-orange-400',
			iconBgClass: 'bg-orange-500',
			iframeAllow: 'autoplay; fullscreen; picture-in-picture; clipboard-write; encrypted-media',
		},
		peertube: {
			preconnectUrls: [],
			label: 'PeerTube',
			backgroundClass: 'bg-linear-to-br from-teal-900 via-cyan-800 to-slate-900',
			buttonClass: 'bg-black/15 hover:bg-black/5 focus-visible:ring-teal-400',
			iconBgClass: 'bg-teal-500',
			iframeAllow: 'autoplay; fullscreen; picture-in-picture; clipboard-write; encrypted-media',
		},
		kick: {
			preconnectUrls: ['https://player.kick.com', 'https://kick.com'],
			label: 'Kick',
			backgroundClass: 'bg-linear-to-br from-lime-900 via-emerald-800 to-slate-900',
			buttonClass: 'bg-black/15 hover:bg-black/5 focus-visible:ring-lime-400',
			iconBgClass: 'bg-lime-500',
			iframeAllow: 'autoplay; fullscreen; picture-in-picture; clipboard-write; encrypted-media',
			iframeScrolling: 'no',
			appendAutoplay: true,
			appendAutoplayValue: 'true',
		},
	};

	const defaultSpec: ProviderSpec = {
		preconnectUrls: [],
		label: 'Video',
		backgroundClass: 'bg-linear-to-br from-slate-900 via-slate-800 to-slate-900',
		buttonClass: 'bg-black/15 hover:bg-black/5 focus-visible:ring-sky-400',
		iconBgClass: 'bg-sky-500',
		iframeAllow: 'autoplay; fullscreen; picture-in-picture; clipboard-write; encrypted-media',
	};

	function isSupportedProvider(provider: string): provider is SupportedProvider {
		return provider in providerSpecs;
	}

	function withParam(url: string, key: string, value: string): string {
		let parsed: URL;
		try {
			parsed = new URL(url);
		} catch {
			const separator = url.includes('?') ? '&' : '?';
			return `${url}${separator}${encodeURIComponent(key)}=${encodeURIComponent(value)}`;
		}

		if (!parsed.searchParams.has(key)) {
			parsed.searchParams.set(key, value);
		}

		return parsed.toString();
	}

	function buildTwitchIframeSrc(url: string): string {
		let parsed: URL;
		try {
			parsed = new URL(url);
		} catch {
			return withParam(url, 'autoplay', 'true');
		}

		const parentHost = browser ? window.location.hostname : 'localhost';
		if (parentHost) {
			parsed.searchParams.set('parent', parentHost);
		}

		if (!parsed.searchParams.has('autoplay')) {
			parsed.searchParams.set('autoplay', 'true');
		}

		return parsed.toString();
	}

	interface Props {
		title: string;
		embedUrl: string;
		provider: string;
		thumbnailUrl?: string;
	}

	let { title, embedUrl, provider, thumbnailUrl }: Props = $props();

	let iframeLoaded = $state(false);
	let preconnected = $state(false);

	const activeProvider = $derived.by(() => {
		return isSupportedProvider(provider) ? provider : null;
	});

	const spec = $derived.by(() => {
		if (!activeProvider) return defaultSpec;
		return providerSpecs[activeProvider];
	});

	const iframeSrc = $derived.by(() => {
		const source = embedUrl?.trim();
		if (!source) return '';

		if (activeProvider === 'twitch') {
			return buildTwitchIframeSrc(source);
		}

		if (spec.appendAutoplay) {
			return withParam(source, 'autoplay', spec.appendAutoplayValue ?? '1');
		}

		return source;
	});

	const youtubeThumbnail = $derived.by(() => {
		if (!thumbnailUrl) return undefined;
		return thumbnailUrl.replace('mqdefault', 'hqdefault');
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
		{#each spec.preconnectUrls as url (url)}
			<link rel="preconnect" href={url} />
		{/each}
	{/if}
</svelte:head>

{#if activeProvider === 'youtube' && youtubeThumbnail}
	<img src={youtubeThumbnail} alt={title} class="absolute inset-0 w-full h-full object-cover z-0" loading="lazy" />
{:else if activeProvider === 'dailymotion' && thumbnailUrl}
	<img src={thumbnailUrl} alt={title} class="absolute inset-0 w-full h-full object-cover z-0" loading="lazy" />
{:else}
	<div class="absolute inset-0 z-0 {spec.backgroundClass}"></div>
{/if}

{#if !iframeLoaded}
	{#if activeProvider === 'youtube'}
		<button
			class="absolute inset-0 z-10 w-full h-full border-none p-0 {spec.buttonClass} flex items-center justify-center cursor-pointer group/facade focus-visible:outline-none focus-visible:ring-2 transition-colors"
			type="button"
			aria-label={t('aria.play_video', { title })}
			onclick={loadIframe}
			onpointerenter={warmConnection}
		>
			<div class="relative w-16 h-12 z-20 transition-transform duration-200 group-hover/facade:scale-105 group-focus-visible/facade:scale-105">
				<svg viewBox="0 0 68 48">
					<path class="fill-black/80 transition-colors duration-200 group-hover/facade:fill-[#ff0000] drop-shadow-md" d="M66.52,7.74c-0.78-2.93-2.49-5.41-5.42-6.19C55.79,.13,34,0,34,0S12.21,.13,6.9,1.55C3.97,2.33,2.27,4.81,1.48,7.74C0.06,13.05,0,24,0,24s0.06,10.95,1.48,16.26c0.78,2.93,2.49,5.41,5.42,6.19C12.21,47.87,34,48,34,48s21.79-0.13,27.1-1.55c2.93-0.78,4.64-3.26,5.42-6.19C67.94,34.95,68,24,68,24S67.94,13.05,66.52,7.74z" />
					<path d="M 45,24 27,14 27,34" fill="#fff" />
				</svg>
			</div>
		</button>
	{:else}
		<button
			class="absolute inset-0 z-10 w-full h-full border-none p-0 {spec.buttonClass} flex items-center justify-center cursor-pointer group/facade focus-visible:outline-none focus-visible:ring-2 transition-colors"
			type="button"
			aria-label={t('aria.play_video', { title })}
			onclick={loadIframe}
			onpointerenter={warmConnection}
		>
			<div class="relative flex items-center gap-3 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 text-white transition-transform duration-200 group-hover/facade:scale-105 group-focus-visible/facade:scale-105">
				<div class="w-8 h-8 rounded-full {spec.iconBgClass} flex items-center justify-center">
					{#if activeProvider === 'x'}
						<span class="text-black font-semibold text-sm">X</span>
					{:else}
						<svg viewBox="0 0 24 24" class="w-4 h-4 fill-white" aria-hidden="true">
							<path d="M8 5.14v13.72a1 1 0 0 0 1.5.86l10.5-6.86a1 1 0 0 0 0-1.72L9.5 4.28A1 1 0 0 0 8 5.14z" />
						</svg>
					{/if}
				</div>
				<span class="text-sm font-medium tracking-wide">{spec.label}</span>
			</div>
		</button>
	{/if}
{:else}
	<iframe
		class="absolute inset-0 w-full h-full z-20"
		src={iframeSrc}
		{title}
		frameborder="0"
		allow={spec.iframeAllow}
		scrolling={spec.iframeScrolling}
		loading={spec.iframeLazy ? 'lazy' : undefined}
		allowfullscreen={(spec.iframeAllowFullscreen ?? true) || undefined}
	></iframe>
{/if}
