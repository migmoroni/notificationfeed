/**
 * Ingestion settings — per-user configuration for the PostManager.
 *
 * Embedded in `UserSettings.ingestion`. All durations are in milliseconds and
 * day-counts are integers. `proxyServices` defines the CORS proxy chain used
 * by the web HTTP adapter (Tauri ignores it via `tauri-plugin-http`).
 */

export interface ProxyConfig {
	/** Template URL with `{url}` placeholder for the encoded target. */
	url: string;
	/** Display label shown in settings UI. */
	label: string;
	/** When true, the proxy returns pre-parsed JSON (e.g. rss2json) — skip XML parser. */
	parsesRss: boolean;
}

export interface IngestionSettings {
	/** How often the foreground scheduler wakes up to evaluate due fonts (ms). */
	schedulerTickIntervalMs: number;

	/**
	 * Polling interval (ms) for this user's fonts while the user is the
	 * active (foreground) user — i.e. actively interacting with the app.
	 */
	activeFontIntervalMs: number;

	/**
	 * Polling interval (ms) used while the user has been idle for less
	 * than `idleTier1MaxIdleMs`. Default: 30min.
	 */
	idleTier1IntervalMs: number;
	/**
	 * Upper bound (ms since last interaction) for tier-1. Default 24h.
	 * Below this → use `idleTier1IntervalMs`.
	 */
	idleTier1MaxIdleMs: number;

	/**
	 * Polling interval (ms) used while the user's idle time is between
	 * `idleTier1MaxIdleMs` and `idleTier2MaxIdleMs`. Default: 4h.
	 */
	idleTier2IntervalMs: number;
	/**
	 * Upper bound (ms since last interaction) for tier-2. Default 72h.
	 * Below this (and above tier-1) → use `idleTier2IntervalMs`.
	 */
	idleTier2MaxIdleMs: number;

	/**
	 * Polling interval (ms) used after `idleTier2MaxIdleMs`. Default: 24h.
	 */
	idleTier3IntervalMs: number;

	/**
	 * On activation of a font, copy historical posts already cached in
	 * sibling user boxes into the current user's box, so the feed
	 * populates instantly.
	 */
	backfillOnActivate: boolean;
	/**
	 * On activation of a font, force an immediate network fetch (bypasses
	 * the per-font `nextScheduledAt` window). Disable to wait for the
	 * regular polling cycle instead.
	 */
	refreshOnActivate: boolean;

	/**
	 * Whether to apply exponential backoff after a fetch fails.
	 * When disabled, the next attempt happens at the regular interval
	 * regardless of consecutive failures.
	 */
	backoffEnabled: boolean;
	/**
	 * Multiplier used for the exponential progression. With multiplier=2
	 * a font's interval doubles after each consecutive failure (until
	 * `maxBackoffSteps` or `maxBackoffMs` caps the result).
	 * Use 1 for a constant-interval retry, 2 for classic doubling, 3 for
	 * faster give-up.
	 */
	backoffMultiplier: number;
	/**
	 * Cap on how many consecutive failures count toward the exponent.
	 * The delay formula is
	 * `interval * backoffMultiplier^min(failures, maxBackoffSteps)`.
	 */
	maxBackoffSteps: number;
	/**
	 * Absolute ceiling (ms) on the computed backoff delay. The final
	 * delay is `min(formula, maxBackoffMs)`. Prevents the doubling
	 * progression from sleeping for absurd amounts of time.
	 */
	maxBackoffMs: number;

	/** Posts older than this in active sources auto-move to trash (days). */
	trashAgeActiveDays: number;
	/**
	 * Posts older than this on fonts the user has *deactivated* (still
	 * have residual posts in this user's box) auto-move to trash. This
	 * is a per-user judgment: other users keeping the same font active
	 * are unaffected.
	 */
	trashAgeOrphanDays: number;
	/** Posts in trash for longer than this are physically purged (days). */
	purgeAfterTrashDays: number;

	/** Whether to use proxies for CORS-blocked feeds in web/PWA. */
	proxyEnabled: boolean;
	/** Ordered list; first 2xx response wins. */
	proxyServices: ProxyConfig[];

	/** Show OS notification when new posts arrive (PWA only, requires permission). */
	notifyOnNewPosts: boolean;
}

export const DEFAULT_PROXIES: ProxyConfig[] = [
	{ url: 'https://corsproxy.io/?{url}', label: 'corsproxy.io', parsesRss: false },
	{ url: 'https://api.rss2json.com/v1/api.json?rss_url={url}', label: 'rss2json', parsesRss: true }
];

export function createIngestionSettings(): IngestionSettings {
	return {
		schedulerTickIntervalMs: 30_000,
		activeFontIntervalMs: 5 * 60_000,
		idleTier1IntervalMs: 30 * 60_000,
		idleTier1MaxIdleMs: 24 * 60 * 60_000,
		idleTier2IntervalMs: 4 * 60 * 60_000,
		idleTier2MaxIdleMs: 72 * 60 * 60_000,
		idleTier3IntervalMs: 24 * 60 * 60_000,
		backfillOnActivate: true,
		refreshOnActivate: true,
		backoffEnabled: true,
		backoffMultiplier: 2,
		maxBackoffSteps: 6,
		maxBackoffMs: 24 * 60 * 60_000,
		trashAgeActiveDays: 180,
		trashAgeOrphanDays: 30,
		purgeAfterTrashDays: 30,
		proxyEnabled: true,
		proxyServices: [...DEFAULT_PROXIES],
		notifyOnNewPosts: false
	};
}
