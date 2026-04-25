/**
 * Activity Service — single write-point for user activity events.
 *
 * Records events into the active user's activity log, which lives in its own
 * IndexedDB store (`activityData`) keyed by `userId`. No other part of the
 * app is allowed to append to activity data — everything must go through
 * `activityService.record(...)`.
 *
 * Sequential per-user ids and near-duplicate suppression are handled by the
 * underlying `activityRepository`.
 */

import { activeUser } from '$lib/stores/active-user.svelte.js';
import { activitySettings } from '$lib/stores/activity-settings.svelte.js';
import { createActivityStore } from '$lib/persistence/activity.store.js';
import type {
	ActivityEvent,
	ActivityEventType,
	ActivityTargetType,
	ActivityContext,
	NewActivityEvent
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
	 * Returns the assigned id, or `null` when the event was suppressed by
	 * dedup. No-op (returns `null`) when no user is loaded.
	 */
	async record(input: RecordInput): Promise<number | null> {
		if (!activitySettings.enabled) return null;

		const userId = activeUser.current?.id;
		if (!userId) return null;

		const event: NewActivityEvent = {
			type: input.type,
			targetType: input.targetType,
			targetId: input.targetId,
			context: input.context,
			createdAt: new Date()
		};

		return repo.appendEvent(userId, event);
	},

	/** Read-only snapshot of events for the active user. */
	async getEvents(): Promise<readonly ActivityEvent[]> {
		const userId = activeUser.current?.id;
		if (!userId) return [];
		const row = await repo.getByUserId(userId);
		return row?.events ?? [];
	}
};
