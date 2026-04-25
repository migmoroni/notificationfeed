<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import { Switch } from '$lib/components/ui/switch/index.js';
	import { Separator } from '$lib/components/ui/separator/index.js';
	import { layout } from '$lib/stores/layout.svelte.js';
	import { activitySettings } from '$lib/stores/activity-settings.svelte.js';
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';
	import { t } from '$lib/i18n/t.js';

	function toggleEnabled(value: boolean): void {
		void activitySettings.setEnabled(value);
	}
</script>

<svelte:head>
	<title>{t('page_title.activity_settings')}</title>
</svelte:head>

<div class="container mx-auto px-4 py-6 {layout.isExpanded ? 'max-w-2xl' : 'max-w-lg'}">
	<div class="flex items-center gap-2 mb-6">
		<Button variant="ghost" size="icon" href="/user" aria-label={t('btn.back')}>
			<ArrowLeft class="size-5" />
		</Button>
		<h1 class="text-xl font-bold">{t('activity_settings.title')}</h1>
	</div>

	<p class="text-sm text-muted-foreground mb-6">
		{t('activity_settings.description')}
	</p>

	<Separator class="my-4" />

	<div class="space-y-4">
		<div class="flex items-center justify-between gap-4">
			<div class="min-w-0">
				<p class="text-sm font-medium">{t('activity_settings.enabled_label')}</p>
				<p class="text-xs text-muted-foreground">{t('activity_settings.enabled_hint')}</p>
			</div>
			<Switch
				checked={activitySettings.enabled}
				onCheckedChange={toggleEnabled}
				aria-label={t('activity_settings.enabled_label')}
			/>
		</div>
	</div>
</div>
