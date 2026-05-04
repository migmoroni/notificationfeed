/**
 * Back settings — system-level configuration knobs.
 *
 * This file is **not exposed to end users**. It holds defaults that the
 * developer (you) tunes at code level and are shared across all users
 * and workers. Things that belong here:
 *  - Anything tied to per-source state shared across users (e.g. retry
 *    backoff for a single failing fetch).
 *  - Operational caps and ceilings used by the runtime that the UI
 *    should never expose.
 *  - Future system-wide knobs (rate limits, default timeouts,
 *    feature-flag-style toggles for experiments, etc.).
 *
 * Things that do **not** belong here (those go in per-user
 * `UserSettings`): cadence preferences, retention windows, proxy
 * preferences, notification preferences.
 *
 * Convention: export each subsystem as a single `const` object with
 * named numeric/boolean fields and explanatory comments inline. Keep
 * values literal (no env-var indirection) so they show up in diffs.
 */

const SECOND = 1_000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;

// ── Ingestion ──────────────────────────────────────────────────────────

/**
 * Exponential-backoff policy applied by the PostManager when a font
 * fetch fails. Shared across all users — backoff is per-source state
 * (it lives in `FetcherState`), not per-user judgment.
 *
 * The next attempt after `failures` consecutive failures is scheduled
 * at `now + min(interval * multiplier^min(failures, maxSteps), maxMs)`,
 * with jitter applied on top.
 */
export const INGESTION_BACKOFF = {
	/** Master switch. If false, retries happen at the regular interval. */
	enabled: true,
	/** Growth factor per failure. 2 = classic doubling, 1 = constant. */
	multiplier: 2,
	/** Cap on the exponent — how many failures count toward growth. */
	maxSteps: 6,
	/** Absolute ceiling on a single backoff window. */
	maxMs: 24 * HOUR
} as const;

/**
 * Per-fetch tunables shared by every protocol client / the orchestrator.
 * None of these belong in user settings — they're network-stack details.
 */
export const INGESTION_FETCH = {
	/** REQ subscription timeout for Nostr relays before giving up on EOSE. */
	nostrEoseTimeoutMs: 8 * SECOND,
	/** Max events a single Nostr REQ asks for (per relay). */
	nostrPostsPerFetch: 200,

	/**
	 * On the very first fetch for a Nostr font (no `nostrSince` cursor
	 * yet), how many recent backlog events to deliver. Caps the initial
	 * dump so newly-activated fonts surface a manageable history; later
	 * polls fall back to `nostrPostsPerFetch` since the `since` cursor
	 * protects against missing events.
	 */
	nostrInitialBacklog: 20,
	/** Default kinds when the font config doesn't override them
	 *  (1 = short notes, 30023 = NIP-23 long-form). */
	nostrDefaultKinds: [1, 30023] as readonly number[],
	/** ± fraction added to scheduled times to avoid synchronized bursts.
	 *  0.1 = ±10% of the interval. Set to 0 to disable jitter entirely. */
	jitterPct: 0.1,
	/** Timeout for Helia IPFS/IPNS resolution before falling back to gateways. */
	ipfsResolveTimeoutMs: 15 * SECOND,
	/** Hard cap to avoid loading unexpectedly huge feed bodies via Helia. */
	ipfsMaxBodyBytes: 8 * 1024 * 1024
} as const;

/**
 * Default transport policy for HTTP/HTTPS feed URLs.
 *
 * These rules apply to RSS / Atom / JSON Feed URLs over HTTP(S).
 * Nostr is relay-driven and does not use this transport matrix.
 */
export const INGESTION_HTTP_FEED_TRANSPORT_DEFAULTS = {
	rss: { directEnabled: false, proxyFallbackEnabled: true },
	atom: { directEnabled: false, proxyFallbackEnabled: true },
	jsonfeed: { directEnabled: true, proxyFallbackEnabled: true }
} as const;

/**
 * Default transport policy for IPFS/IPNS feed URLs.
 *
 * `directEnabled` controls Helia direct resolution.
 * `gatewayEnabled` controls direct HTTP gateway fallback.
 * `proxyEnabled` controls proxy-wrapped gateway fallback.
 */
