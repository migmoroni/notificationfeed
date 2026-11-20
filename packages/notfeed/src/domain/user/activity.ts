/**
 * Activity — user activity data (core).
 *
 * Append-only log of semantic "open" events recorded when the user opens an
 * entity in the application (library tab, feed macro, node detail, creator
 * page). There is NO interpretation, scoring, or aggregation in this layer;
 * only the raw event list, a per-user incrementing id counter, and a
 * metadata envelope.
 *
 * Stored in its own IndexedDB object store (`activityData`), keyed by
 * `userId`, so user records stay lean. All writes go through
 * `activityService` (single write-point).
 */

/** Verb. Only "open" is recorded in this phase; union stays open for future. */
export type ActivityEventType = 'open';

/** Kind of entity the event refers to. */
export type ActivityTargetType = 'node' | 'page' | 'librarytab' | 'feedmacro';

/** Surface (route/area) where the event was produced. */
export type ActivityContext = 'library' | 'browse' | 'feed' | 'preview' | 'pages';

export interface ActivityEvent {
	/** Per-user sequential id, starting at 1. Assigned by the repository. */
	id: number;
	type: ActivityEventType;
	targetType: ActivityTargetType;
	targetId: string;
	context?: ActivityContext;
	createdAt: Date;
}

/** Payload accepted by the repository — id is assigned on append. */
export type NewActivityEvent = Omit<ActivityEvent, 'id'>;

export interface ActivityData {
	/** Owning user — also the IndexedDB key. */
	userId: string;
	/** Next sequential id to assign. Starts at 1. */
	nextId: number;
	events: ActivityEvent[];
	metadata: {
		schemaVersion: 1;
		createdAt: Date;
	};
}

/** Factory used by the activity repository when seeding a new per-user row. */
export function createActivityData(userId: string): ActivityData {
	return {
		userId,
		nextId: 1,
		events: [],
		metadata: {
			schemaVersion: 1,
			createdAt: new Date()
		}
	};
}

export interface ActivityRepository {
	getByUserId(userId: string): Promise<ActivityData | null>;
	/**
	 * Append an event, auto-creating the row if none exists yet.
	 * Applies built-in dedup (see `activity.service`): events that match the
	 * recent-history rules are silently dropped. Returns the assigned id, or
	 * `null` when the event was suppressed by dedup.
	 */
	appendEvent(userId: string, event: NewActivityEvent): Promise<number | null>;
	/** Delete the activity log for a user (used when a user is hard-deleted). */
	deleteByUserId(userId: string): Promise<void>;
}


