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

export type IngestionBackoff = typeof INGESTION_BACKOFF;
