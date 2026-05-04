<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Switch } from '$lib/components/ui/switch/index.js';
	import { Separator } from '$lib/components/ui/separator/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { onMount, tick } from 'svelte';
	import { layout } from '$lib/stores/layout.svelte.js';
	import { activeUser } from '$lib/stores/active-user.svelte.js';
	import {
		createIngestionSettings,
		type IngestionSettings,
		type ProxyConfig,
		type IpfsGatewayConfig,
		type FeedKind,
		type FeedTransportRule,
		type IpfsFeedTransportRule
	} from '$lib/domain/ingestion/ingestion-settings.js';
	import type { PipelineState } from '$lib/domain/ingestion/fetcher-state.js';
	import { resetHttpAdapter } from '$lib/ingestion/net/index.js';
	import {
		reloadSchedulerInterval,
		refreshFont as schedulerRefreshFont,
		tickNow as schedulerTickNow
	} from '$lib/ingestion/scheduler.js';
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';
	import Plus from '@lucide/svelte/icons/plus';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import ChevronUp from '@lucide/svelte/icons/chevron-up';
	import ChevronDown from '@lucide/svelte/icons/chevron-down';
	import { t } from '$lib/i18n/t.js';
	import PageHeader from '$lib/components/shared/PageHeader.svelte';

	const SEC_MS = 1_000;
	const MIN_MS = 60_000;
	const HOUR_MS = 60 * MIN_MS;
	const FEED_KINDS: FeedKind[] = ['rss', 'atom', 'jsonfeed'];

	interface ProtocolScoringStateRow {
		nodeId: string;
		title: string;
		pipelineState: PipelineState;
		confidence: number;
		protocolCount: number;
	}

	let settings = $state<IngestionSettings>(
		activeUser.current?.settingsUser.ingestion ?? createIngestionSettings()
	);

	$effect(() => {
		settings = activeUser.current?.settingsUser.ingestion ?? createIngestionSettings();
	});

	let hasAnyProxyService = $derived(
		settings.proxyServices.some((proxy) => proxy.url.trim().length > 0)
	);
	let hasAnyIpfsGatewayService = $derived(
		settings.ipfsGatewayServices.some((gateway) => gateway.url.trim().length > 0)
	);
	let hasAnyIpfsGatewayOrProxyEnabled = $derived(
		FEED_KINDS.some(
			(kind) =>
				settings.ipfsFeedTransportByKind[kind].gatewayEnabled || settings.ipfsFeedTransportByKind[kind].proxyEnabled
		)
	);
	let hasAnyIpfsProxyEnabled = $derived(
		FEED_KINDS.some((kind) => settings.ipfsFeedTransportByKind[kind].proxyEnabled)
	);

	let tickSec = $derived(Math.round(settings.schedulerTickIntervalMs / SEC_MS));
	let activeMin = $derived(Math.round(settings.activeFontIntervalMs / MIN_MS));
	let idle1IntMin = $derived(Math.round(settings.idleTier1IntervalMs / MIN_MS));
	let idle1MaxHours = $derived(Math.round(settings.idleTier1MaxIdleMs / HOUR_MS));
	let idle2IntMin = $derived(Math.round(settings.idleTier2IntervalMs / MIN_MS));
	let idle2MaxHours = $derived(Math.round(settings.idleTier2MaxIdleMs / HOUR_MS));
	let idle3IntHours = $derived(Math.round(settings.idleTier3IntervalMs / HOUR_MS));
	let protocolScoringRows = $state<ProtocolScoringStateRow[]>([]);
	let protocolScoringLoading = $state(false);
	let resettingRowNodeId = $state<string | null>(null);
	let protocolScoringScrollEl = $state<HTMLDivElement | null>(null);

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

	function feedKindLabel(kind: FeedKind): string {
		switch (kind) {
			case 'rss':
				return t('ingestion_settings.feed_transport_rss');
			case 'atom':
				return t('ingestion_settings.feed_transport_atom');
			default:
				return t('ingestion_settings.feed_transport_jsonfeed');
		}
	}

	function updateHttpFeedTransport(kind: FeedKind, patch: Partial<FeedTransportRule>) {
		const next = {
			...settings.httpFeedTransportByKind,
			[kind]: {
				...settings.httpFeedTransportByKind[kind],
				...patch
			}
		} as IngestionSettings['httpFeedTransportByKind'];
		void persist({ ...settings, httpFeedTransportByKind: next });
	}

	function updateIpfsFeedTransport(kind: FeedKind, patch: Partial<IpfsFeedTransportRule>) {
		const next = {
			...settings.ipfsFeedTransportByKind,
			[kind]: {
				...settings.ipfsFeedTransportByKind[kind],
				...patch
			}
		} as IngestionSettings['ipfsFeedTransportByKind'];
		void persist({ ...settings, ipfsFeedTransportByKind: next });
	}

	function addIpfsGateway() {
		const next: IpfsGatewayConfig = { url: '', label: '' };
		void persist({ ...settings, ipfsGatewayServices: [...settings.ipfsGatewayServices, next] });
	}

	function updateIpfsGateway(i: number, patch: Partial<IpfsGatewayConfig>) {
		const list = settings.ipfsGatewayServices.map((g, idx) => (idx === i ? { ...g, ...patch } : g));
		void persist({ ...settings, ipfsGatewayServices: list });
	}

	function removeIpfsGateway(i: number) {
		const list = settings.ipfsGatewayServices.filter((_, idx) => idx !== i);
		void persist({ ...settings, ipfsGatewayServices: list });
	}

	function moveIpfsGateway(i: number, dir: -1 | 1) {
		const j = i + dir;
		if (j < 0 || j >= settings.ipfsGatewayServices.length) return;
		const list = settings.ipfsGatewayServices.slice();
		[list[i], list[j]] = [list[j], list[i]];
		void persist({ ...settings, ipfsGatewayServices: list });
	}

	function restoreDefaults() {
		void persist(createIngestionSettings());
	}

	let resetting = $state(false);

	function pipelineStateLabel(state: PipelineState): string {
		switch (state) {
			case 'OFFLINE':
				return t('font.state.offline');
			case 'UNSTABLE':
				return t('font.state.unstable');
			case 'DEGRADED':
				return t('font.state.degraded');
			case 'RECOVERING':
				return t('font.state.recovering');
			default:
				return t('font.state.healthy');
		}
	}

	async function loadProtocolScoringRows(opts?: { showLoading?: boolean; preserveScroll?: boolean }) {
		const showLoading = opts?.showLoading ?? protocolScoringRows.length === 0;
		const preserveScroll = opts?.preserveScroll ?? false;
		const previousScrollTop = preserveScroll ? (protocolScoringScrollEl?.scrollTop ?? 0) : 0;

		if (showLoading) protocolScoringLoading = true;
		try {
			const { listProtocolScoringStateRows } = await import('$lib/ingestion/post-manager.js');
			protocolScoringRows = await listProtocolScoringStateRows();
		} finally {
			if (showLoading) protocolScoringLoading = false;
		}

		if (preserveScroll) {
			await tick();
			if (protocolScoringScrollEl) {
				protocolScoringScrollEl.scrollTop = previousScrollTop;
			}
		}
	}

	onMount(() => {
		void loadProtocolScoringRows({ showLoading: true });
	});

	async function handleResetScoring() {
		if (resetting) return;
		resetting = true;
		try {
			const { resetAllProtocolScoring } = await import('$lib/ingestion/post-manager.js');
			const count = await resetAllProtocolScoring();
			console.info(t('settings.ingestion.reset_scoring_done', { count: String(count) }));
			try {
				await schedulerTickNow();
			} catch (err) {
				console.warn('[settings/ingestion] tickNow after reset_scoring failed', err);
			}
			await loadProtocolScoringRows({ showLoading: false, preserveScroll: true });
		} finally {
			resetting = false;
		}
	}

	async function handleResetScoringRow(row: ProtocolScoringStateRow) {
		if (resettingRowNodeId) return;
		resettingRowNodeId = row.nodeId;
		try {
			const { resetProtocolScoringForFont } = await import('$lib/ingestion/post-manager.js');
			const changed = await resetProtocolScoringForFont(row.nodeId);
			if (changed) {
				console.info(t('settings.ingestion.reset_scoring_row_done', { title: row.title }));
				try {
					await schedulerRefreshFont(row.nodeId);
				} catch (err) {
					console.warn('[settings/ingestion] refreshFont after reset_scoring_row failed', {
						nodeId: row.nodeId,
						err
					});
				}
			}
			await loadProtocolScoringRows({ showLoading: false, preserveScroll: true });
		} finally {
			resettingRowNodeId = null;
		}
	}
