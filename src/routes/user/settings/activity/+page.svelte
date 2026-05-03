<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import { Switch } from '$lib/components/ui/switch/index.js';
	import { Separator } from '$lib/components/ui/separator/index.js';
	import { layout } from '$lib/stores/layout.svelte.js';
	import { activitySettings } from '$lib/stores/activity-settings.svelte.js';
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';
	import { t } from '$lib/i18n/t.js';
	import PageHeader from '$lib/components/shared/PageHeader.svelte';

	function toggleEnabled(value: boolean): void {
		void activitySettings.setEnabled(value);
	}
</script>

<svelte:head>
	<title>{t('page_title.activity_settings')}</title>
</svelte:head>

<div class="mx-auto w-full h-full flex flex-col pt-4" class:max-w-8xl={layout.isExpanded} class:max-w-2xl={!layout.isExpanded}>
	<div class="px-4 shrink-0">
		<PageHeader title={t('activity_settings.title')}>
			{#snippet prefix()}
				<Button variant="ghost" size="icon" href="/user" aria-label={t('btn.back')}>
					<ArrowLeft class="size-5" />
				</Button>
			{/snippet}
		</PageHeader>
	</div>

	<div class="overflow-y-auto h-full px-4 pb-24">
		<div class="mx-auto w-full flex flex-col gap-6 {layout.isExpanded ? 'max-w-3xl' : 'max-w-xl'}">
			<p class="text-sm text-muted-foreground">
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
	</div>
</div>
