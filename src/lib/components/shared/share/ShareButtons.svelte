<script lang="ts">
	import Share2 from '@lucide/svelte/icons/share-2';
	import { t } from '$lib/i18n/t.js';
	import {
		shareTwitter, shareLinkedIn, shareBluesky, shareFacebook,
		shareWhatsApp, shareTelegram, shareSignal, shareReddit,
		sharePinterest, shareThreads, shareEmail, shareTumblr, shareHN,
		nativeShare
	} from '$lib/utils/share.js';

	interface Props {
		title?: string;
		text?: string;
		url: string;
		onShare?: () => void;
	}

	let { title = '', text = '', url, onShare }: Props = $props();

	let canNativeShare = $state(false);

	$effect(() => {
		canNativeShare = typeof navigator !== 'undefined' && !!navigator.share;
	});

	function handle(fn: (opts: { url: string, title?: string, text?: string }) => void | Promise<void>) {
		return async () => {
			await fn({ url, title, text });
			if (onShare) onShare();
		};
	}

	function shareLabel(platform: string) {
		return t('post.action.share_on', { platform });
	}

	const btnBase = 'inline-flex items-center justify-center rounded-full p-2.5 transition-all duration-200 hover:scale-110 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';
</script>

<div class="flex flex-col gap-5">
	
	<!-- Mensageiros -->
	<div class="flex flex-col gap-2.5">
		<span class="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest text-center">{t('post.action.share_message')}</span>
		<div class="flex flex-wrap items-center justify-center gap-2 md:gap-3">
			<button 
				onclick={handle(shareWhatsApp)} 
				class="{btnBase} text-muted-foreground hover:text-[#25D366] hover:bg-green-50 dark:hover:bg-green-950/30"
				aria-label={shareLabel('WhatsApp')} title={shareLabel('WhatsApp')}
			>
				<svg class="size-6" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
			</button>
			<button 
				onclick={handle(shareTelegram)} 
				class="{btnBase} text-muted-foreground hover:text-[#26A5E4] hover:bg-sky-50 dark:hover:bg-sky-950/30"
				aria-label={shareLabel('Telegram')} title={shareLabel('Telegram')}
			>
				<svg class="size-6" viewBox="0 0 24 24" fill="currentColor"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>
			</button>
			<button 
				onclick={handle(shareSignal)} 
				class="{btnBase} text-muted-foreground hover:text-[#3A76F0] hover:bg-blue-50 dark:hover:bg-blue-950/30"
				aria-label={shareLabel('Signal')} title={shareLabel('Signal')}
			>
				<svg class="size-6" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.373 0 0 5.373 0 12c0 2.917 1.043 5.59 2.775 7.67l-.924 3.405 3.52-.916A11.94 11.94 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm5.636 16.375c-.236.666-1.385 1.312-1.907 1.35-.522.04-1.005.248-3.396-.707-2.88-1.15-4.673-4.108-4.814-4.298-.14-.19-1.15-1.533-1.15-2.924s.728-2.074.986-2.356c.258-.282.565-.353.753-.353.188 0 .376.002.54.01.174.008.407-.066.637.487.236.565.8 1.953.87 2.094.07.14.118.306.023.496-.094.19-.14.306-.282.472-.14.166-.297.37-.424.496-.14.142-.287.296-.123.58.164.283.728 1.2 1.563 1.945 1.074.957 1.98 1.254 2.263 1.394.282.14.447.118.612-.07.164-.19.706-.824.895-1.107.188-.282.376-.235.636-.14.258.093 1.644.776 1.926.917.282.14.47.212.54.33.07.117.07.682-.166 1.348z"/></svg>
			</button>
		</div>
	</div>

	<!-- Redes Sociais -->
	<div class="flex flex-col gap-2.5">
		<span class="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest text-center">{t('post.action.share_social')}</span>
		<div class="flex flex-wrap items-center justify-center gap-2 md:gap-3">
			<button 
				onclick={handle(shareBluesky)} 
				class="{btnBase} text-muted-foreground hover:text-[#0085FF] hover:bg-blue-50 dark:hover:bg-blue-950/30"
				aria-label={shareLabel('Bluesky')} title={shareLabel('Bluesky')}
			>
				<svg class="size-6" viewBox="0 0 24 24" fill="currentColor"><path d="M12 10.8c-1.087-2.114-4.046-6.053-6.798-7.995C2.566.944 1.561 1.266.902 1.565.139 1.908 0 3.08 0 3.768c0 .69.378 5.65.624 6.479.785 2.627 3.59 3.513 6.182 3.2-4.574.654-8.675 2.242-5.471 7.886 3.535 5.236 5.887.158 6.665-2.333.553-1.77.801-3.602.801-3.602s.248 1.832.801 3.602c.778 2.491 3.13 7.569 6.665 2.333 3.203-5.644-.897-7.232-5.471-7.886 2.591.313 5.397-.573 6.182-3.2.246-.829.624-5.789.624-6.479 0-.688-.139-1.86-.902-2.203-.659-.3-1.664-.62-4.3 1.24C14.046 4.747 11.087 8.686 12 10.8z"/></svg>
			</button>
			<button 
				onclick={handle(shareThreads)} 
				class="{btnBase} text-muted-foreground hover:text-zinc-900 hover:bg-zinc-100 dark:hover:text-zinc-50 dark:hover:bg-zinc-800"
				aria-label={shareLabel('Threads')} title={shareLabel('Threads')}
			>
				<svg class="size-6" viewBox="0 0 24 24" fill="currentColor"><path d="M16.92 11.75c-.13-.39-.24-.76-.32-1.12-1.3-.23-2.62-.23-3.92-.02.43 1.15.54 2.4.31 3.62-1.42.06-2.58-.95-2.61-2.18-.03-1.66 1.4-2.89 3.01-2.67.65.09 1.25.4 1.73.9.15-.34.33-.67.53-.98-1.07-1.14-2.57-1.81-4.16-1.85-2.74-.06-5.08 2.1-5.11 4.71-.03 2.7 2.01 4.96 4.8 5.16 2.15.15 3.99-1.05 4.83-2.58.55.51 1.26.83 2.03.88 1.41.08 2.7-.82 3.1-2.07.41-1.3-.24-2.91-2.8-2.94-1.22.49-1.3 1.76-.08 1.83 1.54-.04 1.34 1.21.91 1.75-.43.52-1.09.68-1.78.53-.59 0-1.12-.3-1.46-.8-.68 1.14-1.92 1.84-3.23 1.72-2.15-.19-3.79-2.04-3.74-4.22.04-2.02 1.78-3.66 3.93-3.61 1.71.05 3.16 1.12 3.75 2.68.1.37.21.75.33 1.13.06.2.22.37.42.48.21.1.45.1.66.02.42-.16.65-.63.5-1.05zm5.1-1.1c-.05-2.08-1.07-4.05-2.73-5.32C17.61 4.07 15.5 3.4 13.3 3.6 7.42 4.14 3.01 8.83 3 14.52c0 2.21.84 4.3 2.37 5.92 1.52 1.63 3.62 2.63 5.86 2.76.71.04 1.43 0 2.12-.13.35-.06.59-.39.53-.74-.06-.35-.39-.59-.74-.53-.58.11-1.19.14-1.79.1C9.46 21.8 7.69 20.95 6.4 19.57 5.09 18.2 4.38 16.42 4.38 14.55c.01-4.8 3.74-8.8 8.7-9.25 1.86-.17 3.64.4 5 1.47 1.38 1.07 2.29 2.73 2.37 4.54.06 2.64-1.91 5.3-4.5 5.51-.79.07-1.57-.27-2.01-.84l-.06-.08c.55 1.01 1.55 1.65 2.71 1.54 3.28-.27 5.76-3.4 5.43-6.79z" clip-rule="evenodd" /></svg>
			</button>
			<button 
				onclick={handle(shareTwitter)} 
				class="{btnBase} text-muted-foreground hover:text-zinc-900 hover:bg-zinc-100 dark:hover:text-zinc-50 dark:hover:bg-zinc-800"
				aria-label={shareLabel('X (Twitter)')} title={shareLabel('X (Twitter)')}
			>
				<svg class="size-6" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
			</button>
			<button 
				onclick={handle(shareFacebook)} 
				class="{btnBase} text-muted-foreground hover:text-[#1877F2] hover:bg-blue-50 dark:hover:bg-blue-950/30"
				aria-label={shareLabel('Facebook')} title={shareLabel('Facebook')}
			>
				<svg class="size-6" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.469h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
			</button>
			<button 
				onclick={handle(shareLinkedIn)} 
				class="{btnBase} text-muted-foreground hover:text-[#0A66C2] hover:bg-blue-50 dark:hover:bg-blue-950/30"
				aria-label={shareLabel('LinkedIn')} title={shareLabel('LinkedIn')}
			>
				<svg class="size-6" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
			</button>
			<button 
				onclick={handle(shareReddit)} 
				class="{btnBase} text-muted-foreground hover:text-[#FF4500] hover:bg-orange-50 dark:hover:bg-orange-950/30"
				aria-label={shareLabel('Reddit')} title={shareLabel('Reddit')}
			>
				<svg class="size-6" viewBox="0 0 24 24" fill="currentColor"><path d="M24 11.5c0-1.65-1.35-3-3-3-.96 0-1.86.48-2.42 1.24-1.64-1-3.75-1.64-6.07-1.72.08-1.1.4-3.05 1.52-3.7.72-.4 1.73-.24 3 .5C17.2 6.3 18.46 7.5 20 7.5c1.65 0 3-1.35 3-3s-1.35-3-3-3c-1.38 0-2.54.94-2.88 2.22-1.43-.72-2.64-.8-3.6-.25-1.64.94-1.95 3.47-2 4.55-2.33.08-4.45.7-6.1 1.72C4.86 8.98 3.96 8.5 3 8.5c-1.65 0-3 1.35-3 3 0 1.32.84 2.44 2.05 2.84-.03.22-.05.44-.05.66 0 3.86 4.5 7 10 7s10-3.14 10-7c0-.22-.02-.44-.05-.66 1.2-.4 2.05-1.54 2.05-2.84zM2.3 13.37C1.5 13.07 1 12.35 1 11.5c0-1.1.9-2 2-2 .64 0 1.22.32 1.6.82-1.1.85-1.92 1.9-2.3 3.05zm3.7.13c0-1.1.9-2 2-2s2 .9 2 2-.9 2-2 2-2-.9-2-2zm9.8 4.8c-1.08.63-2.42.96-3.8.96-1.4 0-2.74-.34-3.8-.95-.24-.13-.32-.44-.2-.68.15-.24.46-.32.7-.18 1.83 1.06 4.76 1.06 6.6 0 .23-.13.53-.05.67.2.14.23.06.54-.18.67zm.2-2.8c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm5.7-2.13c-.38-1.16-1.2-2.2-2.3-3.05.38-.5.97-.82 1.6-.82 1.1 0 2 .9 2 2 0 .84-.53 1.57-1.3 1.87z"/></svg>
			</button>
			<button 
				onclick={handle(sharePinterest)} 
				class="{btnBase} text-muted-foreground hover:text-[#E60023] hover:bg-red-50 dark:hover:bg-red-950/30"
				aria-label={shareLabel('Pinterest')} title={shareLabel('Pinterest')}
			>
				<svg class="size-6" viewBox="0 0 24 24" fill="currentColor"><path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.162-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.957 1.406-5.957s-.359-.72-.359-1.781c0-1.663.967-2.911 2.168-2.911 1.024 0 1.518.769 1.518 1.688 0 1.029-.653 2.567-.992 3.992-.285 1.193.6 2.165 1.775 2.165 2.128 0 3.768-2.245 3.768-5.487 0-2.861-2.063-4.869-5.008-4.869-3.41 0-5.409 2.562-5.409 5.199 0 1.033.394 2.143.889 2.741.099.12.112.225.085.345-.09.375-.293 1.199-.334 1.363-.053.225-.172.271-.401.165-1.495-.69-2.433-2.878-2.433-4.646 0-3.776 2.748-7.252 7.951-7.252 4.168 0 7.392 2.967 7.392 6.923 0 4.135-2.607 7.462-6.233 7.462-1.214 0-2.354-.629-2.758-1.379l-.749 2.848c-.269 1.045-1.004 2.352-1.498 3.146 1.123.345 2.306.535 3.55.535 6.607 0 11.985-5.365 11.985-11.987C23.97 5.367 18.592 0 12.017 0z"/></svg>
			</button>
			<button 
				onclick={handle(shareTumblr)} 
				class="{btnBase} text-muted-foreground hover:text-[#36465D] hover:bg-blue-50 dark:hover:bg-blue-950/30"
				aria-label={shareLabel('Tumblr')} title={shareLabel('Tumblr')}
			>
				<svg class="size-6" viewBox="0 0 24 24" fill="currentColor"><path d="M14.563 24c-5.093 0-7.031-3.756-7.031-6.411V9.747H5.116V6.648c3.63-1.313 4.512-4.596 4.71-6.469C9.84.051 9.941 0 9.999 0h3.517v6.114h4.801v3.633h-4.82v7.47c.016 1.001.375 2.371 2.207 2.371h.09c.631-.02 1.486-.205 1.936-.419l1.156 3.425c-.436.636-2.4 1.364-4.323 1.406z"/></svg>
			</button>
			<button 
				onclick={handle(shareHN)} 
				class="{btnBase} text-muted-foreground hover:text-[#FF6600] hover:bg-orange-50 dark:hover:bg-orange-950/30"
				aria-label={shareLabel('Hacker News')} title={shareLabel('Hacker News')}
			>
				<svg class="size-6" viewBox="0 0 24 24" fill="currentColor"><path d="M0 24V0h24v24H0zM6.951 5.896l4.112 7.708v5.064h1.583v-4.972l4.148-7.799h-1.749l-2.457 4.875c-.372.745-.688 1.434-.688 1.434s-.297-.708-.651-1.434L8.831 5.896h-1.88z"/></svg>
			</button>
		</div>
	</div>

	<!-- Outros / Email -->
	<div class="flex flex-col gap-2.5">
		<span class="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest text-center">{t('post.action.share_other')}</span>
		<div class="flex flex-wrap items-center justify-center gap-2 md:gap-3">
			<button 
				onclick={handle(shareEmail)} 
				class="{btnBase} text-muted-foreground hover:text-zinc-600 hover:bg-zinc-100 dark:hover:text-zinc-300 dark:hover:bg-zinc-800"
				aria-label={shareLabel(t('post.action.share_email'))} title={shareLabel(t('post.action.share_email'))}
			>
				<svg class="size-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
			</button>

			{#if canNativeShare}
				<button 
					onclick={handle(nativeShare)} 
					class="{btnBase} text-muted-foreground hover:text-zinc-900 hover:bg-zinc-100 dark:hover:text-zinc-50 dark:hover:bg-zinc-800"
					aria-label={t('post.action.share')} title={t('post.action.share')}
				>
					<Share2 class="size-6" />
				</button>
			{/if}
		</div>
	</div>

</div>
