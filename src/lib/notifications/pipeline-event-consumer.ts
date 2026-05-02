/**
 * Pipeline event consumer — second notification channel.
 *
 * The post-manager produces `PipelineEvent`s into a durable IDB queue
 * whenever a font's pipeline state machine transitions
 * (`PIPELINE_UNSTABLE`, `PIPELINE_OFFLINE`, `PIPELINE_RECOVERED`,
 * `PIPELINE_DEGRADED`, `SOURCE_SWITCHED`). This module reads
 * unconsumed events for one user and turns them into inbox entries +
 * OS notifications, then marks the events consumed.
 *
 * Independent of the three post-pipeline steps in
 * `notification-engine.ts` — that channel is for *new posts*; this
 * one is for *operational health*.
 *
 * Per-user knobs (under `notifications.pipelineEvents`):
 *   - `mode`: `realtime` fires every event past the threshold;
 *     `batched` accumulates and emits one summary every
 *     `batchIntervalMs`.
 *   - `severityThreshold`: drop events below the threshold (consumed
 *     anyway so they don't pile up).
 *
 * Dedup: per `(fontId, type)` pair, fall through if the previous fire
 * for the same pair is older than the configured window in
 * `NOTIFICATIONS.pipelineEventDedup`. Recovery events bypass dedup —
 * users always want to know a font came back.
 *
 * Isomorphic: must NOT touch any `*.svelte.ts` store. Translation
 * uses `tFor(lang, key, params)` which reads the JSON dictionaries
 * directly.
 */

import type { PipelineEvent, PipelineEventType } from '$lib/domain/ingestion/pipeline-event.js';
import { severityMeets } from '$lib/domain/ingestion/pipeline-event.js';
import type { InboxEntry, InboxEntryKind } from '$lib/domain/notifications/inbox.js';
import type { UserConsumer } from '$lib/domain/user/user-consumer.js';
import type { ContentTree, TreeNode } from '$lib/domain/content-tree/content-tree.js';
import type { NotificationPipeline } from '$lib/domain/notifications/pipeline.js';
import {
	createNotificationPipeline,
	defaultPipelineEventSettings
} from '$lib/domain/notifications/pipeline.js';
import { NOTIFICATIONS } from '$lib/config/back-settings.js';
import { getStorageBackend } from '$lib/persistence/db.js';
import {
	listUnconsumedPipelineEvents,
	markPipelineEventsConsumed
} from '$lib/persistence/pipeline-events.store.js';
import {
	appendInboxEntries,
	listInboxForUser
} from '$lib/persistence/notification-inbox.store.js';
import { tFor } from '$lib/i18n/t-static.js';
import { notifyOs } from './os-notifier.js';

export interface ConsumeResult {
	/** Inbox entries created. */
	entriesCreated: number;
	/** Events marked consumed (delivered or filtered). */
	eventsConsumed: number;
}

/** Map a pipeline event type to its inbox kind. */
function inboxKindFor(type: PipelineEventType): InboxEntryKind {
	switch (type) {
		case 'PIPELINE_UNSTABLE':
			return 'font_unstable';
		case 'PIPELINE_OFFLINE':
			return 'font_offline';
		case 'PIPELINE_RECOVERED':
			return 'font_recovered';
		case 'PIPELINE_DEGRADED':
			return 'font_degraded';
		case 'SOURCE_SWITCHED':
			return 'font_source_switched';
	}
}

/** i18n key suffix used for the `notifications.<suffix>_title/_body` pair. */
function i18nSuffixFor(type: PipelineEventType): string {
	switch (type) {
		case 'PIPELINE_UNSTABLE':
			return 'font_unstable';
		case 'PIPELINE_OFFLINE':
			return 'font_offline';
		case 'PIPELINE_RECOVERED':
			return 'font_recovered';
		case 'PIPELINE_DEGRADED':
			return 'font_degraded';
		case 'SOURCE_SWITCHED':
			return 'font_source_switched';
	}
}

/** Dedup window (ms) for an event type. */
function dedupWindowFor(type: PipelineEventType): number {
	const d = NOTIFICATIONS.pipelineEventDedup;
	switch (type) {
		case 'PIPELINE_UNSTABLE':
			return d.unstable;
		case 'PIPELINE_OFFLINE':
			return d.offline;
		case 'PIPELINE_DEGRADED':
			return d.degraded;
		case 'SOURCE_SWITCHED':
			return d.sourceSwitched;
		case 'PIPELINE_RECOVERED':
			return 0; // never deduped
	}
}

/** Map a node id to the title found in the user's content trees. */
function findNodeTitle(trees: ContentTree[], nodeId: string): string {
	for (const tree of trees) {
		const node: TreeNode | undefined = tree.nodes[nodeId];
		if (node) {
			return node.data.header?.title ?? nodeId;
		}
	}
	return nodeId;
}

/** Look up the most recent fire of `(kind, fontId)` in the inbox. */
function lastFireMs(
	inbox: InboxEntry[],
	kind: InboxEntryKind,
	fontId: string
): number {
	let max = 0;
	for (const e of inbox) {
		if (e.kind !== kind) continue;
		if (e.target.kind !== 'node' || e.target.nodeId !== fontId) continue;
		if (e.createdAt > max) max = e.createdAt;
	}
	return max;
}

