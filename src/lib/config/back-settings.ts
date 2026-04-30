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
	/** Default kinds when the font config doesn't override them
	 *  (1 = short notes, 30023 = NIP-23 long-form). */
	nostrDefaultKinds: [1, 30023] as readonly number[],
	/** ± fraction added to scheduled times to avoid synchronized bursts.
	 *  0.1 = ±10% of the interval. Set to 0 to disable jitter entirely. */
	jitterPct: 0.1
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
export type IngestionScheduler = typeof INGESTION_SCHEDULER;

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
	dbSchemaVersion: 12,
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
