/**
 * Activity store — persistence for per-user activity logs.
 *
 * Rows live in a dedicated `activityData` object store keyed by `userId`, so
 * the user record stays lean as the event list grows. All writes should go
 * through `activityService` (single write-point).
 *
 * Centralizes:
 *   - sequential id assignment (per user, starting at 1)
 *   - dedup of near-duplicate events (see DEDUP_* constants below)
 */

import type {
	ActivityData,
	ActivityEvent,
	ActivityRepository,
	NewActivityEvent
} from '$lib/domain/user/activity.js';
import { createActivityData } from '$lib/domain/user/activity.js';
import { getDatabase } from './db.js';
import { PERSISTENCE } from '$lib/config/back-settings.js';

/** Skip a new event when the same `targetId` appears in the last N events. */
const DEDUP_RECENT_COUNT = PERSISTENCE.activityDedupRecentCount;
/** Skip a new event when a same-`targetId` event happened within this window. */
const DEDUP_TIME_WINDOW_MS = PERSISTENCE.activityDedupTimeWindowMs;

/** Returns true when the candidate event should be suppressed by dedup. */
function isDuplicate(events: readonly ActivityEvent[], candidate: NewActivityEvent): boolean {
	if (events.length === 0) return false;

	// Rule 1: same targetId in the last N events.
	const start = Math.max(0, events.length - DEDUP_RECENT_COUNT);
	for (let i = events.length - 1; i >= start; i--) {
		if (events[i].targetId === candidate.targetId) return true;
	}

	// Rule 2: same targetId within the last DEDUP_TIME_WINDOW_MS.
	const cutoff = candidate.createdAt.getTime() - DEDUP_TIME_WINDOW_MS;
	for (let i = events.length - 1; i >= 0; i--) {
		const e = events[i];
		if (e.createdAt.getTime() < cutoff) break;
		if (e.targetId === candidate.targetId) return true;
	}

	return false;
}

export function createActivityStore(): ActivityRepository {
	return {
		async getByUserId(userId: string): Promise<ActivityData | null> {
			const db = await getDatabase();
			return db.activityData.getById<ActivityData>(userId);
		},

		async appendEvent(userId: string, event: NewActivityEvent): Promise<number | null> {
			const db = await getDatabase();
			const existing = await db.activityData.getById<ActivityData>(userId);
			const row: ActivityData = existing ?? createActivityData(userId);

			if (isDuplicate(row.events, event)) return null;

			const id = row.nextId;
			row.events.push({ ...event, id });
			row.nextId = id + 1;
			await db.activityData.put(row);
			return id;
		},

		async deleteByUserId(userId: string): Promise<void> {
			const db = await getDatabase();
			await db.activityData.delete(userId);
		}
	};
}
