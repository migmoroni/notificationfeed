/**
 * Post store — persistence for canonical posts.
 *
 * Posts are grouped by fontId into PostContainer records (one IndexedDB
 * record per font) for efficient bulk lookup.
 */

import type { CanonicalPost, PostContainer } from '$lib/normalization/canonical-post.js';
import { getDatabase } from './db.js';

export interface PostQuery {
	fontId?: string;
	limit?: number;
	beforeDate?: Date;
}

export async function savePosts(posts: CanonicalPost[]): Promise<void> {
	const db = await getDatabase();

	// Group incoming posts by fontId
	const grouped = new Map<string, CanonicalPost[]>();
	for (const post of posts) {
		let arr = grouped.get(post.fontId);
		if (!arr) {
			arr = [];
			grouped.set(post.fontId, arr);
		}
		arr.push(post);
	}

	// Merge into existing containers
	for (const [fontId, newPosts] of grouped) {
		const container = await db.posts.getById<PostContainer>(fontId);
		if (container) {
			const existingIds = new Set(container.posts.map((p) => p.id));
			const unique = newPosts.filter((p) => !existingIds.has(p.id));
			if (unique.length > 0) {
				container.posts.push(...unique);
				await db.posts.put(container);
			}
		} else {
			await db.posts.put({ fontId, posts: newPosts } satisfies PostContainer);
		}
	}
}

export async function getPosts(query?: PostQuery): Promise<CanonicalPost[]> {
	const db = await getDatabase();

	let posts: CanonicalPost[];

	if (query?.fontId) {
		const container = await db.posts.getById<PostContainer>(query.fontId);
		posts = container?.posts ?? [];
	} else {
		const containers = await db.posts.getAll<PostContainer>();
		posts = containers.flatMap((c) => c.posts);
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

export async function markAsRead(fontId: string, postId: string): Promise<void> {
	const db = await getDatabase();
	const container = await db.posts.getById<PostContainer>(fontId);
	if (!container) return;

	const idx = container.posts.findIndex((p) => p.id === postId);
	if (idx >= 0) {
		container.posts[idx] = { ...container.posts[idx], read: true };
		await db.posts.put(container);
	}
}

export async function deletePostsByFontId(fontId: string): Promise<void> {
	const db = await getDatabase();
	await db.posts.delete(fontId);
}
