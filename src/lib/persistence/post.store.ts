/**
 * Post store — per-user post boxes (Plano B, schema v12).
 *
 * Each post is stored as a single record keyed by the synthetic field
 * `_pk = ${userId}|${nodeId}|${id}`. We also maintain `_userNode` so the
 * `byUserNode` index can answer "all posts in this box for this source"
 * cheaply. Other filters (saved/trashed) currently run in memory after
 * loading by user — fine for MVP, mechanical to translate to SQL later.
 *
 * Public API is fully per-user. There is no global "save all posts" verb;
 * the PostManager calls `savePostsForUser(userId, ...)` once per user that
 * has activated a given source.
 */

import type { CanonicalPost } from '$lib/normalization/canonical-post.js';
import { getStorageBackend } from './db.js';

/** Post record shape on disk (same as CanonicalPost plus synthetic keys). */
interface StoredPost extends CanonicalPost {
	_pk: string;
	_userNode: string;
}

/** Post payload as produced by normalizers (no userId, no synthetic keys). */
export type IngestedPost = Omit<
	CanonicalPost,
	'userId' | 'savedAt' | 'trashedAt' | 'read' | 'notifiedAt'
> & {
	read?: boolean;
	savedAt?: number | null;
	trashedAt?: number | null;
};

export interface PostQuery {
	nodeIds?: string[];
	includeTrashed?: boolean;
	savedOnly?: boolean;
	limit?: number;
	beforePublishedAt?: number;
}

/**
 * Build the synthetic primary key for a post record.
 * The `|` separator is safe because none of the components contain it
 * (userId / nodeId are UUID-like; post id is feed-supplied but cleaned
 * upstream).
 */
function pk(userId: string, nodeId: string, id: string): string {
	return `${userId}|${nodeId}|${id}`;
}

/** Compound key for the `byUserNode` index (one box of one user). */
function userNodeKey(userId: string, nodeId: string): string {
	return `${userId}|${nodeId}`;
}

/** Decorate a CanonicalPost with the synthetic keys used on disk. */
function toStored(post: CanonicalPost): StoredPost {
	return {
		...post,
		_pk: pk(post.userId, post.nodeId, post.id),
		_userNode: userNodeKey(post.userId, post.nodeId)
	};
}

/** Strip the on-disk synthetic keys, returning a plain CanonicalPost. */
function fromStored(record: StoredPost): CanonicalPost {
	const { _pk: _a, _userNode: _b, ...post } = record;
	void _a;
	void _b;
	return post;
}

/**
 * Upsert a batch of posts into a user's box.
 *
 * For each incoming post, if a record already exists at
 * `(userId, nodeId, id)`, the existing `read`, `savedAt`, `trashedAt`,
 * and `ingestedAt` are preserved (the user has already interacted with
 * it). The textual content fields (title/content/url/author) are
 * refreshed from the new payload.
 */
export async function savePostsForUser(
	userId: string,
	posts: IngestedPost[]
): Promise<{ inserted: number; updated: number }> {
	if (posts.length === 0) return { inserted: 0, updated: 0 };
	const db = await getStorageBackend();

	let inserted = 0;
	let updated = 0;

	// Cross-protocol dedup: when the same logical post is delivered via
	// two protocols of the same multi-protocol font, ids differ but URLs
	// usually match. Cache (userId, nodeId) → Set<normalizedUrl> of items
	// already in the DB so we can skip soft-duplicate inserts.
	const dedupCache = new Map<string, Set<string>>();
	async function getUrlSet(nodeId: string): Promise<Set<string>> {
		const cacheKey = userNodeKey(userId, nodeId);
		let set = dedupCache.get(cacheKey);
		if (set) return set;
		const records = await db.posts.query<StoredPost>('byUserNode', cacheKey);
		set = new Set();
		for (const r of records) {
			const norm = normalizeUrl(r.url);
			if (norm) set.add(norm);
		}
		dedupCache.set(cacheKey, set);
		return set;
	}

	for (const incoming of posts) {
		const key = pk(userId, incoming.nodeId, incoming.id);
		const existing = await db.posts.getById<StoredPost>(key);

		if (existing) {
			const merged: CanonicalPost = {
				...existing,
				userId: existing.userId,
				nodeId: existing.nodeId,
				id: existing.id,
				protocol: incoming.protocol,
				title: incoming.title,
				content: incoming.content,
				url: incoming.url,
				author: incoming.author,
				imageUrl: incoming.imageUrl,
				publishedAt: incoming.publishedAt,
				ingestedAt: existing.ingestedAt,
				read: existing.read,
				savedAt: existing.savedAt,
				trashedAt: existing.trashedAt,
				notifiedAt: existing.notifiedAt ?? null
			};
			await db.posts.put(toStored(merged));
			updated++;
		} else {
			// Cross-protocol dedup check: skip insert if a post with the same
			// normalized URL already exists in this user's box for this font.
			const norm = normalizeUrl(incoming.url);
			if (norm) {
				const urlSet = await getUrlSet(incoming.nodeId);
				if (urlSet.has(norm)) {
					continue;
				}
				urlSet.add(norm);
			}
			const fresh: CanonicalPost = {
				userId,
				nodeId: incoming.nodeId,
				id: incoming.id,
				protocol: incoming.protocol,
				title: incoming.title,
				content: incoming.content,
				url: incoming.url,
				author: incoming.author,
				imageUrl: incoming.imageUrl,
				publishedAt: incoming.publishedAt,
				ingestedAt: incoming.ingestedAt,
				read: incoming.read ?? false,
				savedAt: incoming.savedAt ?? null,
				trashedAt: incoming.trashedAt ?? null,
				notifiedAt: null
			};
			await db.posts.put(toStored(fresh));
			inserted++;
		}
	}

	return { inserted, updated };
}

