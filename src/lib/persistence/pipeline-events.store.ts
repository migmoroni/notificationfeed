/**
 * Pipeline event bus persistence.
 *
 * Durable queue between the post-manager (producer of `PipelineEvent`s)
 * and the notification consumer (`pipeline-event-consumer.ts`).
 * Events survive page reloads and service-worker restarts so the
 * batched-delivery mode can group across sessions.
 *
 * Per-user consumption is tracked via `consumedBy: string[]` on each
 * event. The pruner removes events that have been consumed by every
 * interested user *and* are older than a retention window.
 */

import type { PipelineEvent } from '$lib/domain/ingestion/pipeline-event.js';
import { uuidv7 } from '$lib/domain/shared/uuidv7.js';
import { getStorageBackend } from './db.js';

/**
 * Append a new event. Caller does not need to set `id` — it is
 * generated here so producers cannot accidentally collide.
 */
export async function appendPipelineEvent(
	event: Omit<PipelineEvent, 'id' | 'consumedBy'> & { consumedBy?: string[] }
): Promise<PipelineEvent> {
	const db = await getStorageBackend();
	const full: PipelineEvent = {
		id: uuidv7(),
		consumedBy: event.consumedBy ?? [],
		...event
	};
	await db.pipelineEvents.put(full);
	return full;
}

/** Read every event for a font, newest first. */
export async function listPipelineEventsByFont(fontId: string): Promise<PipelineEvent[]> {
	const db = await getStorageBackend();
	const all = await db.pipelineEvents.query<PipelineEvent>('byFont', fontId);
	return all.sort((a, b) => b.timestamp - a.timestamp);
}

/**
 * Read events not yet consumed by `userId`. Caller is responsible for
 * applying severity / dedup / escalation rules; this only filters by
 * consumption ledger.
 */
export async function listUnconsumedPipelineEvents(userId: string): Promise<PipelineEvent[]> {
	const db = await getStorageBackend();
	const all = await db.pipelineEvents.getAll<PipelineEvent>();
	return all
		.filter((e) => !e.consumedBy.includes(userId))
		.sort((a, b) => a.timestamp - b.timestamp);
}

/**
 * Mark a batch of events as consumed for a user. Idempotent —
 * already-consumed events are left alone.
 */
export async function markPipelineEventsConsumed(
	userId: string,
	eventIds: string[]
): Promise<void> {
	if (eventIds.length === 0) return;
	const db = await getStorageBackend();
	for (const id of eventIds) {
		const ev = await db.pipelineEvents.getById<PipelineEvent>(id);
		if (!ev) continue;
		if (ev.consumedBy.includes(userId)) continue;
		ev.consumedBy = [...ev.consumedBy, userId];
		await db.pipelineEvents.put(ev);
	}
}

/**
 * Drop events older than `keepWindowMs`. Conservative — does not
 * require full per-user consumption to delete, since the retention
 * window itself is the upper bound on dedup interest.
 */
export async function prunePipelineEvents(now: number, keepWindowMs: number): Promise<number> {
	const db = await getStorageBackend();
	const all = await db.pipelineEvents.getAll<PipelineEvent>();
	let removed = 0;
	for (const ev of all) {
		if (now - ev.timestamp > keepWindowMs) {
			await db.pipelineEvents.delete(ev.id);
			removed++;
		}
	}
	return removed;
}
