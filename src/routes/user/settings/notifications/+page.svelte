<script lang="ts">
	import { onMount } from 'svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Switch } from '$lib/components/ui/switch/index.js';
	import { Separator } from '$lib/components/ui/separator/index.js';
	import { layout } from '$lib/stores/layout.svelte.js';
	import { activeUser } from '$lib/stores/active-user.svelte.js';
	import { consumer } from '$lib/stores/consumer.svelte.js';
	import {
		getNotificationPermission,
		requestNotificationPermission,
		type NotificationPermissionState
	} from '$lib/notifications/permission.js';
	import { getCapabilities } from '$lib/platform/capabilities.js';
	import {
		createNotificationPipeline,
		defaultPipelineEventSettings,
		withPipelineDefaults,
		type NotificationPipeline,
		type NotificationStep,
		type PipelineEventSettings,
		type PipelineEventMode
	} from '$lib/domain/notifications/pipeline.js';
	import type { EventSeverity } from '$lib/domain/ingestion/pipeline-event.js';
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';
	import Mail from '@lucide/svelte/icons/mail';
	import Rss from '@lucide/svelte/icons/rss';
	import Globe from '@lucide/svelte/icons/globe';
	import ChevronDown from '@lucide/svelte/icons/chevron-down';
	import { t } from '$lib/i18n/t.js';

	const MIN_MS = 60_000;

	let permission = $state<NotificationPermissionState>('default');
	const caps = getCapabilities();

	let userId = $derived(activeUser.current?.id ?? null);

	/**
	 * Macros are user-created on the feed page. The notifications UI
	 * only consumes them — it never defines its own filter logic.
	 */
	let macros = $derived(consumer.feedMacros);

	/**
	 * Pipeline lives on the user record (`settingsUser.notifications`),
	 * so reading it is a pure derivation — no persistence call needed.
	 * Falls back to fresh defaults when the slice is missing/malformed.
	 */
	let pipeline = $derived<NotificationPipeline | null>(
		activeUser.current
			? activeUser.current.settingsUser.notifications &&
				Array.isArray(activeUser.current.settingsUser.notifications.steps) &&
				activeUser.current.settingsUser.notifications.steps.length === 3 &&
				activeUser.current.settingsUser.notifications.pipelineEvents
				? withPipelineDefaults(activeUser.current.settingsUser.notifications)
				: createNotificationPipeline()
			: null
	);

	onMount(async () => {
		permission = await getNotificationPermission();
	});

	$effect(() => {
		void userId;
		void (async () => {
			permission = await getNotificationPermission();
		})();
	});

	async function persist(next: NotificationPipeline) {
		const id = userId;
		if (!id) return;
		await activeUser.setNotificationPipeline(id, next);
	}

	function setEnabled(v: boolean) {
		if (!pipeline) return;
		void persist({ ...pipeline, enabled: v });
	}

	function setQuietPosts(v: boolean) {
		if (!pipeline) return;
		void persist({ ...pipeline, quietPosts: v });
	}

	function setSplitInboxTabs(v: boolean) {
		if (!pipeline) return;
		void persist({ ...pipeline, splitInboxTabs: v });
	}

	function setEventQuiet(v: boolean) {
		updatePipelineEvents({ quiet: v });
	}

	function updateStep(idx: 0 | 1 | 2, patch: Partial<NotificationStep>) {
		if (!pipeline) return;
		const updated = { ...pipeline.steps[idx], ...patch } as NotificationStep;
		const steps = [...pipeline.steps] as NotificationPipeline['steps'];
		steps[idx] = updated;
		void persist({ ...pipeline, steps });
	}

	/** Toggle a single macroId in a step's allow-list. */
	function toggleMacroInStep(idx: 0 | 1, macroId: string) {
		if (!pipeline) return;
		const step = pipeline.steps[idx];
		const current = step.macroIds;
		const next = current.includes(macroId)
			? current.filter((m) => m !== macroId)
			: [...current, macroId];
		updateStep(idx, { macroIds: next });
	}

	function selectAllMacros(idx: 0 | 1) {
		updateStep(idx, { macroIds: macros.map((m) => m.id) });
	}

	function clearMacros(idx: 0 | 1) {
		updateStep(idx, { macroIds: [] });
	}

	async function handleRequestPermission() {
		permission = await requestNotificationPermission();
	}

	function permissionLabel(state: NotificationPermissionState): string {
		switch (state) {
			case 'granted':
				return t('notifications.permission_granted');
			case 'denied':
				return t('notifications.permission_denied');
			case 'unsupported':
				return t('notifications.permission_unsupported');
			default:
				return t('notifications.permission_default');
		}
	}

	function intervalMin(step: NotificationStep): number {
		const ms = Math.max(step.intervalMs, minIntervalMs);
		return Math.max(1, Math.round(ms / MIN_MS));
	}

	/**
	 * The fastest polling tier wins as the floor — notifications can
	 * never fire more often than ingestion produces posts.
	 */
	let minIntervalMs = $derived.by(() => {
		const ing = activeUser.current?.settingsUser.ingestion;
		if (!ing) return 5 * MIN_MS;
		return Math.min(
			ing.activeFontIntervalMs,
			ing.idleTier1IntervalMs,
			ing.idleTier2IntervalMs,
			ing.idleTier3IntervalMs
		);
	});
	let minIntervalMinutes = $derived(Math.max(1, Math.round(minIntervalMs / MIN_MS)));

	function clampInterval(input: number): number {
		const ms = Math.max(1, input) * MIN_MS;
		return ms < minIntervalMs ? minIntervalMs : ms;
	}

	function selectedCount(step: NotificationStep): number {
		return step.macroIds.length;
	}

	/** Open-state for the per-step macro picker (only steps 0 and 1 use it). */
	let openPicker = $state<0 | 1 | null>(null);
	function togglePicker(idx: 0 | 1) {
		openPicker = openPicker === idx ? null : idx;
	}

	/** Update the second-channel pipeline-event settings. */
	function updatePipelineEvents(patch: Partial<PipelineEventSettings>) {
		if (!pipeline) return;
		const current = pipeline.pipelineEvents ?? defaultPipelineEventSettings();
		void persist({ ...pipeline, pipelineEvents: { ...current, ...patch } });
	}
	function setEventMode(mode: PipelineEventMode) {
		updatePipelineEvents({ mode });
	}
	function setEventSeverity(severityThreshold: EventSeverity) {
		updatePipelineEvents({ severityThreshold });
	}
	function setEventBatchInterval(ms: number) {
		updatePipelineEvents({ batchIntervalMs: Math.max(MIN_MS, ms) });
	}

	let eventSettings = $derived<PipelineEventSettings>(
		pipeline?.pipelineEvents ?? defaultPipelineEventSettings()
	);
