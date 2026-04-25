/**
 * Activity — user activity data (core).
 *
 * Append-only log of semantic "open" events recorded when the user opens an
 * entity in the application (library tab, feed macro, node detail, creator
 * page). There is NO interpretation, scoring, or aggregation in this layer;
 * only the raw event list and a metadata envelope.
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
	/** UUIDv7 — time-ordered, lexicographically sortable. */
	id: string;
	type: ActivityEventType;
	targetType: ActivityTargetType;
	targetId: string;
	context?: ActivityContext;
	createdAt: Date;
}

export interface ActivityData {
	/** Owning user — also the IndexedDB key. */
	userId: string;
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
		events: [],
		metadata: {
			schemaVersion: 1,
			createdAt: new Date()
		}
	};
}

export interface ActivityRepository {
	getByUserId(userId: string): Promise<ActivityData | null>;
	/** Append an event, auto-creating the row if none exists yet. */
	appendEvent(userId: string, event: ActivityEvent): Promise<void>;
	/** Delete the activity log for a user (used when a user is hard-deleted). */
	deleteByUserId(userId: string): Promise<void>;
}