</script>

<svelte:head>
	<title>{t('ingestion_settings.title')}</title>
</svelte:head>

<div class="mx-auto w-full h-full flex flex-col pt-4" class:max-w-8xl={layout.isExpanded} class:max-w-2xl={!layout.isExpanded}>
	<div class="px-4 shrink-0">
		<PageHeader title={t('ingestion_settings.title')}>
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
		<h2 class="text-sm font-semibold">{t('ingestion_settings.network')}</h2>
		<p class="text-xs text-muted-foreground">{t('ingestion_settings.network_hint')}</p>
		<p class="text-xs text-muted-foreground">{t('ingestion_settings.network_nostr_note')}</p>

		<div class="space-y-2">
			<div class="min-w-0">
				<p class="text-sm font-medium">{t('ingestion_settings.http_transport_title')}</p>
				<p class="text-xs text-muted-foreground">{t('ingestion_settings.http_transport_hint')}</p>
			</div>

			<div class="rounded-md border border-border overflow-hidden">
				<div
					class="grid grid-cols-[minmax(6rem,auto)_1fr_1fr] gap-x-3 gap-y-1 px-3 py-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground bg-muted/40"
				>
					<span>{t('ingestion_settings.feed_transport_kind_col')}</span>
					<span class="text-center">{t('ingestion_settings.feed_transport_direct_col')}</span>
					<span class="text-center">{t('ingestion_settings.feed_transport_proxy_fallback_col')}</span>
				</div>

				{#each FEED_KINDS as kind (kind)}
					<div class="grid grid-cols-[minmax(6rem,auto)_1fr_1fr] gap-x-3 px-3 py-3 items-center border-t border-border">
						<span class="text-sm font-medium">{feedKindLabel(kind)}</span>
						<div class="flex justify-center">
							<Switch
								checked={settings.httpFeedTransportByKind[kind].directEnabled}
								onCheckedChange={(v) => updateHttpFeedTransport(kind, { directEnabled: v })}
							/>
						</div>
						<div class="flex justify-center">
							<Switch
								checked={settings.httpFeedTransportByKind[kind].proxyFallbackEnabled}
								onCheckedChange={(v) => updateHttpFeedTransport(kind, { proxyFallbackEnabled: v })}
							/>
						</div>
					</div>
				{/each}
			</div>

			{#if hasAnyProxyService}
				<p class="text-xs text-muted-foreground">{t('ingestion_settings.http_transport_proxy_note')}</p>
			{:else}
				<p class="text-xs text-amber-700 dark:text-amber-400">{t('ingestion_settings.http_transport_proxy_note_empty')}</p>
			{/if}
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
		<div class="min-w-0">
			<p class="text-sm font-medium">{t('ingestion_settings.ipfs_transport_title')}</p>
			<p class="text-xs text-muted-foreground">{t('ingestion_settings.ipfs_transport_hint')}</p>
		</div>

		<div class="rounded-md border border-border overflow-hidden">
			<div
				class="grid grid-cols-[minmax(6rem,auto)_1fr_1fr_1fr] gap-x-3 gap-y-1 px-3 py-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground bg-muted/40"
			>
				<span>{t('ingestion_settings.feed_transport_kind_col')}</span>
				<span class="text-center">{t('ingestion_settings.feed_transport_direct_col')}</span>
				<span class="text-center">{t('ingestion_settings.ipfs_transport_gateway_col')}</span>
				<span class="text-center">{t('ingestion_settings.ipfs_transport_proxy_col')}</span>
			</div>

			{#each FEED_KINDS as kind (kind)}
				<div class="grid grid-cols-[minmax(6rem,auto)_1fr_1fr_1fr] gap-x-3 px-3 py-3 items-center border-t border-border">
					<span class="text-sm font-medium">{feedKindLabel(kind)}</span>
					<div class="flex justify-center">
						<Switch
							checked={settings.ipfsFeedTransportByKind[kind].directEnabled}
							onCheckedChange={(v) => updateIpfsFeedTransport(kind, { directEnabled: v })}
						/>
					</div>
					<div class="flex justify-center">
						<Switch
							checked={settings.ipfsFeedTransportByKind[kind].gatewayEnabled}
							onCheckedChange={(v) => updateIpfsFeedTransport(kind, { gatewayEnabled: v })}
						/>
					</div>
					<div class="flex justify-center">
						<Switch
							checked={settings.ipfsFeedTransportByKind[kind].proxyEnabled}
							onCheckedChange={(v) => updateIpfsFeedTransport(kind, { proxyEnabled: v })}
						/>
					</div>
				</div>
			{/each}
		</div>

		{#if hasAnyIpfsGatewayService}
			<p class="text-xs text-muted-foreground">{t('ingestion_settings.ipfs_transport_note')}</p>
		{:else if hasAnyIpfsGatewayOrProxyEnabled}
			<p class="text-xs text-amber-700 dark:text-amber-400">{t('ingestion_settings.ipfs_transport_note_empty')}</p>
		{/if}

		{#if hasAnyIpfsProxyEnabled && !hasAnyProxyService}
			<p class="text-xs text-amber-700 dark:text-amber-400">{t('ingestion_settings.ipfs_transport_proxy_note_empty')}</p>
		{/if}

		<div class="space-y-2">
			<div class="flex items-center justify-between">
				<div class="min-w-0">
					<p class="text-sm font-medium">{t('ingestion_settings.ipfs_gateway_list')}</p>
					<p class="text-xs text-muted-foreground">{t('ingestion_settings.ipfs_gateway_order_hint')}</p>
				</div>
				<Button variant="outline" size="sm" onclick={addIpfsGateway}>
					<Plus class="size-4" />
					{t('ingestion_settings.add_ipfs_gateway')}
				</Button>
			</div>

			{#each settings.ipfsGatewayServices as gateway, i (i)}
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
								onclick={() => moveIpfsGateway(i, -1)}
								aria-label={t('ingestion_settings.proxy_move_up')}
							>
								<ChevronUp class="size-4" />
							</Button>
							<Button
								variant="ghost"
								size="icon"
								class="size-6"
								disabled={i === settings.ipfsGatewayServices.length - 1}
								onclick={() => moveIpfsGateway(i, 1)}
								aria-label={t('ingestion_settings.proxy_move_down')}
							>
								<ChevronDown class="size-4" />
							</Button>
						</div>
					</div>
					<div class="space-y-2 min-w-0">
						<Input
							placeholder={t('ingestion_settings.ipfs_gateway_url_placeholder')}
							value={gateway.url}
							onchange={(e) => updateIpfsGateway(i, { url: (e.target as HTMLInputElement).value })}
						/>
						<Input
							placeholder={t('ingestion_settings.ipfs_gateway_label_placeholder')}
							value={gateway.label ?? ''}
							onchange={(e) => updateIpfsGateway(i, { label: (e.target as HTMLInputElement).value })}
						/>
					</div>
					<Button variant="ghost" size="icon" onclick={() => removeIpfsGateway(i)} aria-label={t('btn.remove')}>
						<Trash2 class="size-4" />
					</Button>
				</div>
			{/each}

			<p class="text-xs text-muted-foreground">{t('ingestion_settings.ipfs_gateway_applies_to')}</p>
		</div>
	</section>

	<Separator class="my-6" />

	<section class="space-y-3">
		<div>
			<h2 class="text-base font-semibold">{t('settings.ingestion.reset_scoring')}</h2>
			<p class="text-sm text-muted-foreground">
				{t('settings.ingestion.reset_scoring_desc')}
			</p>
		</div>

		<div class="space-y-2">
			<p class="text-sm font-medium">{t('settings.ingestion.reset_scoring_table_title')}</p>

			{#if protocolScoringLoading}
				<p class="text-xs text-muted-foreground">{t('settings.ingestion.reset_scoring_table_loading')}</p>
			{:else if protocolScoringRows.length === 0}
				<p class="text-xs text-muted-foreground">{t('settings.ingestion.reset_scoring_table_empty')}</p>
			{:else}
				<div class="rounded-md border border-border overflow-hidden">
					<div class="grid grid-cols-[minmax(0,1fr)_auto_auto] gap-x-3 gap-y-1 px-3 py-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground bg-muted/40">
						<span>{t('settings.ingestion.reset_scoring_table_col_font')}</span>
						<span class="text-right">{t('settings.ingestion.reset_scoring_table_col_state')}</span>
						<span class="text-right">{t('settings.ingestion.reset_scoring_table_col_action')}</span>
					</div>

					<div class="h-72 overflow-y-auto" bind:this={protocolScoringScrollEl}>
						{#each protocolScoringRows as row (row.nodeId)}
							<div class="grid grid-cols-[minmax(0,1fr)_auto_auto] gap-x-3 px-3 py-3 items-center border-t border-border">
								<div class="min-w-0">
									<p class="text-sm font-medium truncate">{row.title}</p>
									<p class="text-[11px] text-muted-foreground truncate">{row.nodeId}</p>
								</div>
								<div class="flex justify-end">
									{#if row.pipelineState === 'OFFLINE'}
										<Badge variant="destructive" class="text-xs">{pipelineStateLabel(row.pipelineState)}</Badge>
									{:else if row.pipelineState === 'UNSTABLE'}
										<Badge class="text-xs bg-orange-500 text-white hover:bg-orange-500/90 border-transparent">{pipelineStateLabel(row.pipelineState)}</Badge>
									{:else if row.pipelineState === 'DEGRADED'}
										<Badge variant="secondary" class="text-xs">{pipelineStateLabel(row.pipelineState)}</Badge>
									{:else if row.pipelineState === 'RECOVERING'}
										<Badge class="text-xs bg-blue-500 text-white hover:bg-blue-500/90 border-transparent">{pipelineStateLabel(row.pipelineState)}</Badge>
									{:else}
										<Badge variant="outline" class="text-xs">{pipelineStateLabel(row.pipelineState)}</Badge>
									{/if}
								</div>
								<div class="flex justify-end">
									<Button
										variant="outline"
										size="sm"
										disabled={resetting || resettingRowNodeId === row.nodeId}
										onclick={() => handleResetScoringRow(row)}
										aria-label={t('settings.ingestion.reset_scoring_row_aria', { title: row.title })}
									>
										{#if resettingRowNodeId === row.nodeId}
											{t('settings.ingestion.reset_scoring_row_loading')}
										{:else}
											{t('settings.ingestion.reset_scoring_row_action')}
										{/if}
									</Button>
								</div>
							</div>
						{/each}
					</div>
				</div>
			{/if}
		</div>

		<Button variant="outline" onclick={handleResetScoring} disabled={resetting}>
			{t('settings.ingestion.reset_scoring')}
		</Button>
	</section>

	<Separator class="my-6" />

	<Button variant="outline" onclick={restoreDefaults}>
		{t('ingestion_settings.restore_defaults')}
	</Button>
	</div>
	</div>
</div>