/**
 * Consume unread pipeline events for one user. Loads the user's
 * pipeline-event settings, applies severity filter + dedup, writes
 * inbox entries, fires OS notifications, then marks the events
 * consumed (whether they were delivered or filtered out).
 */
export async function consumePipelineEvents(
	userId: string,
	now: number = Date.now()
): Promise<ConsumeResult> {
	const db = await getStorageBackend();
	const user = await db.users.getById<UserConsumer>(userId);
	if (!user) return { entriesCreated: 0, eventsConsumed: 0 };

	const persisted = user.settingsUser?.notifications;
	const pipeline: NotificationPipeline =
		persisted && Array.isArray(persisted.steps) && persisted.steps.length === 3
			? persisted
			: createNotificationPipeline();
	if (!pipeline.enabled) return { entriesCreated: 0, eventsConsumed: 0 };

	const settings = pipeline.pipelineEvents ?? defaultPipelineEventSettings();
	const lang = user.settingsUser?.language ?? '';

	const events = await listUnconsumedPipelineEvents(userId);
	if (events.length === 0) return { entriesCreated: 0, eventsConsumed: 0 };

	const trees = await db.contentTrees.getAll<ContentTree>();
	const inbox = await listInboxForUser(userId);

	// Partition events into "deliver" and "drop". Both are marked
	// consumed at the end so the queue doesn't grow unbounded.
	const toDeliver: PipelineEvent[] = [];
	const toDrop: PipelineEvent[] = [];

	for (const ev of events) {
		// 1) Severity filter — drop below threshold.
		if (!severityMeets(ev.severity, settings.severityThreshold)) {
			toDrop.push(ev);
			continue;
		}
		// 2) Dedup against the inbox. Recovery events skip this.
		const kind = inboxKindFor(ev.type);
		const window = dedupWindowFor(ev.type);
		if (window > 0) {
			const last = lastFireMs(inbox, kind, ev.fontId);
			if (last > 0 && ev.timestamp - last < window) {
				toDrop.push(ev);
				continue;
			}
		}
		toDeliver.push(ev);
	}

	// In batched mode we still gate by `batchIntervalMs` against the
	// most recent pipeline-event fire of *any* kind. This is a coarse
	// rate limiter — events that survive the gate are delivered as
	// individual entries (one per event) so the inbox preserves the
	// transition history; the user just doesn't see them in real time.
	if (settings.mode === 'batched' && toDeliver.length > 0) {
		const lastAny = inbox
			.filter((e) =>
				e.kind === 'font_unstable' ||
				e.kind === 'font_offline' ||
				e.kind === 'font_recovered' ||
				e.kind === 'font_degraded' ||
				e.kind === 'font_source_switched'
			)
			.reduce((max, e) => (e.createdAt > max ? e.createdAt : max), 0);
		if (lastAny > 0 && now - lastAny < settings.batchIntervalMs) {
			// Defer delivery — leave events unconsumed for the next run.
			return { entriesCreated: 0, eventsConsumed: 0 };
		}
	}

	// Build inbox entries.
	const quiet = settings.quiet === true;
	const newEntries: Omit<InboxEntry, '_pk' | 'userId'>[] = toDeliver.map((ev, i) => {
		const fontTitle = findNodeTitle(trees, ev.fontId);
		const suffix = i18nSuffixFor(ev.type);
		const params: Record<string, string> = { font: fontTitle };
		if (ev.type === 'SOURCE_SWITCHED' && ev.metadata) {
			if (typeof ev.metadata.from === 'string') params.from = ev.metadata.from;
			if (typeof ev.metadata.to === 'string') params.to = ev.metadata.to;
		}
		const title = tFor(lang, `notifications.${suffix}_title`, params);
		const body = tFor(lang, `notifications.${suffix}_body`, params);
		return {
			id: `${suffix}-${ev.fontId}-${ev.timestamp}-${i}`,
			kind: inboxKindFor(ev.type),
			stepId: suffix,
			title,
			body,
			createdAt: ev.timestamp,
			read: false,
			quiet,
			target: { kind: 'node', nodeId: ev.fontId }
		};
	});

	if (newEntries.length > 0) {
		await appendInboxEntries(userId, newEntries);
		if (!quiet) {
			// Best-effort OS notifications.
			for (const e of newEntries) {
				void notifyOs({
					title: e.title,
					body: e.body,
					tag: `${NOTIFICATIONS.osNotificationTag}-${e.kind}-${
						e.target.kind === 'node' ? e.target.nodeId : 'x'
					}`,
					data: {
						targetUrl:
							e.target.kind === 'node'
								? `/library/node/${encodeURIComponent(e.target.nodeId)}`
								: '/'
					}
				});
			}
		}
	}

	// Mark every event consumed (delivered + dropped).
	const consumedIds = [...toDeliver.map((e) => e.id), ...toDrop.map((e) => e.id)];
	await markPipelineEventsConsumed(userId, consumedIds);

	return { entriesCreated: newEntries.length, eventsConsumed: consumedIds.length };
}
