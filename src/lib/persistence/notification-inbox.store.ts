/**
 * Notification inbox persistence.
 *
 * Each entry is keyed by `_pk = ${userId}|${id}` and indexed by
 * `userId` so listing a user's inbox is O(matching rows). The hard
 * cap (`NOTIFICATIONS.inboxHardCap`) is enforced on every append by
 * deleting the oldest excess rows after insertion.
 */

import type { InboxEntry } from '$lib/domain/notifications/inbox.js';
import { inboxPk } from '$lib/domain/notifications/inbox.js';
import { NOTIFICATIONS } from '$lib/config/back-settings.js';
import { getStorageBackend } from './db.js';

export async function appendInboxEntries(
	userId: string,
	entries: Omit<InboxEntry, '_pk' | 'userId'>[]
): Promise<void> {
	if (entries.length === 0) return;
	const db = await getStorageBackend();
	for (const e of entries) {
		const stored: InboxEntry = { ...e, userId, _pk: inboxPk(userId, e.id) };
		await db.notificationInbox.put(stored);
	}
	await pruneInbox(userId);
}

/** List inbox entries for a user, newest first. Optional limit. */
export async function listInboxForUser(userId: string, limit?: number): Promise<InboxEntry[]> {
	const db = await getStorageBackend();
	const rows = await db.notificationInbox.query<InboxEntry>('byUser', userId);
	rows.sort((a, b) => b.createdAt - a.createdAt);
	return limit != null ? rows.slice(0, limit) : rows;
}

/** Mark a single inbox entry as read. */
export async function markInboxEntryRead(userId: string, id: string): Promise<void> {
	const db = await getStorageBackend();
	const key = inboxPk(userId, id);
	const existing = await db.notificationInbox.getById<InboxEntry>(key);
	if (!existing || existing.read) return;
	existing.read = true;
	await db.notificationInbox.put(existing);
}

/** Mark every inbox entry for the user as read. */
export async function markAllInboxRead(userId: string): Promise<void> {
	const db = await getStorageBackend();
	const rows = await db.notificationInbox.query<InboxEntry>('byUser', userId);
	for (const r of rows) {
		if (r.read) continue;
		r.read = true;
		await db.notificationInbox.put(r);
	}
}

/** Count unread inbox entries for the user. */
export async function countUnreadForUser(userId: string): Promise<number> {
	const db = await getStorageBackend();
	const rows = await db.notificationInbox.query<InboxEntry>('byUser', userId);
	let n = 0;
	for (const r of rows) if (!r.read) n++;
	return n;
}

/** Drop oldest entries beyond `NOTIFICATIONS.inboxHardCap`. */
async function pruneInbox(userId: string): Promise<void> {
	const db = await getStorageBackend();
	const rows = await db.notificationInbox.query<InboxEntry>('byUser', userId);
	if (rows.length <= NOTIFICATIONS.inboxHardCap) return;
	rows.sort((a, b) => b.createdAt - a.createdAt);
	for (const r of rows.slice(NOTIFICATIONS.inboxHardCap)) {
		await db.notificationInbox.delete(r._pk);
	}
}

/** Delete the entire inbox for a user (used on hard delete). */
export async function deleteInboxForUser(userId: string): Promise<void> {
	const db = await getStorageBackend();
	const rows = await db.notificationInbox.query<InboxEntry>('byUser', userId);
	for (const r of rows) await db.notificationInbox.delete(r._pk);
}
