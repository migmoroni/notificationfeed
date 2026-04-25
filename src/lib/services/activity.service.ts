/**
 * Activity Service — single write-point for user activity events.
 *
 * Records `"open"` events into the active user's activity log, which lives
 * in its own IndexedDB store (`activityData`) keyed by `userId`. No other
 * part of the app is allowed to append to activity data — everything must
 * go through `activityService.record(...)`.
 */

import { activeUser } from '$lib/stores/active-user.svelte.js';
import { createActivityStore } from '$lib/persistence/activity.store.js';
import { uuidv7 } from '$lib/domain/shared/uuidv7.js';
import type {
	ActivityEvent,
	ActivityEventType,
	ActivityTargetType,
	ActivityContext
} from '$lib/domain/user/activity.js';

export interface RecordInput {
	type: ActivityEventType;
	targetType: ActivityTargetType;
	targetId: string;
	context?: ActivityContext;
}

const repo = createActivityStore();

export const activityService = {
	/**
	 * Record an activity event for the currently-active user.
	 * No-op if no user is loaded.
	 */
	async record(input: RecordInput): Promise<void> {
		const userId = activeUser.current?.id;
		if (!userId) return;

		const event: ActivityEvent = {
			id: uuidv7(),
			type: input.type,
			targetType: input.targetType,
			targetId: input.targetId,
			context: input.context,
			createdAt: new Date()
		};

		await repo.appendEvent(userId, event);
	},

	/** Read-only snapshot of events for the active user. */
	async getEvents(): Promise<readonly ActivityEvent[]> {
		const userId = activeUser.current?.id;
		if (!userId) return [];
		const row = await repo.getByUserId(userId);
		return row?.events ?? [];
	}
};