export const INGESTION_IPFS_FEED_TRANSPORT_DEFAULTS = {
	rss: { directEnabled: true, gatewayEnabled: true, proxyEnabled: true },
	atom: { directEnabled: true, gatewayEnabled: true, proxyEnabled: true },
	jsonfeed: { directEnabled: true, gatewayEnabled: true, proxyEnabled: true }
} as const;

/**
 * Foreground scheduler defaults / safety rails. The user can override
 * the tick interval per-user, but never below `minTickMs` — that's a
 * guard against accidentally melting the CPU.
 */
export const INGESTION_SCHEDULER = {
	/** Default tick interval used when the user has no setting yet. */
	defaultTickIntervalMs: 30 * SECOND,
	/** Floor applied to the user-provided tick interval. */
	minTickMs: 5 * SECOND,
	/** How often the manager opportunistically sweeps retention/purge. */
	retentionCheckIntervalMs: 1 * HOUR
} as const;

export type IngestionBackoff = typeof INGESTION_BACKOFF;
export type IngestionFetch = typeof INGESTION_FETCH;
export type IngestionHttpFeedTransportDefaults = typeof INGESTION_HTTP_FEED_TRANSPORT_DEFAULTS;
export type IngestionIpfsFeedTransportDefaults = typeof INGESTION_IPFS_FEED_TRANSPORT_DEFAULTS;
export type IngestionScheduler = typeof INGESTION_SCHEDULER;

/**
 * Multi-protocol scoring policy.
 *
 * Each `FontProtocolEntry` in a font carries an independent score. The
 * declared primary is tried first; on `failoverThreshold` consecutive
 * failures the system silently tries the next-best fallback (highest
 * score) in the same tick. Scores nudge ±1 per outcome and decay
 * gently each tick so old performance fades. When a fallback's score
 * exceeds the declared primary's by `promotionMargin` for
 * `promotionWindowTicks` consecutive ticks, the system promotes that
 * fallback to *effective primary* (runtime only — the tree stays
 * untouched). The promotion reverts whenever the lead disappears.
 *
 * The user is unaware of any of this. Multi-protocol UI is hidden in
 * normal use; only the "could not fetch this font" notification
 * (rate-limited 1×/24h per font) and the unreachable label on the
 * detail page surface failure.
 */
export const INGESTION_PROTOCOL_SCORING = {
	/** Score delta on a successful fetch for the protocol that ran. */
	successDelta: +1,
	/** Score delta on a failed fetch for the protocol that ran. */
	failureDelta: -1,
	/** Multiplier applied to every protocol's score each tick. */
	decayFactor: 0.98,
	/** Lower clamp on score. */
	scoreMin: -50,
	/** Upper clamp on score. */
	scoreMax: 50,
	/** Consecutive failures of the active protocol that trigger fallback in the same tick. */
	failoverThreshold: 2,
	/** Score lead a fallback must hold over the declared primary to be considered a candidate for promotion. */
	promotionMargin: 5,
	/** Number of consecutive ticks the lead must be sustained before promoting. */
	promotionWindowTicks: 3,
	/**
	 * Smoothing factor for the EWMAs that track per-source `successRate`
	 * and `avgLatencyMs`. Closer to 1 reacts faster but is noisier;
	 * closer to 0 is smoother but slow to adapt. 0.2 is a balanced pick.
	 */
	ewmaAlpha: 0.2
} as const;

export type IngestionProtocolScoring = typeof INGESTION_PROTOCOL_SCORING;

/**
 * Soft-failure window. After Mode 1 (Adaptive Fallback) reports a
 * full failure, the font transitions to `UNSTABLE` and is polled at
 * `unstableSparseIntervalMs` instead of the user's normal cadence.
 * Sources keep their own per-source backoff (Mode 2). On the first
 * success after instability the font enters `RECOVERING` for
 * `recoveringHoldTicks` before going back to `HEALTHY` — this stops
 * a single lucky probe from immediately silencing the warning.
 */
export const INGESTION_INSTABILITY = {
	unstableSparseIntervalMs: 1 * HOUR,
	recoveringHoldTicks: 1
} as const;

export type IngestionInstability = typeof INGESTION_INSTABILITY;