</script>

<svelte:head>
	<title>{t('notifications.settings_title')}</title>
</svelte:head>

<div class="container mx-auto px-4 py-6 {layout.isExpanded ? 'max-w-2xl' : 'max-w-lg'}">
	<div class="flex items-center gap-2 mb-6">
		<Button variant="ghost" size="icon" href="/user" aria-label={t('btn.back')}>
			<ArrowLeft class="size-5" />
		</Button>
		<h1 class="text-xl font-bold">{t('notifications.settings_title')}</h1>
	</div>

	<p class="text-sm text-muted-foreground mb-6">{t('notifications.settings_hint')}</p>

	{#if pipeline}

		<section class="space-y-4">
			<div class="flex items-center justify-between gap-4">
				<div class="min-w-0">
					<p class="text-sm font-medium">{t('notifications.master_toggle')}</p>
					<p class="text-xs text-muted-foreground">{t('notifications.master_toggle_hint')}</p>
				</div>
				<Switch checked={pipeline.enabled} onCheckedChange={setEnabled} />
			</div>

			{#if caps.hasNotifications}
				<div class="flex items-center justify-between gap-4">
					<div class="min-w-0">
						<p class="text-sm font-medium">{t('notifications.permission_label')}</p>
						<p class="text-xs text-muted-foreground">{permissionLabel(permission)}</p>
					</div>
					{#if permission !== 'granted' && permission !== 'unsupported'}
						<Button variant="outline" size="sm" onclick={handleRequestPermission}>
							{t('notifications.permission_request')}
						</Button>
					{/if}
				</div>
			{/if}
		</section>

		<Separator class="my-6" />
		
		<!-- Do-not-disturb (DND) — placed first, per design. Quiet still
		     records inbox entries so they are visible when the bell opens,
		     but suppresses OS popups and the unread badge. -->
		<section class="rounded-lg border border-border bg-card p-4 space-y-3">
			<div>
				<h2 class="text-sm font-semibold">{t('notifications.dnd_title')}</h2>
				<p class="text-xs text-muted-foreground mt-1">{t('notifications.dnd_hint')}</p>
			</div>
			<div class="flex items-center justify-between gap-4">
				<div class="min-w-0">
					<p class="text-sm font-medium">{t('notifications.dnd_posts_label')}</p>
					<p class="text-xs text-muted-foreground">{t('notifications.dnd_posts_hint')}</p>
				</div>
				<Switch checked={pipeline.quietPosts} onCheckedChange={setQuietPosts} />
			</div>
			<div class="flex items-center justify-between gap-4">
				<div class="min-w-0">
					<p class="text-sm font-medium">{t('notifications.dnd_health_label')}</p>
					<p class="text-xs text-muted-foreground">{t('notifications.dnd_health_hint')}</p>
				</div>
				<Switch checked={eventSettings.quiet} onCheckedChange={setEventQuiet} />
			</div>
		</section>

		<!-- Inbox layout — controls how the bell groups its entries. -->
		<section class="mt-4 rounded-lg border border-border bg-card p-4">
			<div class="flex items-center justify-between gap-4">
				<div class="min-w-0">
					<p class="text-sm font-medium">{t('notifications.split_tabs_label')}</p>
					<p class="text-xs text-muted-foreground">{t('notifications.split_tabs_hint')}</p>
				</div>
				<Switch checked={pipeline.splitInboxTabs} onCheckedChange={setSplitInboxTabs} />
			</div>
		</section>

		<Separator class="my-4" />

		<section class="space-y-3">
			<div>
				<h2 class="text-sm font-semibold">{t('notifications.pipeline_title')}</h2>
				<p class="text-xs text-muted-foreground">{t('notifications.funnel_hint')}</p>
			</div>

			<!-- Funnel — three fixed cards, narrowing visually toward the bottom. -->
			<div class="space-y-2">
				<!-- Step 1: per_post — widest, most detail. -->
				<div class="rounded-lg border border-border bg-card p-4 space-y-3">
					<div class="flex items-start gap-3">
						<div
							class="inline-flex items-center justify-center size-8 rounded-full bg-primary/10 text-primary shrink-0"
						>
							<Mail class="size-4" />
						</div>
						<div class="min-w-0 flex-1">
							<div class="flex items-baseline justify-between gap-2">
								<p class="text-sm font-semibold">
									1. {t('notifications.step_kind_per_post')}
								</p>
								<span class="text-[10px] text-muted-foreground">
									{selectedCount(pipeline.steps[0])} / {macros.length}
								</span>
							</div>
							<p class="text-xs text-muted-foreground">
								{t('notifications.step_per_post_hint')}
							</p>
						</div>
					</div>

					<button
						type="button"
						class="w-full inline-flex items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-xs hover:bg-accent transition-colors"
						onclick={() => togglePicker(0)}
					>
						<span>
							{selectedCount(pipeline.steps[0]) === 0
								? t('notifications.no_macros_selected')
								: t('notifications.macros_selected', {
										count: selectedCount(pipeline.steps[0])
									})}
						</span>
						<ChevronDown
							class="size-4 transition-transform {openPicker === 0 ? 'rotate-180' : ''}"
						/>
					</button>

					{#if openPicker === 0}
						<div class="rounded-md border border-border p-2 space-y-1 max-h-60 overflow-y-auto">
							{#if macros.length === 0}
								<p class="text-xs text-muted-foreground text-center py-2">
									{t('notifications.no_macros_yet')}
								</p>
							{:else}
								<div class="flex justify-end gap-2 mb-1">
									<Button variant="ghost" size="sm" class="h-6 text-xs" onclick={() => selectAllMacros(0)}>
										{t('notifications.select_all')}
									</Button>
									<Button variant="ghost" size="sm" class="h-6 text-xs" onclick={() => clearMacros(0)}>
										{t('notifications.clear')}
									</Button>
								</div>
								{#each macros as m (m.id)}
									<label
										class="flex items-center gap-2 px-2 py-1 rounded text-xs hover:bg-accent cursor-pointer"
									>
										<input
											type="checkbox"
											class="size-3.5"
											checked={pipeline.steps[0].macroIds.includes(m.id)}
											onchange={() => toggleMacroInStep(0, m.id)}
										/>
										<span class="truncate">{m.name}</span>
									</label>
								{/each}
							{/if}
						</div>
					{/if}
				</div>

				<!-- Funnel arrow -->
				<div class="flex justify-center text-muted-foreground" aria-hidden="true">
					<ChevronDown class="size-4" />
				</div>

				<!-- Step 2: batch_macro — middle, macro-level summary. -->
				<div class="rounded-lg border border-border bg-card p-4 space-y-3 mx-4">
					<div class="flex items-start gap-3">
						<div
							class="inline-flex items-center justify-center size-8 rounded-full bg-primary/10 text-primary shrink-0"
						>
							<Rss class="size-4" />
						</div>
						<div class="min-w-0 flex-1">
							<div class="flex items-baseline justify-between gap-2">
								<p class="text-sm font-semibold">
									2. {t('notifications.step_kind_batch_macro')}
								</p>
								<span class="text-[10px] text-muted-foreground">
									{selectedCount(pipeline.steps[1])} / {macros.length}
								</span>
							</div>
							<p class="text-xs text-muted-foreground">
								{t('notifications.step_batch_macro_hint')}
							</p>
						</div>
					</div>

					<div class="space-y-1">
						<div class="grid grid-cols-[auto_1fr] items-center gap-2">
							<span class="text-xs text-muted-foreground"
								>{t('notifications.step_interval_minutes')}</span
							>
							<Input
								type="number"
								min={minIntervalMinutes}
								class="h-8"
								value={intervalMin(pipeline.steps[1])}
								onchange={(e) =>
									updateStep(1, {
										intervalMs: clampInterval(Number((e.target as HTMLInputElement).value))
									})}
							/>
						</div>
						<p class="text-[10px] text-muted-foreground">
							{t('notifications.interval_floor_hint', { count: minIntervalMinutes })}
						</p>
					</div>

					<button
						type="button"
						class="w-full inline-flex items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-xs hover:bg-accent transition-colors"
						onclick={() => togglePicker(1)}
					>
						<span>
							{selectedCount(pipeline.steps[1]) === 0
								? t('notifications.no_macros_selected')
								: t('notifications.macros_selected', {
										count: selectedCount(pipeline.steps[1])
									})}
						</span>
						<ChevronDown
							class="size-4 transition-transform {openPicker === 1 ? 'rotate-180' : ''}"
						/>
					</button>

					{#if openPicker === 1}
						<div class="rounded-md border border-border p-2 space-y-1 max-h-60 overflow-y-auto">
							{#if macros.length === 0}
								<p class="text-xs text-muted-foreground text-center py-2">
									{t('notifications.no_macros_yet')}
								</p>
							{:else}
								<div class="flex justify-end gap-2 mb-1">
									<Button variant="ghost" size="sm" class="h-6 text-xs" onclick={() => selectAllMacros(1)}>
										{t('notifications.select_all')}
									</Button>
									<Button variant="ghost" size="sm" class="h-6 text-xs" onclick={() => clearMacros(1)}>
										{t('notifications.clear')}
									</Button>
								</div>
								{#each macros as m (m.id)}
									<label
										class="flex items-center gap-2 px-2 py-1 rounded text-xs hover:bg-accent cursor-pointer"
									>
										<input
											type="checkbox"
											class="size-3.5"
											checked={pipeline.steps[1].macroIds.includes(m.id)}
											onchange={() => toggleMacroInStep(1, m.id)}
										/>
										<span class="truncate">{m.name}</span>
									</label>
								{/each}
							{/if}
						</div>
					{/if}
				</div>

				<!-- Funnel arrow -->
				<div class="flex justify-center text-muted-foreground" aria-hidden="true">
					<ChevronDown class="size-4" />
				</div>

				<!-- Step 3: batch_global — narrowest, catch-all. -->
				<div class="rounded-lg border border-border bg-card p-4 space-y-3 mx-8">
					<div class="flex items-start gap-3">
						<div
							class="inline-flex items-center justify-center size-8 rounded-full bg-primary/10 text-primary shrink-0"
						>
							<Globe class="size-4" />
						</div>
						<div class="min-w-0 flex-1">
							<p class="text-sm font-semibold">
								3. {t('notifications.step_kind_batch_global')}
							</p>
							<p class="text-xs text-muted-foreground">
								{t('notifications.step_batch_global_hint')}
							</p>
						</div>
					</div>

					<div class="space-y-1">
						<div class="grid grid-cols-[auto_1fr] items-center gap-2">
							<span class="text-xs text-muted-foreground"
								>{t('notifications.step_interval_minutes')}</span
							>
							<Input
								type="number"
								min={minIntervalMinutes}
								class="h-8"
								value={intervalMin(pipeline.steps[2])}
								onchange={(e) =>
									updateStep(2, {
										intervalMs: clampInterval(Number((e.target as HTMLInputElement).value))
									})}
							/>
						</div>
						<p class="text-[10px] text-muted-foreground">
							{t('notifications.interval_floor_hint', { count: minIntervalMinutes })}
						</p>
					</div>
				</div>
			</div>
		</section>

		<Separator class="my-6" />

		<section class="space-y-4">
			<div>
				<h2 class="text-sm font-semibold">{t('notifications.pipeline_events_title')}</h2>
				<p class="text-xs text-muted-foreground mt-1">
					{t('notifications.pipeline_events_intro')}
				</p>
			</div>

			<!-- When -->
			<div class="space-y-2">
				<p class="text-xs font-medium">{t('notifications.pipeline_events_mode')}</p>
				<div class="grid grid-cols-2 gap-2">
					<button
						type="button"
						class="text-left rounded-lg border p-3 transition-colors hover:bg-accent {eventSettings.mode ===
						'realtime'
							? 'border-primary bg-primary/5'
							: 'border-border'}"
						onclick={() => setEventMode('realtime')}
					>
						<p class="text-sm font-medium">
							{t('notifications.pipeline_events_mode_realtime')}
						</p>
						<p class="text-[11px] text-muted-foreground mt-0.5">
							{t('notifications.pipeline_events_mode_realtime_hint')}
						</p>
					</button>
					<button
						type="button"
						class="text-left rounded-lg border p-3 transition-colors hover:bg-accent {eventSettings.mode ===
						'batched'
							? 'border-primary bg-primary/5'
							: 'border-border'}"
						onclick={() => setEventMode('batched')}
					>
						<p class="text-sm font-medium">
							{t('notifications.pipeline_events_mode_batched')}
						</p>
						<p class="text-[11px] text-muted-foreground mt-0.5">
							{t('notifications.pipeline_events_mode_batched_hint')}
						</p>
					</button>
				</div>
			</div>

			<!-- What -->
			<div class="space-y-2">
				<div>
					<p class="text-xs font-medium">{t('notifications.pipeline_events_severity')}</p>
					<p class="text-[11px] text-muted-foreground">
						{t('notifications.pipeline_events_severity_hint')}
					</p>
				</div>
				<div class="space-y-1.5">
					{#each [{ value: 'info', label: t('notifications.pipeline_events_severity_info'), desc: t('notifications.pipeline_events_severity_info_desc') }, { value: 'warning', label: t('notifications.pipeline_events_severity_warning'), desc: t('notifications.pipeline_events_severity_warning_desc') }, { value: 'critical', label: t('notifications.pipeline_events_severity_critical'), desc: t('notifications.pipeline_events_severity_critical_desc') }] as opt (opt.value)}
						<button
							type="button"
							class="w-full text-left rounded-lg border p-3 transition-colors hover:bg-accent {eventSettings.severityThreshold ===
							opt.value
								? 'border-primary bg-primary/5'
								: 'border-border'}"
							onclick={() => setEventSeverity(opt.value as EventSeverity)}
						>
							<div class="flex items-baseline justify-between gap-2">
								<p class="text-sm font-medium">{opt.label}</p>
								{#if eventSettings.severityThreshold === opt.value}
									<span class="text-[10px] text-primary">●</span>
								{/if}
							</div>
							<p class="text-[11px] text-muted-foreground mt-0.5">{opt.desc}</p>
						</button>
					{/each}
				</div>
			</div>

			<!-- Batch window (only when relevant) -->
			{#if eventSettings.mode === 'batched'}
				<div class="space-y-1 rounded-lg border border-dashed border-border p-3">
					<p class="text-xs font-medium">
						{t('notifications.pipeline_events_batch_interval')}
					</p>
					<p class="text-[11px] text-muted-foreground">
						{t('notifications.pipeline_events_batch_interval_hint')}
					</p>
					<Input
						type="number"
						min={1}
						class="h-8 mt-1"
						value={Math.max(1, Math.round(eventSettings.batchIntervalMs / MIN_MS))}
						onchange={(e) =>
							setEventBatchInterval(
								Math.max(1, Number((e.target as HTMLInputElement).value)) * MIN_MS
							)}
					/>
				</div>
			{/if}
		</section>
	{:else}
		<p class="text-sm text-muted-foreground">…</p>
	{/if}
</div>
