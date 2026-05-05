<script lang="ts">
	import Share2 from '@lucide/svelte/icons/share-2';
	import Link from '@lucide/svelte/icons/link';
	import Check from '@lucide/svelte/icons/check';
	import { t } from '$lib/i18n/t.js';
	import ShareButtons from './ShareButtons.svelte';

	interface Props {
		title?: string;
		text?: string;
		url?: string;
	}

	let { title = '', text = '', url = '' }: Props = $props();

	let isOpen = $state(false);
	let copied = $state(false);

	function toggle() {
		isOpen = !isOpen;
	}

	function close() {
		isOpen = false;
	}

	async function copyLink() {
		try {
			await navigator.clipboard.writeText(url);
			copied = true;
			setTimeout(() => {
				copied = false;
				close();
			}, 500);
		} catch {
			const input = document.createElement('input');
			input.value = url;
			document.body.appendChild(input);
			input.select();
			document.execCommand('copy');
			document.body.removeChild(input);
			copied = true;
			setTimeout(() => {
				copied = false;
				close();
			}, 500);
		}
	}
</script>

<div class="relative inline-block">
	<!-- Trigger Button -->
	<button
		type="button"
		class="rounded p-1 hover:bg-sky-500/20 text-muted-foreground hover:text-sky-500 transition-colors"
		onclick={(e) => { e.stopPropagation(); toggle(); }}
		aria-label={t('post.action.share')}
		title={t('post.action.share')}
	>
		<Share2 class="size-3.5" />
	</button>

	{#if isOpen}
		<!-- Modal Overlay -->
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div class="fixed inset-0 bg-background/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 transition-opacity" onclick={(e) => { e.stopPropagation(); close(); }} aria-hidden="true">
			
			<!-- Modal Content -->
			<!-- svelte-ignore a11y_click_events_have_key_events -->
			<!-- svelte-ignore a11y_no_static_element_interactions -->
			<div class="w-full max-w-sm bg-card border border-border/60 rounded-3xl shadow-2xl p-6 animate-in fade-in zoom-in-95" onclick={(e) => e.stopPropagation()}>
				
				<div class="mb-6 text-sm font-bold uppercase tracking-widest text-foreground text-center">
					{t('post.action.share')}
				</div>

				<ShareButtons {title} {text} {url} onShare={close} />

				<div class="h-px bg-border/40 w-full mt-4 mb-4"></div>

				<!-- Copiar link como botão grande -->
				<button 
					onclick={copyLink} 
					class="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-2xl font-medium transition-all duration-200 {copied ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20' : 'bg-muted/50 hover:bg-muted text-foreground'}"
					aria-label={copied ? t('post.action.share_copy_success') : t('post.action.share_copy')}
					title={copied ? t('post.action.share_copy_success') : t('post.action.share_copy')}
				>
					{#if copied}
						<Check class="size-5" />
						<span>{t('post.action.share_copy_success')}</span>
					{:else}
						<Link class="size-5" />
						<span>{t('post.action.share_copy')}</span>
					{/if}
				</button>

			</div>
		</div>
	{/if}
</div>