/**
 * Per-source circuit-breaker thresholds. A source trips to `OPEN` once
 * its absolute `failureCount` reaches `openAfterFailures` *or* its
 * computed backoff hits the cap of `INGESTION_BACKOFF.maxMs`. While
 * `OPEN`, a single probe is scheduled within the random window
 * `[probeIntervalMin, probeIntervalMax]` (with jitter), moving the
 * source to `HALF_OPEN`. One success there closes the breaker and
 * resets metrics.
 */
export const INGESTION_CIRCUIT_BREAKER = {
	openAfterFailures: 6,
	openAfterBackoffMs: 24 * HOUR,
	probeIntervalMin: 6 * HOUR,
	probeIntervalMax: 24 * HOUR,
	halfOpenSuccessesToClose: 1
} as const;

export type IngestionCircuitBreaker = typeof INGESTION_CIRCUIT_BREAKER;

/**
 * Confidence score (0..1) reported by the pipeline for each font,
 * derived purely from `pipelineState`. UI consumers can use this to
 * dim cards, weight relevance signals, etc.
 */
export const INGESTION_CONFIDENCE = {
	HEALTHY: 1.0,
	RECOVERING: 0.7,
	UNSTABLE: 0.5,
	DEGRADED: 0.3,
	OFFLINE: 0.0
} as const;

export type IngestionConfidence = typeof INGESTION_CONFIDENCE;

/**
 * Retention window for events in the `pipelineEvents` store. Events
 * older than this are pruned regardless of consumption status — they
 * are well past any dedup or batch-grouping interest.
 */
export const INGESTION_PIPELINE_EVENT_RETENTION_MS = 7 * 24 * HOUR;

// ── Persistence ────────────────────────────────────────────────────────

/**
 * IndexedDB / store-level constants. Bumping `dbSchemaVersion` triggers
 * the destructive migration in `indexeddb.backend.ts` (drop + recreate
 * every store from `STORE_SPECS`) — acceptable in pre-release.
 */
export const PERSISTENCE = {
	/** Database name — change only if you intend a hard split. */
	dbName: 'notfeed-v2',
	/** Schema version. Bumping wipes data (destructive migration). */
	dbSchemaVersion: 18,
	/** Skip new activity events when the same targetId is among the last N. */
	activityDedupRecentCount: 3,
	/** Skip new activity events when the same targetId fired within this window. */
	activityDedupTimeWindowMs: 1 * MINUTE,
	/** Suggested (not enforced) max categories per tree on a single node. */
	categorySuggestionsPerTree: 3
} as const;

export type Persistence = typeof PERSISTENCE;

// ── Service worker ─────────────────────────────────────────────────────

/**
 * Background-sync wiring. Tag names must match between the registrar
 * (`sw-register.ts`) and the SW handlers; both read from here.
 */
export const SERVICE_WORKER = {
	/** Tag for `periodicsync` events (PWA installed + permission granted). */
	periodicSyncTag: 'notfeed-periodic-fetch',
	/** Tag for one-shot `sync` events fired on reconnect. */
	backgroundSyncTag: 'notfeed-fetch',
	/** Min interval requested for periodic sync. The browser may relax it
	 *  upward — Android enforces a 15min floor. */
	periodicMinIntervalMs: 15 * MINUTE
} as const;

export type ServiceWorkerConfig = typeof SERVICE_WORKER;

// ── Image processing ───────────────────────────────────────────────────

/**
 * Caps and quality knobs for the WEBP conversion pipeline. Touch these
 * to trade off file size vs. visual fidelity globally.
 */
export const IMAGE_LIMITS = {
	/** Avatar slot — square crop. */
	avatarMaxWidth: 512,
	avatarMaxHeight: 512,
	/** Banner slot — wide aspect. */
	bannerMaxWidth: 1600,
	bannerMaxHeight: 600,
	/** WEBP encoder quality (0..1). 0.85 is a good size/quality balance. */
	webpQuality: 0.85
} as const;

export type ImageLimits = typeof IMAGE_LIMITS;

// ── UI tunables ────────────────────────────────────────────────────────

/**
 * Pagination / debounce knobs that affect UI responsiveness. Not user
 * preferences — they're product-level tuning.
 */
export const UI_LIMITS = {
	/** Posts shown per "page" in the feed's infinite scroll. */
	feedPageSize: 20,
	/** "Show more" threshold for grouped page lists in entity filters. */
	entityFilterPageLimit: 5,
	/** Delay before search input fires the actual query. */
	searchDebounceMs: 300
} as const;