/**
 * Normalize a post URL for cross-protocol duplicate detection. Lowercase
 * scheme/host and strip a single trailing slash from the path. Returns
 * empty string when the input is not parseable.
 */
function normalizeUrl(url: string): string {
	if (!url) return '';
	try {
		const u = new URL(url);
		const protocol = u.protocol.toLowerCase();
		const host = u.host.toLowerCase();
		let path = u.pathname;
		if (path.length > 1 && path.endsWith('/')) path = path.slice(0, -1);
		return `${protocol}//${host}${path}${u.search}`;
	} catch {
		return url.trim().toLowerCase();
	}
}

/**
 * Read posts from a user's box.
 *
 * Defaults: trashed posts are excluded; result is sorted by publishedAt desc.
 */
export async function getPostsForUser(
	userId: string,
	query: PostQuery = {}
): Promise<CanonicalPost[]> {
	const db = await getStorageBackend();

	let records: StoredPost[];

	if (query.nodeIds && query.nodeIds.length === 1) {
		// Fast path: single node → use byUserNode index directly.
		records = await db.posts.query<StoredPost>('byUserNode', userNodeKey(userId, query.nodeIds[0]));
	} else {
		records = await db.posts.query<StoredPost>('byUser', userId);
		if (query.nodeIds && query.nodeIds.length > 0) {
			const allow = new Set(query.nodeIds);
			records = records.filter((r) => allow.has(r.nodeId));
		}
	}

	let posts = records.map(fromStored);

	if (query.savedOnly) {
		posts = posts.filter((p) => p.savedAt != null);
	}
	if (!query.includeTrashed && !query.savedOnly) {
		posts = posts.filter((p) => p.trashedAt == null);
	}
	if (query.beforePublishedAt != null) {
		const cutoff = query.beforePublishedAt;
		posts = posts.filter((p) => p.publishedAt < cutoff);
	}

	posts.sort((a, b) => b.publishedAt - a.publishedAt);

	if (query.limit != null) posts = posts.slice(0, query.limit);
	return posts;
}

/**
 * Flip the `read` flag on a single post. No-op when the post does not
 * exist or is already in the desired state (saves a write). Read state
 * is strictly per-user — marking on one user's box does not affect
 * any other user's copy of the same source post.
 */
export async function markRead(
	userId: string,
	nodeId: string,
	postId: string,
	value = true
): Promise<void> {
	const db = await getStorageBackend();
	const key = pk(userId, nodeId, postId);
	const existing = await db.posts.getById<StoredPost>(key);
	if (!existing) return;
	if (existing.read === value) return;
	existing.read = value;
	await db.posts.put(existing);
}

/**
 * Toggle saved state. Saving also clears `trashedAt` (saved posts never
 * stay in trash). Unsaving leaves trash state untouched.
 */
export async function setSaved(
	userId: string,
	nodeId: string,
	postId: string,
	value: boolean
): Promise<void> {
	const db = await getStorageBackend();
	const key = pk(userId, nodeId, postId);
	const existing = await db.posts.getById<StoredPost>(key);
	if (!existing) return;
	if (value) {
		existing.savedAt = Date.now();
		existing.trashedAt = null;
	} else {
		existing.savedAt = null;
	}
	await db.posts.put(existing);
}

/**
 * Move to / restore from trash. Saved posts cannot be trashed (no-op).
 */
export async function setTrashed(
	userId: string,
	nodeId: string,
	postId: string,
	value: boolean
): Promise<void> {
	const db = await getStorageBackend();
	const key = pk(userId, nodeId, postId);
	const existing = await db.posts.getById<StoredPost>(key);
	if (!existing) return;
	if (value && existing.savedAt != null) return; // saved overrides trash
	existing.trashedAt = value ? Date.now() : null;
	await db.posts.put(existing);
}

/**
 * Bulk-trash posts in a user's box where `ingestedAt < cutoff` and the
 * post is not saved and not already trashed. Returns the count touched.
 *
 * Retention is based on when Notfeed first saw the post, not when the
 * publisher originally dated it. This keeps legitimate archive feeds
 * (for example JSON Feed specs or old blog imports) visible after a
 * fresh activation instead of trashing them immediately.
 */
