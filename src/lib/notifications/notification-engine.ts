/**
 * Notification engine.
 *
 * Runs after an ingestion sweep: reads the user's pipeline + meta,
 * collects unnotified posts (`notifiedAt == null`), evaluates each
 * step in order against user-created **feed-macros**, writes inbox
 * entries and (best-effort) fires OS notifications, then stamps
 * `notifiedAt` on the consumed posts so subsequent ticks don't
 * re-process them.
 *
 * Isomorphic: must NOT touch any `*.svelte.ts` store. Safe to call
 * from the foreground page and from the service worker. Macros are
 * loaded from the user record (`UserConsumer.feedMacros`); trees are
 * loaded from `db.contentTrees`. Match logic is delegated to
 * `postMatchesMacro` so the feed and the engine agree by construction.
 *
 * Step semantics (first-match-wins, per pending post):
 *   - per_post     — emit one inbox entry + OS notif per matching
 *                    post. Click target is the post URL. Stamp every
 *                    consumed post immediately. `intervalMs` is
 *                    ignored (always due).
 *   - batch_macro  — collect matching posts per macro id. If
 *                    `now - lastFiredAt[step] >= intervalMs`, emit
 *                    one summary per macro that produced posts. Click
 *                    target is the feed page with that macro selected.
 *   - batch_global — catch-all: collect every pending post. If
 *                    interval has elapsed, emit one global summary.
 *                    Click target is the feed page with the synthetic
 *                    "all macros" view selected.
 *
 * A post matches a per_post or batch_macro step when at least one of
 * the step's `macroIds` references a real macro on the user record
 * AND that macro accepts the post via `postMatchesMacro`. Macro IDs
 * that no longer resolve (user deleted the macro) are silently
 * ignored. The `batch_global` step matches every post regardless.
 *
 * Each post is consumed by at most one step (first match wins) —
 * overlapping macro selections do not trigger duplicate notifications.
 */

import type { CanonicalPost } from '$lib/normalization/canonical-post.js';
import type { NotificationStep, NotificationPipeline } from '$lib/domain/notifications/pipeline.js';
import { createNotificationPipeline } from '$lib/domain/notifications/pipeline.js';
import type { UserConsumer } from '$lib/domain/user/user-consumer.js';
import type { InboxEntry, InboxTarget } from '$lib/domain/notifications/inbox.js';
import type { ContentTree } from '$lib/domain/content-tree/content-tree.js';
import type { FeedMacro } from '$lib/domain/feed-macro/feed-macro.js';
import {
	buildNodeCategoryIndex,
	postMatchesMacro,
	type NodeCategoryIndex
} from '$lib/domain/feed-macro/macro-evaluator.js';
import { NOTIFICATIONS } from '$lib/config/back-settings.js';
import {
	listUnnotifiedForUser,
	markPostsNotified
} from '$lib/persistence/post.store.js';
import { getStorageBackend } from '$lib/persistence/db.js';
import {
	getNotificationMeta,
	recordStepFired,
	recordBatchGlobalNodes
} from '$lib/persistence/notification-meta.store.js';
import { appendInboxEntries } from '$lib/persistence/notification-inbox.store.js';
import { notifyOs } from './os-notifier.js';

/** Sentinel macroId routed to "all macros combined" on the feed page. */
const ALL_MACROS_ID = '__all__';

export interface RunResult {
	/** Number of inbox entries created. */
	entriesCreated: number;
	/** Number of posts whose `notifiedAt` was stamped. */
	postsConsumed: number;
}

interface PendingFire {
	stepId: string;
	kind: NotificationStep['kind'];
	title: string;
	body: string;
	target: InboxTarget;
	/** Posts to stamp `notifiedAt` for when this fire is committed. */
	consumed: CanonicalPost[];
}

/**
 * Plain text summary for a batch step. Hard-coded English phrasing —
 * the engine runs in the SW where `t()` is not wired. The inbox UI
 * may re-render localized strings later if needed.
 */
function batchSummary(count: number): { title: string; body: string } {
	return {
		title: 'Notfeed',
		body: count === 1 ? '1 new post' : `${count} new posts`
	};
}

/** Truncate a single-post title for the body of a `per_post` notification. */
function perPostSummary(post: CanonicalPost): { title: string; body: string } {
	const title = post.title?.trim() || post.author?.trim() || 'Notfeed';
	const body = (post.content ?? '')
		.replace(/<[^>]*>/g, '')
		.replace(/\s+/g, ' ')
		.trim()
		.slice(0, 140);
	return { title: title.slice(0, 80), body: body || post.url || '' };
}

