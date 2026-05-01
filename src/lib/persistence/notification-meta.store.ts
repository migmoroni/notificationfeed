/**
 * Notification metadata persistence — per-step `lastFiredAt` and the
 * user's `lastClearedAt` for the inbox unread badge.
 *
 * Auto-creates an empty record on first read.
 */

import type { NotificationMeta } from '$lib/domain/notifications/meta.js';
import { createNotificationMeta } from '$lib/domain/notifications/meta.js';
import { getStorageBackend } from './db.js';

export async function getNotificationMeta(userId: string): Promise<NotificationMeta> {
	const db = await getStorageBackend();
	const existing = await db.notificationMeta.getById<NotificationMeta>(userId);
	if (existing) return existing;
	const fresh = createNotificationMeta(userId);
	await db.notificationMeta.put(fresh);
	return fresh;
}

export async function putNotificationMeta(meta: NotificationMeta): Promise<void> {
	const db = await getStorageBackend();
	await db.notificationMeta.put({ ...meta, updatedAt: Date.now() });
}

/** Stamp `stepLastFiredAt[stepId] = at` (creating the record if missing). */
export async function recordStepFired(
	userId: string,
	stepId: string,
	at: number = Date.now()
): Promise<void> {
	const meta = await getNotificationMeta(userId);
	meta.stepLastFiredAt = { ...meta.stepLastFiredAt, [stepId]: at };
	await putNotificationMeta(meta);
}

/** Stamp `lastClearedAt = at`, used by the bell's "mark all as read". */
export async function recordCleared(userId: string, at: number = Date.now()): Promise<void> {
	const meta = await getNotificationMeta(userId);
	meta.lastClearedAt = at;
	await putNotificationMeta(meta);
}
