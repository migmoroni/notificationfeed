/**
 * Post store — persistence for canonical posts.
 *
 * Posts are not domain entities; they are ingested, normalized, and stored here.
 */

import type { CanonicalPost } from '$lib/normalization/canonical-post.js';
import { getDatabase } from './db.js';

export interface PostQuery {
	fontId?: string;
	limit?: number;
	beforeDate?: Date;
}

export async function savePosts(posts: CanonicalPost[]): Promise<void> {
	const db = await getDatabase();
	for (const post of posts) {
		await db.posts.put(post);
	}
}

export async function getPosts(query?: PostQuery): Promise<CanonicalPost[]> {
	const db = await getDatabase();

	let posts: CanonicalPost[];

	if (query?.fontId) {
		posts = await db.posts.query<CanonicalPost>('fontId', query.fontId);
	} else {
		posts = await db.posts.getAll<CanonicalPost>();
	}

	// Sort by publishedAt descending
	posts.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());

	if (query?.beforeDate) {
		posts = posts.filter((p) => new Date(p.publishedAt) < query.beforeDate!);
	}

	if (query?.limit) {
		posts = posts.slice(0, query.limit);
	}

	return posts;
}

export async function markAsRead(postId: string): Promise<void> {
	const db = await getDatabase();
	const post = await db.posts.getById<CanonicalPost>(postId);
	if (post) {
		await db.posts.put({ ...post, read: true });
	}
}

export async function deletePostsByFontId(fontId: string): Promise<void> {
	const db = await getDatabase();
	const posts = await db.posts.query<CanonicalPost>('fontId', fontId);
	for (const post of posts) {
		await db.posts.delete(post.id);
	}
}
