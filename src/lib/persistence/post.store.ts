/**
 * Post store — persistence for canonical posts using nodeId.
 *
 * Posts are grouped by nodeId (was fontId) into PostContainer records.
 */

import type { CanonicalPost, PostContainer } from '$lib/normalization/canonical-post.js';
import { getDatabase } from './db.js';

export interface PostQuery {
	nodeId?: string;
	limit?: number;
	beforeDate?: Date;
}

export async function savePosts(posts: CanonicalPost[]): Promise<void> {
	const db = await getDatabase();

	const grouped = new Map<string, CanonicalPost[]>();
	for (const post of posts) {
		let arr = grouped.get(post.nodeId);
		if (!arr) {
			arr = [];
			grouped.set(post.nodeId, arr);
		}
		arr.push(post);
	}

	for (const [nodeId, newPosts] of grouped) {
		const container = await db.posts.getById<PostContainer>(nodeId);
		if (container) {
			const existingIds = new Set(container.posts.map((p) => p.id));
			const unique = newPosts.filter((p) => !existingIds.has(p.id));
			if (unique.length > 0) {
				container.posts.push(...unique);
				await db.posts.put(container);
			}
		} else {
			await db.posts.put({ nodeId, posts: newPosts } satisfies PostContainer);
		}
	}
}

export async function getPosts(query?: PostQuery): Promise<CanonicalPost[]> {
	const db = await getDatabase();

	let posts: CanonicalPost[];

	if (query?.nodeId) {
		const container = await db.posts.getById<PostContainer>(query.nodeId);
		posts = container?.posts ?? [];
	} else {
		const containers = await db.posts.getAll<PostContainer>();
		posts = containers.flatMap((c) => c.posts);
	}

	posts.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());

	if (query?.beforeDate) {
		posts = posts.filter((p) => new Date(p.publishedAt) < query.beforeDate!);
	}

	if (query?.limit) {
		posts = posts.slice(0, query.limit);
	}

	return posts;
}

export async function markAsRead(nodeId: string, postId: string): Promise<void> {
	const db = await getDatabase();
	const container = await db.posts.getById<PostContainer>(nodeId);
	if (!container) return;

	const idx = container.posts.findIndex((p) => p.id === postId);
	if (idx >= 0) {
		container.posts[idx].read = true;
		await db.posts.put(container);
	}
}

export async function deletePostsByNodeId(nodeId: string): Promise<void> {
	const db = await getDatabase();
	await db.posts.delete(nodeId);
}