/**
 * Returns the first macro id from `step.macroIds` whose macro
 * accepts `post`. `null` when no listed macro matches (or none of
 * them resolve to a real macro on the user record).
 */
function firstMatchingMacroId(
	post: CanonicalPost,
	step: NotificationStep,
	macrosById: Map<string, FeedMacro>,
	index: NodeCategoryIndex
): string | null {
	for (const macroId of step.macroIds) {
		const macro = macrosById.get(macroId);
		if (!macro) continue; // dead reference — silently ignore
		if (postMatchesMacro(post, macro, index)) return macroId;
	}
	return null;
}

interface UserContext {
	pipeline: NotificationPipeline;
	macrosById: Map<string, FeedMacro>;
	index: NodeCategoryIndex;
}

/**
 * Load the user's pipeline + macros + tree index. Returns `null` when
 * the user no longer exists. The pipeline is rebuilt from defaults
 * when the persisted slice is missing or malformed (no migrations —
 * pre-launch app, schema is destructive).
 *
 * `batch_macro` is clamped up to the smallest ingestion polling
 * interval so per-macro batching never fires faster than ingestion
 * produces posts. `batch_global` is exempt — it's the catch-all that
 * the activation flow piggybacks on (each `consumer.activateNode`
 * triggers an immediate `refreshFont`), and clamping it would suppress
 * the user-visible "you got new posts" ping for back-to-back
 * activations.
 */
async function loadUserContext(userId: string): Promise<UserContext | null> {
	const db = await getStorageBackend();
	const user = await db.users.getById<UserConsumer>(userId);
	if (!user) return null;

	const persisted = user.settingsUser?.notifications;
	const pipeline: NotificationPipeline =
		persisted && Array.isArray(persisted.steps) && persisted.steps.length === 3
			? persisted
			: createNotificationPipeline();

	const ing = user.settingsUser?.ingestion;
	if (ing) {
		const floor = Math.min(
			ing.activeFontIntervalMs,
			ing.idleTier1IntervalMs,
			ing.idleTier2IntervalMs,
			ing.idleTier3IntervalMs
		);
		for (const step of pipeline.steps) {
			if (step.kind === 'batch_macro' && step.intervalMs < floor) {
				step.intervalMs = floor;
			}
		}
	}

	const macros = user.feedMacros ?? [];
	const macrosById = new Map<string, FeedMacro>(macros.map((m) => [m.id, m]));

	const trees = await db.contentTrees.getAll<ContentTree>();
	const index = buildNodeCategoryIndex(trees);

	return { pipeline, macrosById, index };
}

/**
 * Evaluate the pipeline and run side-effects (inbox + OS notifs +
 * post stamping). Idempotent within a single tick: posts whose
 * `notifiedAt` is non-null are filtered out before evaluation.
 */
