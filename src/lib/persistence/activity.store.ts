/**
 * Activity store — persistence for per-user activity logs.
 *
 * Rows live in a dedicated `activityData` object store keyed by `userId`, so
 * the user record stays lean as the event list grows. All writes should go
 * through `activityService` (single write-point).
 */

import type {
	ActivityData,
	ActivityEvent,
	ActivityRepository
} from '$lib/domain/user/activity.js';
import { createActivityData } from '$lib/domain/user/activity.js';
import { getDatabase } from './db.js';

export function createActivityStore(): ActivityRepository {
	return {
		async getByUserId(userId: string): Promise<ActivityData | null> {
			const db = await getDatabase();
			return db.activityData.getById<ActivityData>(userId);
		},

		async appendEvent(userId: string, event: ActivityEvent): Promise<void> {
			const db = await getDatabase();
			const existing = await db.activityData.getById<ActivityData>(userId);
			const row: ActivityData = existing ?? createActivityData(userId);
			row.events.push(event);
			await db.activityData.put(row);
		},

		async deleteByUserId(userId: string): Promise<void> {
			const db = await getDatabase();
			await db.activityData.delete(userId);
		}
	};
}
