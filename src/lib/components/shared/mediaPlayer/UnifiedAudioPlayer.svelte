<script lang="ts">
	import { t } from '$lib/i18n/t.js';
	import EmbedFacade from './EmbedFacade.svelte';

	type SupportedAudioProvider = 'spotify' | 'soundcloud';

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
	}

	const providerSpecs: Record<SupportedAudioProvider, ProviderSpec> = {
		spotify: {
			preconnectUrls: ['https://open.spotify.com'],
			label: 'Spotify',
			backgroundClass: 'bg-linear-to-br from-emerald-900 via-emerald-800 to-slate-900',
			buttonClass: 'bg-black/15 hover:bg-black/5 focus-visible:ring-emerald-400',
			iconBgClass: 'bg-emerald-500',
			iframeAllow: 'autoplay; clipboard-write; encrypted-media; picture-in-picture',
			iframeAllowFullscreen: false,
		},
		soundcloud: {
			preconnectUrls: ['https://w.soundcloud.com', 'https://soundcloud.com'],
			label: 'SoundCloud',
			backgroundClass: 'bg-linear-to-br from-orange-900 via-amber-800 to-slate-900',
			buttonClass: 'bg-black/15 hover:bg-black/5 focus-visible:ring-orange-400',
			iconBgClass: 'bg-orange-500',
			iframeAllow: 'autoplay; clipboard-write; encrypted-media; picture-in-picture',
			iframeAllowFullscreen: false,
			iframeScrolling: 'no',
		},
	};

	const defaultSpec: ProviderSpec = {
		preconnectUrls: [],
		label: 'Audio',
		backgroundClass: 'bg-linear-to-br from-slate-900 via-slate-800 to-slate-900',
		buttonClass: 'bg-black/15 hover:bg-black/5 focus-visible:ring-sky-400',
		iconBgClass: 'bg-sky-500',
		iframeAllow: 'autoplay; clipboard-write; encrypted-media; picture-in-picture',
		iframeAllowFullscreen: false,
	};

	function isSupportedAudioProvider(provider: string): provider is SupportedAudioProvider {
		return provider in providerSpecs;
	}

	interface Props {
		title: string;
		embedUrl: string;
		provider: string;
	}

	let { title, embedUrl, provider }: Props = $props();

	const activeProvider = $derived.by(() => {
		return isSupportedAudioProvider(provider) ? provider : null;
	});

	const spec = $derived.by(() => {
		if (!activeProvider) return defaultSpec;
		return providerSpecs[activeProvider];
	});

	const iframeSrc = $derived.by(() => embedUrl?.trim() ?? '');
</script>

<EmbedFacade
	{title}
	{iframeSrc}
	preconnectUrls={spec.preconnectUrls}
	iframeAllow={spec.iframeAllow}
	iframeAllowFullscreen={spec.iframeAllowFullscreen}
	iframeScrolling={spec.iframeScrolling}
	iframeLazy={spec.iframeLazy}
>
	{#snippet background()}
		<div class="absolute inset-0 z-0 {spec.backgroundClass}"></div>
	{/snippet}

	{#snippet playButton({ loadIframe, warmConnection })}
		<button
			class="absolute inset-0 z-10 w-full h-full border-none p-0 {spec.buttonClass} flex items-center justify-center cursor-pointer group/facade focus-visible:outline-none focus-visible:ring-2 transition-colors"
			type="button"
			aria-label={t('aria.play_video', { title })}
			onclick={loadIframe}
			onpointerenter={warmConnection}
		>
			<div class="relative flex items-center gap-3 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 text-white transition-transform duration-200 group-hover/facade:scale-105 group-focus-visible/facade:scale-105">
				<div class="w-8 h-8 rounded-full {spec.iconBgClass} flex items-center justify-center">
					<svg viewBox="0 0 24 24" class="w-4 h-4 fill-white" aria-hidden="true">
						<path d="M12 3a1 1 0 0 1 1 1v8.12a3 3 0 1 1-2 0V4a1 1 0 0 1 1-1zM7.75 8.25a.75.75 0 0 1 1.5 0v6a4.75 4.75 0 0 0 9.5 0v-6a.75.75 0 0 1 1.5 0v6a6.25 6.25 0 0 1-12.5 0z" />
					</svg>
				</div>
				<span class="text-sm font-medium tracking-wide">{spec.label}</span>
			</div>
		</button>
	{/snippet}
</EmbedFacade>