export async function runNotificationPipeline(
	userId: string,
	now: number = Date.now()
): Promise<RunResult> {
	const ctx = await loadUserContext(userId);
	if (!ctx || !ctx.pipeline.enabled) {
		return { entriesCreated: 0, postsConsumed: 0 };
	}
	const { pipeline, macrosById, index } = ctx;

	const pending = await listUnnotifiedForUser(userId);
	if (pending.length === 0) return { entriesCreated: 0, postsConsumed: 0 };

	const meta = await getNotificationMeta(userId);

	// First-match-wins. Per step, posts are tagged with the matching
	// macroId (for batch_macro) so we can group later.
	const perPostBucket: CanonicalPost[] = [];
	const batchMacroBucket = new Map<string, CanonicalPost[]>();
	const batchGlobalBucket: CanonicalPost[] = [];

	for (const post of pending) {
		let consumed = false;
		for (const step of pipeline.steps) {
			if (step.kind === 'per_post') {
				if (firstMatchingMacroId(post, step, macrosById, index) !== null) {
					perPostBucket.push(post);
					consumed = true;
					break;
				}
			} else if (step.kind === 'batch_macro') {
				const matchedMacroId = firstMatchingMacroId(post, step, macrosById, index);
				if (matchedMacroId !== null) {
					const list = batchMacroBucket.get(matchedMacroId);
					if (list) list.push(post);
					else batchMacroBucket.set(matchedMacroId, [post]);
					consumed = true;
					break;
				}
			} else if (step.kind === 'batch_global') {
				batchGlobalBucket.push(post);
				consumed = true;
				break;
			}
			if (consumed) break;
		}
	}

	const fires: PendingFire[] = [];

	const perPostStep = pipeline.steps.find((s) => s.kind === 'per_post');
	if (perPostStep && perPostBucket.length > 0) {
		for (const p of perPostBucket) {
			const { title, body } = perPostSummary(p);
			fires.push({
				stepId: perPostStep.id,
				kind: 'per_post',
				title,
				body,
				target: { kind: 'url', url: p.url ?? '/', postId: p.id },
				consumed: [p]
			});
		}
	}

	const batchMacroStep = pipeline.steps.find((s) => s.kind === 'batch_macro');
	if (batchMacroStep && batchMacroBucket.size > 0) {
		const lastFired = meta.stepLastFiredAt[batchMacroStep.id] ?? 0;
		if (now - lastFired >= batchMacroStep.intervalMs) {
			for (const [macroId, group] of batchMacroBucket) {
				const { title, body } = batchSummary(group.length);
				fires.push({
					stepId: batchMacroStep.id,
					kind: 'batch_macro',
					title,
					body,
					target: { kind: 'macro', macroId },
					consumed: group
				});
			}
		}
	}

	const batchGlobalStep = pipeline.steps.find((s) => s.kind === 'batch_global');
	if (batchGlobalStep && batchGlobalBucket.length > 0) {
		const lastFired = meta.stepLastFiredAt[batchGlobalStep.id] ?? 0;
		// Cooldown bypass: when this batch contains posts from a node
		// that has never had a `batch_global` fire delivered before
		// (a freshly activated font's first delivery), notify even if
		// we're inside the configured interval. Without this, the very
		// first batch from each new font after the first one of the
		// hour is silently swallowed.
		const everFiredNodes = new Set(
			meta.batchGlobalEverNotifiedNodeIds ?? []
		);
		const hasFirstDelivery = batchGlobalBucket.some(
			(p) => !everFiredNodes.has(p.nodeId)
		);
		if (hasFirstDelivery || now - lastFired >= batchGlobalStep.intervalMs) {
			const { title, body } = batchSummary(batchGlobalBucket.length);
			fires.push({
				stepId: batchGlobalStep.id,
				kind: 'batch_global',
				title,
				body,
				target: { kind: 'macro', macroId: ALL_MACROS_ID },
				consumed: batchGlobalBucket
			});
		}
	}

	if (fires.length === 0) return { entriesCreated: 0, postsConsumed: 0 };

	// Persist inbox entries first (canonical log), then fire OS
	// notifications best-effort, then stamp posts.
	let rand = 0;
	const entries: Omit<InboxEntry, '_pk' | 'userId'>[] = fires.map((f) => ({
		id: `${f.stepId}-${now}-${rand++}`,
		kind: f.kind,
		stepId: f.stepId,
		title: f.title,
		body: f.body,
		createdAt: now,
		read: false,
		target: f.target
	}));
	await appendInboxEntries(userId, entries);

	for (const f of fires) {
		const targetUrl =
			f.target.kind === 'url'
				? f.target.url
				: f.target.kind === 'node'
					? `/library/node/${encodeURIComponent(f.target.nodeId)}`
					: `/?macro=${encodeURIComponent(f.target.macroId)}`;
		void notifyOs({
			title: f.title,
			body: f.body,
			tag: NOTIFICATIONS.osNotificationTag,
			data: { targetUrl }
		});
	}

	// Stamp lastFired for batch steps that fired.
	const firedStepIds = new Set(fires.map((f) => f.stepId));
	for (const stepId of firedStepIds) {
		const step = pipeline.steps.find((s) => s.id === stepId);
		if (step && step.kind !== 'per_post') {
			await recordStepFired(userId, stepId, now);
		}
	}

	// Track which nodes have now had their first `batch_global` fire,
	// so the cooldown bypass only applies to genuinely new sources.
	const batchGlobalNodeIds = fires
		.filter((f) => f.kind === 'batch_global')
		.flatMap((f) => f.consumed.map((p) => p.nodeId));
	if (batchGlobalNodeIds.length > 0) {
		await recordBatchGlobalNodes(userId, batchGlobalNodeIds);
	}

	// Consume posts.
	const stampKeys = fires.flatMap((f) =>
		f.consumed.map((p) => ({ nodeId: p.nodeId, postId: p.id }))
	);
	const consumed = await markPostsNotified(userId, stampKeys, now);

	return { entriesCreated: entries.length, postsConsumed: consumed };
}
