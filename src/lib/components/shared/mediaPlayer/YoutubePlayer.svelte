<script lang="ts">
	import { t } from '$lib/i18n/t.js';

	interface Props {
		title: string;
		embedUrl: string;
		thumbnailUrl?: string;
	}

	let { title, embedUrl, thumbnailUrl }: Props = $props();

	// Estado para controlar a Fachada (Facade) do YouTube
	let iframeLoaded = $state(false);
	// Estado para pre-aquecer a conexão (DNS/TLS) no hover
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
		<link rel="preconnect" href="https://www.youtube.com" />
		<link rel="preconnect" href="https://www.google.com" />
	{/if}
</svelte:head>

<!-- Imagem fixa de fundo para evitar tela preta durante o carregamento do Iframe -->
<img src={thumbnailUrl?.replace('mqdefault', 'hqdefault')} alt={title} class="absolute inset-0 w-full h-full object-cover z-0" loading="lazy" />

{#if !iframeLoaded}
	<!-- Fachada Inteligente puramente como camada interativa (Play Button) -->
	<button 
		class="absolute inset-0 z-10 w-full h-full border-none p-0 bg-black/10 flex items-center justify-center cursor-pointer group/facade focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 hover:bg-transparent transition-colors"
		type="button"
		aria-label={t('aria.play_video', { title })}
		onclick={loadIframe}
		onpointerenter={warmConnection}
	>
		<!-- Botão de "Play" estilo YouTube nativo recriado -->
		<div class="relative w-16 h-12 z-20 transition-transform duration-200 group-hover/facade:scale-105 group-focus-visible/facade:scale-105">
			<svg viewBox="0 0 68 48">
				<path class="fill-black/80 transition-colors duration-200 group-hover/facade:fill-[#ff0000] drop-shadow-md" d="M66.52,7.74c-0.78-2.93-2.49-5.41-5.42-6.19C55.79,.13,34,0,34,0S12.21,.13,6.9,1.55C3.97,2.33,2.27,4.81,1.48,7.74C0.06,13.05,0,24,0,24s0.06,10.95,1.48,16.26c0.78,2.93,2.49,5.41,5.42,6.19C12.21,47.87,34,48,34,48s21.79-0.13,27.1-1.55c2.93-0.78,4.64-3.26,5.42-6.19C67.94,34.95,68,24,68,24S67.94,13.05,66.52,7.74z" />
				<path d="M 45,24 27,14 27,34" fill="#fff" />
			</svg>
		</div>
	</button>
{:else}
	<iframe
		class="absolute inset-0 w-full h-full z-20"
		src="{embedUrl}?autoplay=1"
		title={title}
		frameborder="0"
		allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
		allowfullscreen
	></iframe>
{/if}
