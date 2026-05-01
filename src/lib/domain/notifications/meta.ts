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
	/** When the user last cleared the inbox unread count. */
	lastClearedAt: number;
	updatedAt: number;
}

export function createNotificationMeta(userId: string): NotificationMeta {
	const now = Date.now();
	return {
		userId,
		stepLastFiredAt: {},
		lastClearedAt: 0,
		updatedAt: now
	};
}
