/**
 * Feed Sorter — sorts posts by priority group using node-based priorities.
 *
 * Algorithm unchanged from v1:
 * 1. Group posts by their node's effective priority (1, 2, 3)
 * 2. Within each group, sort by publishedAt descending (newest first)
 * 3. Concatenate: all priority-1 posts, then priority-2, then priority-3
 *
 * Only change: uses nodeId (was fontId) for priority lookup.
 */

import type { PriorityLevel } from '../user/priority-level.js';

export interface CanonicalPostLike {
	nodeId: string;
	publishedAt: Date;
}

export interface SortedPost<T extends CanonicalPostLike = CanonicalPostLike> {
	post: T;
	priority: PriorityLevel;
}

/**
 * Sort posts by the priority-then-date algorithm.
 *
 * @param posts - All posts to sort
 * @param priorityMap - Map of nodeId → effective priority level
 * @returns Posts sorted: priority 1 first (newest→oldest), then 2, then 3
 */
export function sortByPriority<T extends CanonicalPostLike>(
	posts: T[],
	priorityMap: Map<string, PriorityLevel>
): SortedPost<T>[] {
	const buckets: [SortedPost<T>[], SortedPost<T>[], SortedPost<T>[]] = [[], [], []];

	for (const post of posts) {
		const priority = priorityMap.get(post.nodeId) ?? 3;
		buckets[priority - 1].push({ post, priority });
	}

	const byDateDesc = (a: SortedPost<T>, b: SortedPost<T>) =>
		new Date(b.post.publishedAt).getTime() - new Date(a.post.publishedAt).getTime();

	buckets[0].sort(byDateDesc);
	buckets[1].sort(byDateDesc);
	buckets[2].sort(byDateDesc);

	return [...buckets[0], ...buckets[1], ...buckets[2]];
}
