/**
 * Notification pipeline — fixed-shape, per-user funnel.
 *
 * Lives inside the user record at `settingsUser.notifications`. The
 * shape is fixed: exactly three stable steps in this order:
 *
 *   1. `per_post`     — one notification per matching post (title +
 *                       excerpt). Click opens the post URL.
 *   2. `batch_macro`  — one summary per matched feed-macro when new
 *                       posts arrive. Click opens the feed page with
 *                       that macro selected.
 *   3. `batch_global` — catch-all: one global summary when any new
 *                       posts arrive. Click opens the feed page with
 *                       the "all" macro selected.
 *
 * The notification system never defines its own filter logic. Steps 1
 * and 2 only reference `feed-macro` ids the user has already created
 * on the feed page (`consumer.feedMacros[*].id`). Matching is
 * delegated to the feed-macro evaluator
 * (`$lib/domain/feed-macro/macro-evaluator.ts`) so the feed and the
 * notifications agree by construction.
 *
 * `intervalMs` is honored only by the two batch steps; `per_post`
 * fires on every match.
 */

import { NOTIFICATIONS } from '$lib/config/back-settings.js';
import type { EventSeverity } from '$lib/domain/ingestion/pipeline-event.js';

export type NotificationStepKind = 'per_post' | 'batch_macro' | 'batch_global';
export type NotificationStepId = 'per_post' | 'batch_macro' | 'batch_global';

/** Delivery mode for the pipeline-event channel. */
export type PipelineEventMode = 'realtime' | 'batched';

/**
 * Per-user settings for the second notification channel: pipeline
 * state events (UNSTABLE / OFFLINE / RECOVERED / DEGRADED /
 * SOURCE_SWITCHED). Independent of the three post-pipeline steps.
 *
 * - `mode='realtime'`  — every event past the severity threshold is
 *   delivered as soon as the consumer runs (subject to per-event-type
 *   dedup windows).
 * - `mode='batched'`   — events are accumulated and delivered as a
 *   single summary every `batchIntervalMs`.
 */
export interface PipelineEventSettings {
	mode: PipelineEventMode;
	severityThreshold: EventSeverity;
	batchIntervalMs: number;
	/**
	 * Do-not-disturb for the health channel. When true the consumer
	 * still records inbox entries (so they show up in the bell when
	 * the user opens it) but skips the OS notification and the entries
	 * are flagged `quiet` so they do not bump the unread badge.
	 */
	quiet: boolean;
}

export interface NotificationStep {
	id: NotificationStepId;
	kind: NotificationStepKind;
	/**
	 * IDs of feed-macros the user picked for this step. Steps 1 and 2
	 * use this allow-list; step 3 ignores it (catch-all). When empty
	 * for steps 1 and 2 the step is dormant.
	 *
	 * IDs that no longer resolve to a macro in `consumer.feedMacros`
	 * are silently ignored by the engine (the user may have deleted
	 * the macro on the feed page).
	 */
	macroIds: string[];
	/** Minimum interval between fires (ms). Ignored by `per_post`. */
	intervalMs: number;
}

export interface NotificationPipeline {
	/** Master switch — when false, no step ever fires. */
	enabled: boolean;
	/**
	 * Do-not-disturb for the post channel (the three-step funnel).
	 * When true, the engine still creates inbox entries but skips OS
	 * notifications and the entries do not bump the unread badge.
	 */
	quietPosts: boolean;
	/**
	 * When true, the bell popover splits its inbox list into two tabs
	 * ("posts" and "health"). When false, all entries appear in a
	 * single chronological list. Default: true.
	 */
	splitInboxTabs: boolean;
	/**
	 * Always exactly three steps in this order:
	 * `[per_post, batch_macro, batch_global]`. Persisted as an array
	 * so order is explicit and matches the funnel UI.
	 */
	steps: [NotificationStep, NotificationStep, NotificationStep];
	/**
	 * Delivery settings for the second channel (pipeline state
	 * events). Independent of `steps`, which only governs post
	 * notifications.
	 */
	pipelineEvents: PipelineEventSettings;
	updatedAt: number;
}

/** Build the canonical three-step list from `NOTIFICATIONS.defaultPipelineSteps`. */
function defaultSteps(): [NotificationStep, NotificationStep, NotificationStep] {
	const [a, b, c] = NOTIFICATIONS.defaultPipelineSteps;
	return [
		{ id: 'per_post', kind: 'per_post', macroIds: [...a.macroIds], intervalMs: a.intervalMs },
		{ id: 'batch_macro', kind: 'batch_macro', macroIds: [...b.macroIds], intervalMs: b.intervalMs },
		{ id: 'batch_global', kind: 'batch_global', macroIds: [...c.macroIds], intervalMs: c.intervalMs }
	];
}

/** Build the canonical pipeline-event settings from defaults. */
export function defaultPipelineEventSettings(): PipelineEventSettings {
	const d = NOTIFICATIONS.pipelineEventDefaults;
	return {
		mode: d.mode,
		severityThreshold: d.severityThreshold,
		batchIntervalMs: d.batchIntervalMs,
		quiet: d.quiet
	};
}

/** Fresh pipeline for a brand-new user. Seeded into `UserSettings.notifications`. */
export function createNotificationPipeline(): NotificationPipeline {
	return {
		enabled: NOTIFICATIONS.defaultEnabled,
		quietPosts: NOTIFICATIONS.defaultQuietPosts,
		splitInboxTabs: NOTIFICATIONS.defaultSplitInboxTabs,
		steps: defaultSteps(),
		pipelineEvents: defaultPipelineEventSettings(),
		updatedAt: Date.now()
	};
}

/**
 * Heal a persisted pipeline by filling fields that were added after
 * the user record was first written. Returns a normalized object —
 * defaults are non-destructive (only used when the field is missing).
 */
export function withPipelineDefaults(p: NotificationPipeline): NotificationPipeline {
	const events = p.pipelineEvents ?? defaultPipelineEventSettings();
	return {
		...p,
		quietPosts: p.quietPosts ?? NOTIFICATIONS.defaultQuietPosts,
		splitInboxTabs: p.splitInboxTabs ?? NOTIFICATIONS.defaultSplitInboxTabs,
		pipelineEvents: {
			...events,
			quiet: events.quiet ?? NOTIFICATIONS.pipelineEventDefaults.quiet
		}
	};
}
