/**
 * Notification metadata — per-user runtime state for the engine.
 *
 * Tracks, per pipeline step, when the engine last fired a notification.
 * Used by batch steps to honor `intervalMs`. `lastClearedAt` records
 * when the user last "marked all as read" so the bell badge can
 * compute its unread count without reading every inbox entry.
 */

export interface NotificationMeta {
	userId: string;
	/** Per-step `lastFiredAt` (epoch ms). Missing key = never fired. */
	stepLastFiredAt: Record<string, number>;
	/**
	 * Set of `nodeId`s that have already had at least one
	 * `batch_global` notification delivered for them. Used by the
	 * engine to bypass the configured cooldown for the very first
	 * batch coming from a freshly activated font, so each new source
	 * gets its initial "you started getting posts" ping even when
	 * several activations land back-to-back.
	 *
	 * Stored as an array (Sets don't survive structured-clone in
	 * IndexedDB cleanly) and treated as a set in code.
	 */
	batchGlobalEverNotifiedNodeIds: string[];
	/** When the user last cleared the inbox unread count. */
	lastClearedAt: number;
	updatedAt: number;
}

export function createNotificationMeta(userId: string): NotificationMeta {
	const now = Date.now();
	return {
		userId,
		stepLastFiredAt: {},
		batchGlobalEverNotifiedNodeIds: [],
		lastClearedAt: 0,
		updatedAt: now
	};
}
