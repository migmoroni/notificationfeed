/**
 * Retention pass (Plano B / Phase B7).
 *
 * Walks every consumer user and, *strictly within that user's own
 * post box*, applies the user's own retention settings:
 *
 *   1. For fonts the user currently activates:
 *      `trashedAt = now` on posts ingested longer ago than
 *      `trashAgeActiveDays` (unless saved).
 *   2. For fonts the user *no longer activates* but for which residual
 *      posts still live in their box (they deactivated/disabled the font):
 *      `trashedAt = now` on posts ingested longer ago than
 *      `trashAgeOrphanDays` (unless saved).
 *      What other users do with the same font is irrelevant here.
 *   3. Physically deletes posts whose `trashedAt < now - purgeAfterTrashDays`.
 *
 * Designed to be called at most ~once per hour from the PostManager
 * (not on every tick — the full-table scan is expensive).
 */

import type { UserConsumer } from '$lib/domain/user/user-consumer.js';
import { getStorageBackend } from '$lib/persistence/db.js';
import { trashOldPostsForUser, purgeTrashedBefore } from '$lib/persistence/post.store.js';

interface StoredPostShape {
	userId: string;
	nodeId: string;
}

const DAY_MS = 86_400_000;

/**
 * Run the retention pass for every consumer user.
 *
 * The work is strictly per-user — one user's activations or settings
 * never influence the cleanup applied to another user's box. Errors
 * from a single user shouldn't be common (every operation is bounded
 * to that user's records), but if anything throws here the caller
 * (`PostManager.tick`) catches and logs it so a bad pass doesn't
 * poison the next tick.
 *
 * @param now — "current time" in ms since epoch. Exposed so tests
 *  can pin the cutoffs deterministically.
 */
export async function runRetention(now: number = Date.now()): Promise<void> {
	const db = await getStorageBackend();
	const allUsers = await db.users.getAll<UserConsumer>();
	const consumers = allUsers.filter((u) => u.role === 'consumer' && !u.removedAt);

	for (const user of consumers) {
		const settings = user.settingsUser?.ingestion;
		if (!settings) continue;

		const userActiveFonts = new Set(
			user.activateNodes
				.filter((a) => a.enabled !== false)
				.map((a) => a.nodeId)
		);

		// Discover every nodeId that has at least one post in this user's box.
		const userPosts = await db.posts.query<StoredPostShape>('byUser', user.id);
		const userBoxFonts = new Set<string>();
		for (const p of userPosts) userBoxFonts.add(p.nodeId);

		// Orphan-from-this-user's-perspective: font present in box but no
		// longer activated by *this* user (other users' activation status
		// is intentionally ignored — settings impact only their owner).
		const orphanFonts: string[] = [];
		for (const nid of userBoxFonts) {
			if (!userActiveFonts.has(nid)) orphanFonts.push(nid);
		}

		const activeCutoff = now - settings.trashAgeActiveDays * DAY_MS;
		const orphanCutoff = now - settings.trashAgeOrphanDays * DAY_MS;
		const purgeCutoff = now - settings.purgeAfterTrashDays * DAY_MS;

		if (userActiveFonts.size > 0) {
			await trashOldPostsForUser(user.id, [...userActiveFonts], activeCutoff, now);
		}
		if (orphanFonts.length > 0) {
			await trashOldPostsForUser(user.id, orphanFonts, orphanCutoff, now);
		}

		await purgeTrashedBefore(user.id, purgeCutoff);
	}
}
