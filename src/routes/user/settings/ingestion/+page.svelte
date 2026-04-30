<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Switch } from '$lib/components/ui/switch/index.js';
	import { Separator } from '$lib/components/ui/separator/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { layout } from '$lib/stores/layout.svelte.js';
	import { activeUser } from '$lib/stores/active-user.svelte.js';
	import { createIngestionSettings, type IngestionSettings, type ProxyConfig } from '$lib/domain/ingestion/ingestion-settings.js';
	import { resetHttpAdapter } from '$lib/ingestion/net/index.js';
	import { reloadSchedulerInterval } from '$lib/ingestion/scheduler.js';
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';
	import Plus from '@lucide/svelte/icons/plus';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import ChevronUp from '@lucide/svelte/icons/chevron-up';
	import ChevronDown from '@lucide/svelte/icons/chevron-down';
	import { t } from '$lib/i18n/t.js';

	const SEC_MS = 1_000;
	const MIN_MS = 60_000;
	const HOUR_MS = 60 * MIN_MS;

	let settings = $state<IngestionSettings>(
		activeUser.current?.settingsUser.ingestion ?? createIngestionSettings()
	);

	$effect(() => {
		const next = activeUser.current?.settingsUser.ingestion;
		if (next) settings = next;
	});

	let tickSec = $derived(Math.round(settings.schedulerTickIntervalMs / SEC_MS));
	let activeMin = $derived(Math.round(settings.activeFontIntervalMs / MIN_MS));
	let idle1IntMin = $derived(Math.round(settings.idleTier1IntervalMs / MIN_MS));
	let idle1MaxHours = $derived(Math.round(settings.idleTier1MaxIdleMs / HOUR_MS));
	let idle2IntMin = $derived(Math.round(settings.idleTier2IntervalMs / MIN_MS));
	let idle2MaxHours = $derived(Math.round(settings.idleTier2MaxIdleMs / HOUR_MS));
	let idle3IntHours = $derived(Math.round(settings.idleTier3IntervalMs / HOUR_MS));

	async function persist(next: IngestionSettings): Promise<void> {
		settings = next;
		const userId = activeUser.current?.id;
		if (!userId) return;
		await activeUser.setIngestionSettings(userId, next);
		resetHttpAdapter();
		reloadSchedulerInterval();
	}

	function update<K extends keyof IngestionSettings>(key: K, value: IngestionSettings[K]) {
		void persist({ ...settings, [key]: value });
	}

	function setTickSeconds(v: number) {
		update('schedulerTickIntervalMs', Math.max(5, v) * SEC_MS);
	}
	function setActiveMinutes(v: number) {
		update('activeFontIntervalMs', Math.max(1, v) * MIN_MS);
	}
	function setIdle1IntervalMinutes(v: number) {
		update('idleTier1IntervalMs', Math.max(1, v) * MIN_MS);
	}
	function setIdle1MaxHours(v: number) {
		update('idleTier1MaxIdleMs', Math.max(1, v) * HOUR_MS);
	}
	function setIdle2IntervalMinutes(v: number) {
		update('idleTier2IntervalMs', Math.max(1, v) * MIN_MS);
	}
	function setIdle2MaxHours(v: number) {
		update('idleTier2MaxIdleMs', Math.max(1, v) * HOUR_MS);
	}
	function setIdle3IntervalHours(v: number) {
		update('idleTier3IntervalMs', Math.max(1, v) * HOUR_MS);
	}

	function addProxy() {
		const next: ProxyConfig = { url: '', label: '' };
		void persist({ ...settings, proxyServices: [...settings.proxyServices, next] });
	}

	function updateProxy(i: number, patch: Partial<ProxyConfig>) {
		const list = settings.proxyServices.map((p, idx) => (idx === i ? { ...p, ...patch } : p));
		void persist({ ...settings, proxyServices: list });
	}

	function removeProxy(i: number) {
		const list = settings.proxyServices.filter((_, idx) => idx !== i);
		void persist({ ...settings, proxyServices: list });
	}

	function moveProxy(i: number, dir: -1 | 1) {
		const j = i + dir;
		if (j < 0 || j >= settings.proxyServices.length) return;
		const list = settings.proxyServices.slice();
		[list[i], list[j]] = [list[j], list[i]];
		void persist({ ...settings, proxyServices: list });
	}

	function restoreDefaults() {
		void persist(createIngestionSettings());
	}
</script>

<svelte:head>
	<title>{t('ingestion_settings.title')}</title>