/**
 * Layout breakpoints used by `layout.svelte.ts`. Width-based — keep in
 * sync with Tailwind breakpoints if you tweak.
 */
export const UI_BREAKPOINTS = {
	/** Below this → compact (mobile / narrow window). */
	compactPx: 900,
	/** At/above this → large screen heuristics may apply. */
	largePx: 1280
} as const;

export type UiLimits = typeof UI_LIMITS;
export type UiBreakpoints = typeof UI_BREAKPOINTS;

// ── Notifications ──────────────────────────────────────────────────────

/**
 * Notification pipeline defaults. The pipeline is fixed in shape —
 * exactly three steps in funnel order, identified by stable ids:
 *
 *   1. `per_post`     — fire one notification per post matched by the
 *                       feed-macros the user picked. Click opens the
 *                       post URL.
 *   2. `batch_macro`  — fire one summary per matched feed-macro when
 *                       new posts arrive. Click opens the feed page
 *                       with that macro selected.
 *   3. `batch_global` — catch-all: fire one global summary when any
 *                       new posts arrive at all. Click opens the feed
 *                       page with the “all” macro selected.
 *
 * Steps 1 and 2 only ever reference feed-macros the user has already
 * created on the feed page — the notification system never defines
 * its own filter logic. They start with an empty `macroIds`, so they
 * stay dormant until the user picks at least one macro.
 *
 * The OS notification tag is shared across runtimes (web `Notification`
 * / SW `showNotification` / Tauri plugin) so a new batch supersedes the
 * previous unread one instead of stacking.
 */
export const NOTIFICATIONS = {
	/** Master switch seeded on first run for every user. */
	defaultEnabled: true,
	/**
	 * Do-not-disturb defaults. Quiet means: still record inbox entries,
	 * but skip OS notifications and don't bump the unread badge.
	 */
	defaultQuietPosts: false,
	/** Default for splitting the bell inbox into Posts/Health tabs. */
	defaultSplitInboxTabs: true,
	/** Stable ids of the three pipeline steps, in funnel order. */
	stepIds: {
		perPost: 'per_post',
		batchMacro: 'batch_macro',
		batchGlobal: 'batch_global'
	},
	/**
	 * Defaults applied when seeding a fresh pipeline. Steps 1 and 2 start
	 * dormant (no macros selected); step 3 — the catch-all — fires every
	 * 30 minutes whenever any new post arrives.
	 *
	 * The engine bypasses the `batch_global` cooldown for the first
	 * batch of a freshly activated font, so each newly followed source
	 * gets a "you started getting posts" ping even when several fonts
	 * are activated back-to-back.
	 */
	defaultPipelineSteps: [
		{ id: 'per_post', kind: 'per_post' as const, macroIds: [] as string[], intervalMs: 0 },
		{ id: 'batch_macro', kind: 'batch_macro' as const, macroIds: [] as string[], intervalMs: 30 * MINUTE },
		{ id: 'batch_global', kind: 'batch_global' as const, macroIds: [] as string[], intervalMs: 30 * MINUTE }
	],
	/** How many recent inbox entries the bell popover shows. */
	inboxRecentLimit: 20,
	/** Hard cap on stored inbox entries per user — older ones get pruned. */
	inboxHardCap: 500,
	/** OS notification tag — newer notifications replace the previous unread one. */
	osNotificationTag: 'notfeed-new',
	/**
	 * Pipeline-event channel (separate from the three post steps).
	 * Defaults are seeded into every user's `NotificationPipeline` and
	 * overridable on the settings page.
	 */
	pipelineEventDefaults: {
		mode: 'realtime' as 'realtime' | 'batched',
		severityThreshold: 'warning' as 'info' | 'warning' | 'critical',
		batchIntervalMs: 30 * MINUTE,
		quiet: false
	},
	/**
	 * Dedup windows per event type. While inside the window for a given
	 * `(fontId, type)` pair, the consumer drops repeats. Recovery events
	 * are exempt: they always fire if the previous state was non-healthy.
	 */
	pipelineEventDedup: {
		unstable: 30 * MINUTE,
		offline: 6 * HOUR,
		degraded: 30 * MINUTE,
		sourceSwitched: 6 * HOUR
	}
} as const;

export type Notifications = typeof NOTIFICATIONS;
