<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import Download from '@lucide/svelte/icons/download';
	import { t } from '$lib/i18n/t.js';
	import { getCapabilities } from '$lib/platform/capabilities.js';
	import {
		installPrompt,
		promptInstall
	} from '$lib/platform/web/install-prompt.svelte.js';

	const caps = getCapabilities();
	let visible = $derived(
		caps.hasInstallPrompt && installPrompt.canInstall && !installPrompt.installed
	);

	async function onClick() {
		await promptInstall();
	}
</script>

{#if visible}
	<div class="flex items-center justify-between">
		<div>
			<p class="text-sm font-medium">{t('pwa.install_button')}</p>
			<p class="text-xs text-muted-foreground">{t('pwa.install_description')}</p>
		</div>
		<Button variant="outline" size="sm" onclick={onClick}>
			<Download class="size-4" />
			{t('pwa.install_button')}
		</Button>
	</div>
{/if}