</svelte:head>

<div class="container mx-auto px-4 py-6 {layout.isExpanded ? 'max-w-2xl' : 'max-w-lg'}">
	<div class="flex items-center gap-2 mb-6">
		<Button variant="ghost" size="icon" href="/user" aria-label={t('btn.back')}>
			<ArrowLeft class="size-5" />
		</Button>
		<h1 class="text-xl font-bold">{t('ingestion_settings.title')}</h1>
	</div>

	<p class="text-sm text-muted-foreground mb-6">
		{t('ingestion_settings.description')}
	</p>

	<Separator class="my-4" />

	<section class="space-y-4">
		<h2 class="text-sm font-semibold">{t('ingestion_settings.scheduler')}</h2>
		<p class="text-xs text-muted-foreground">{t('ingestion_settings.scheduler_hint')}</p>

		<div class="grid grid-cols-[1fr_auto] gap-2 items-center">
			<Label for="tick-int">{t('ingestion_settings.scheduler_tick')}</Label>
			<Input
				id="tick-int"
				type="number"
				min="5"
				class="w-24"
				value={tickSec}
				onchange={(e) => setTickSeconds(Number((e.target as HTMLInputElement).value))}
			/>
		</div>
	</section>

	<Separator class="my-6" />

	<section class="space-y-4">
		<h2 class="text-sm font-semibold">{t('ingestion_settings.intervals')}</h2>
		<p class="text-xs text-muted-foreground">{t('ingestion_settings.intervals_hint')}</p>

		<!-- Tier table: Tier | Idle period | Polling interval -->
		<div class="rounded-md border border-border overflow-hidden">
			<div
				class="grid grid-cols-[minmax(5rem,auto)_1fr_minmax(8rem,auto)] gap-x-3 gap-y-1 px-3 py-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground bg-muted/40"
			>
				<span>{t('ingestion_settings.tier_col_tier')}</span>
				<span>{t('ingestion_settings.tier_col_period')}</span>
				<span class="text-right">{t('ingestion_settings.tier_col_interval')}</span>
			</div>

			<!-- Active -->
			<div
				class="grid grid-cols-[minmax(5rem,auto)_1fr_minmax(8rem,auto)] gap-x-3 gap-y-1 px-3 py-3 items-center border-t border-border"
			>
				<Label for="active-int" class="text-sm font-medium">{t('ingestion_settings.tier_active')}</Label>
				<span class="text-xs text-muted-foreground">{t('ingestion_settings.tier_active_period')}</span>
				<div class="flex items-center justify-end gap-1.5">
					<Input
						id="active-int"
						type="number"
						min="1"
						class="w-20"
						value={activeMin}
						onchange={(e) => setActiveMinutes(Number((e.target as HTMLInputElement).value))}
					/>
					<span class="text-xs text-muted-foreground w-8">{t('ingestion_settings.unit_min')}</span>
				</div>
			</div>

			<!-- Tier 1 -->
			<div
				class="grid grid-cols-[minmax(5rem,auto)_1fr_minmax(8rem,auto)] gap-x-3 gap-y-1 px-3 py-3 items-center border-t border-border"
			>
				<Label for="idle-1-int" class="text-sm font-medium">{t('ingestion_settings.tier_1')}</Label>
				<div class="flex items-center gap-1.5 flex-wrap text-xs text-muted-foreground">
					<span>0{t('ingestion_settings.unit_h')}</span>
					<span>→</span>
					<Input
						id="idle-1-max"
						type="number"
						min="1"
						class="w-16 h-7"
						value={idle1MaxHours}
						onchange={(e) => setIdle1MaxHours(Number((e.target as HTMLInputElement).value))}
					/>
					<span>{t('ingestion_settings.unit_h')}</span>
				</div>
				<div class="flex items-center justify-end gap-1.5">
					<Input
						id="idle-1-int"
						type="number"
						min="1"
						class="w-20"
						value={idle1IntMin}
						onchange={(e) => setIdle1IntervalMinutes(Number((e.target as HTMLInputElement).value))}
					/>
					<span class="text-xs text-muted-foreground w-8">{t('ingestion_settings.unit_min')}</span>
				</div>
			</div>

			<!-- Tier 2 -->
			<div
				class="grid grid-cols-[minmax(5rem,auto)_1fr_minmax(8rem,auto)] gap-x-3 gap-y-1 px-3 py-3 items-center border-t border-border"
			>
				<Label for="idle-2-int" class="text-sm font-medium">{t('ingestion_settings.tier_2')}</Label>
				<div class="flex items-center gap-1.5 flex-wrap text-xs text-muted-foreground">
					<span>{idle1MaxHours}{t('ingestion_settings.unit_h')}</span>
					<span>→</span>
					<Input
						id="idle-2-max"
						type="number"
						min="1"
						class="w-16 h-7"
						value={idle2MaxHours}
						onchange={(e) => setIdle2MaxHours(Number((e.target as HTMLInputElement).value))}
					/>
					<span>{t('ingestion_settings.unit_h')}</span>
				</div>
				<div class="flex items-center justify-end gap-1.5">
					<Input
						id="idle-2-int"
						type="number"
						min="1"
						class="w-20"
						value={idle2IntMin}
						onchange={(e) => setIdle2IntervalMinutes(Number((e.target as HTMLInputElement).value))}
					/>
					<span class="text-xs text-muted-foreground w-8">{t('ingestion_settings.unit_min')}</span>
				</div>
			</div>

			<!-- Tier 3 -->
			<div
				class="grid grid-cols-[minmax(5rem,auto)_1fr_minmax(8rem,auto)] gap-x-3 gap-y-1 px-3 py-3 items-center border-t border-border"
			>
				<Label for="idle-3-int" class="text-sm font-medium">{t('ingestion_settings.tier_3')}</Label>
				<span class="text-xs text-muted-foreground"
					>&gt; {idle2MaxHours}{t('ingestion_settings.unit_h')}</span
				>
				<div class="flex items-center justify-end gap-1.5">
					<Input
						id="idle-3-int"
						type="number"
						min="1"
						class="w-20"
						value={idle3IntHours}
						onchange={(e) => setIdle3IntervalHours(Number((e.target as HTMLInputElement).value))}
					/>
					<span class="text-xs text-muted-foreground w-8">{t('ingestion_settings.unit_h')}</span>
				</div>
			</div>
		</div>

		<p class="text-xs text-muted-foreground">{t('ingestion_settings.tier_table_footnote')}</p>
	</section>

	<Separator class="my-6" />

	<section class="space-y-4">
		<h2 class="text-sm font-semibold">{t('ingestion_settings.activation')}</h2>
		<p class="text-xs text-muted-foreground">{t('ingestion_settings.activation_hint')}</p>

		<div class="flex items-center justify-between gap-4">
			<div class="min-w-0">
				<p class="text-sm font-medium">{t('ingestion_settings.backfill_on_activate')}</p>
				<p class="text-xs text-muted-foreground">{t('ingestion_settings.backfill_on_activate_hint')}</p>
			</div>
			<Switch
				checked={settings.backfillOnActivate}
				onCheckedChange={(v) => update('backfillOnActivate', v)}
			/>
		</div>

		<div class="flex items-center justify-between gap-4">
			<div class="min-w-0">
				<p class="text-sm font-medium">{t('ingestion_settings.refresh_on_activate')}</p>
				<p class="text-xs text-muted-foreground">{t('ingestion_settings.refresh_on_activate_hint')}</p>
			</div>
			<Switch
				checked={settings.refreshOnActivate}
				onCheckedChange={(v) => update('refreshOnActivate', v)}
			/>
		</div>
	</section>

	<Separator class="my-6" />

	<section class="space-y-4">
		<h2 class="text-sm font-semibold">{t('ingestion_settings.retention')}</h2>
		<p class="text-xs text-muted-foreground">{t('ingestion_settings.retention_hint')}</p>

		<div class="grid grid-cols-[1fr_auto] gap-2 items-center">
			<div class="space-y-0.5">
				<Label for="trash-active">{t('ingestion_settings.trash_active_days')}</Label>
				<p class="text-xs text-muted-foreground">{t('ingestion_settings.trash_active_days_hint')}</p>
			</div>
			<Input
				id="trash-active"
				type="number"
				min="1"
				class="w-24"
				value={settings.trashAgeActiveDays}
				onchange={(e) => update('trashAgeActiveDays', Math.max(1, Number((e.target as HTMLInputElement).value)))}
			/>

			<div class="space-y-0.5">
				<Label for="trash-orphan">{t('ingestion_settings.trash_orphan_days')}</Label>
				<p class="text-xs text-muted-foreground">{t('ingestion_settings.trash_orphan_days_hint')}</p>
			</div>
			<Input
				id="trash-orphan"
				type="number"
				min="1"
				class="w-24"
				value={settings.trashAgeOrphanDays}
				onchange={(e) => update('trashAgeOrphanDays', Math.max(1, Number((e.target as HTMLInputElement).value)))}
			/>

			<div class="space-y-0.5">
				<Label for="purge-days">{t('ingestion_settings.purge_days')}</Label>
				<p class="text-xs text-muted-foreground">{t('ingestion_settings.purge_days_hint')}</p>
			</div>
			<Input
				id="purge-days"
				type="number"
				min="1"
				class="w-24"
				value={settings.purgeAfterTrashDays}
				onchange={(e) => update('purgeAfterTrashDays', Math.max(1, Number((e.target as HTMLInputElement).value)))}
			/>
		</div>
	</section>

	<Separator class="my-6" />

	<section class="space-y-4">
		<div class="flex items-center justify-between gap-4">
			<div class="min-w-0">
				<p class="text-sm font-medium">{t('ingestion_settings.proxy_enabled')}</p>
				<p class="text-xs text-muted-foreground">{t('ingestion_settings.proxy_hint')}</p>
			</div>
			<Switch
				checked={settings.proxyEnabled}
				onCheckedChange={(v) => update('proxyEnabled', v)}
			/>
		</div>

		<div class="space-y-2">
			<div class="flex items-center justify-between">
				<div class="min-w-0">
					<p class="text-sm font-medium">{t('ingestion_settings.proxy_list')}</p>
					<p class="text-xs text-muted-foreground">{t('ingestion_settings.proxy_order_hint')}</p>
				</div>
				<Button variant="outline" size="sm" onclick={addProxy}>
					<Plus class="size-4" />
					{t('ingestion_settings.add_proxy')}
				</Button>
			</div>

			{#each settings.proxyServices as proxy, i (i)}
				<div class="grid grid-cols-[auto_1fr_auto] gap-2 items-stretch p-3 border rounded-md">
					<div class="flex flex-col items-center gap-1 pt-1">
						<span
							class="inline-flex items-center justify-center size-6 rounded-full bg-muted text-xs font-semibold tabular-nums"
							aria-label={t('ingestion_settings.proxy_position')}
						>{i + 1}</span>
						<div class="flex flex-col">
							<Button
								variant="ghost"
								size="icon"
								class="size-6"
								disabled={i === 0}
								onclick={() => moveProxy(i, -1)}
								aria-label={t('ingestion_settings.proxy_move_up')}
							>
								<ChevronUp class="size-4" />
							</Button>
							<Button
								variant="ghost"
								size="icon"
								class="size-6"
								disabled={i === settings.proxyServices.length - 1}
								onclick={() => moveProxy(i, 1)}
								aria-label={t('ingestion_settings.proxy_move_down')}
							>
								<ChevronDown class="size-4" />
							</Button>
						</div>
					</div>
					<div class="space-y-2 min-w-0">
						<Input
							placeholder={t('ingestion_settings.proxy_url_placeholder')}
							value={proxy.url}
							onchange={(e) => updateProxy(i, { url: (e.target as HTMLInputElement).value })}
						/>
						<Input
							placeholder={t('ingestion_settings.proxy_label_placeholder')}
							value={proxy.label ?? ''}
							onchange={(e) => updateProxy(i, { label: (e.target as HTMLInputElement).value })}
						/>
					</div>
					<Button variant="ghost" size="icon" onclick={() => removeProxy(i)} aria-label={t('btn.remove')}>
						<Trash2 class="size-4" />
					</Button>
				</div>
			{/each}

			<p class="text-xs text-muted-foreground">{t('ingestion_settings.proxy_applies_to')}</p>
		</div>
	</section>

	<Separator class="my-6" />

	<section class="space-y-4">
		<h2 class="text-sm font-semibold">{t('ingestion_settings.notifications')}</h2>
		<p class="text-xs text-muted-foreground">{t('ingestion_settings.notifications_hint')}</p>

		<div class="flex items-center justify-between gap-4">
			<div class="min-w-0">
				<p class="text-sm font-medium">{t('ingestion_settings.notify_on_new')}</p>
				<p class="text-xs text-muted-foreground">{t('ingestion_settings.notify_hint')}</p>
			</div>
			<Switch
				checked={settings.notifyOnNewPosts}
				onCheckedChange={(v) => update('notifyOnNewPosts', v)}
			/>
		</div>
	</section>

	<Separator class="my-6" />

	<Button variant="outline" onclick={restoreDefaults}>
		{t('ingestion_settings.restore_defaults')}
	</Button>
</div>