export async function trashOldPostsForUser(
	userId: string,
	nodeIds: string[],
	cutoffIngestedAt: number,
	now: number = Date.now()
): Promise<number> {
	if (nodeIds.length === 0) return 0;
	const db = await getStorageBackend();
	const records = await db.posts.query<StoredPost>('byUser', userId);
	const allow = new Set(nodeIds);
	let count = 0;
	for (const r of records) {
		if (!allow.has(r.nodeId)) continue;
		if (r.savedAt != null) continue;
		if (r.trashedAt != null) continue;
		if (r.ingestedAt >= cutoffIngestedAt) continue;
		r.trashedAt = now;
		await db.posts.put(r);
		count++;
	}
	return count;
}

/** Physically delete trashed posts older than the cutoff. */
export async function purgeTrashedBefore(
	userId: string,
	cutoffTrashedAt: number
): Promise<number> {
	const db = await getStorageBackend();
	const records = await db.posts.query<StoredPost>('byUser', userId);
	let count = 0;
	for (const r of records) {
		if (r.trashedAt == null) continue;
		if (r.trashedAt >= cutoffTrashedAt) continue;
		await db.posts.delete(r._pk);
		count++;
	}
	return count;
}

/** Delete every post a user owns for a given source (used when deactivating). */
export async function deletePostsForUserNode(userId: string, nodeId: string): Promise<void> {
	const db = await getStorageBackend();
	const records = await db.posts.query<StoredPost>('byUserNode', userNodeKey(userId, nodeId));
	for (const r of records) {
		await db.posts.delete(r._pk);
	}
}

/**
 * Return the user's posts that the notification engine has not yet
 * processed (i.e. `notifiedAt == null`). Trashed posts are excluded
 * — once a post is in trash there's no point notifying about it.
 */
export async function listUnnotifiedForUser(userId: string): Promise<CanonicalPost[]> {
	const db = await getStorageBackend();
	const records = await db.posts.query<StoredPost>('byUser', userId);
	return records
		.filter((r) => r.notifiedAt == null && r.trashedAt == null)
		.map(fromStored)
		.sort((a, b) => b.publishedAt - a.publishedAt);
}

/**
 * Stamp `notifiedAt` on a batch of posts. The engine calls this once
 * a step has produced its inbox entry / OS notification, so the same
 * posts never trigger another notification on subsequent ticks.
 */
export async function markPostsNotified(
	userId: string,
	postKeys: { nodeId: string; postId: string }[],
	at: number = Date.now()
): Promise<number> {
	if (postKeys.length === 0) return 0;
	const db = await getStorageBackend();
	let count = 0;
	for (const k of postKeys) {
		const key = pk(userId, k.nodeId, k.postId);
		const existing = await db.posts.getById<StoredPost>(key);
		if (!existing) continue;
		if (existing.notifiedAt != null) continue;
		existing.notifiedAt = at;
		await db.posts.put(existing);
		count++;
	}
	return count;
}

/**
 * Backfill a user's box with posts that already exist in *other* users'
 * boxes for the same source. Called when a user newly activates a font
 * so they immediately see historical content without waiting for the
 * next ingestion tick.
 *
 * Per-user state (`read`, `savedAt`, `trashedAt`) is reset for the new
 * user; canonical content (title/url/publishedAt/...) is copied from
 * whichever sibling record has the latest `ingestedAt`.
 */
export async function backfillPostsForUserNode(
	userId: string,
	nodeId: string
): Promise<{ inserted: number }> {
	const db = await getStorageBackend();
	const all = await db.posts.getAll<StoredPost>();

	// Pick the freshest sibling record per post id, ignoring records
	// already owned by this user (those are the target box).
	const bestById = new Map<string, StoredPost>();
	for (const r of all) {
		if (r.nodeId !== nodeId) continue;
		if (r.userId === userId) continue;
		const prev = bestById.get(r.id);
		if (!prev || r.ingestedAt > prev.ingestedAt) bestById.set(r.id, r);
	}

	if (bestById.size === 0) return { inserted: 0 };

	const now = Date.now();
	let inserted = 0;
	for (const src of bestById.values()) {
		const key = pk(userId, nodeId, src.id);
		const exists = await db.posts.getById<StoredPost>(key);
		if (exists) continue;
		const fresh: CanonicalPost = {
			userId,
			nodeId,
			id: src.id,
			protocol: src.protocol,
			title: src.title,
			content: src.content,
			url: src.url,
			author: src.author,
			publishedAt: src.publishedAt,
			ingestedAt: now,
			read: false,
			savedAt: null,
			trashedAt: null,
			// Backfilled posts are pre-seen by the pipeline — they
			// existed before this user activated the source, so we
			// should not generate notifications for them.
			notifiedAt: now
		};
		await db.posts.put(toStored(fresh));
		inserted++;
	}
	return { inserted };
}
