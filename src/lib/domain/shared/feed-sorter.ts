/**
 * Feed Sorter — sorts posts by priority group, then by publishedAt within each group.
 *
 * Algorithm:
 * 1. Group posts by their Font's effective priority (1, 2, 3)
 * 2. Within each group, sort by publishedAt descending (newest first)
 * 3. Concatenate: all priority-1 posts, then priority-2, then priority-3
 *
 * Example:
 *   Priority 1: Post A (10:05), Post B (09:40)
 *   Priority 2: Post C (10:06)
 *   Result: A (10:05), B (09:40), C (10:06)
 *   → Even though C is more recent, it appears after all priority-1 posts.
 *
 * This is a pure function module — no side effects, no state.
 */

import type { CanonicalPost } from '../../normalization/canonical-post.js';
import type { PriorityLevel } from './consumer-state.js';

export interface SortedPost {
	post: CanonicalPost;
	priority: PriorityLevel;
}

/**
 * Sort posts by the priority-then-date algorithm.
 *
 * @param posts - All canonical posts to sort
 * @param priorityMap - Map of fontId → effective priority level
 * @returns Posts sorted: priority 1 first (newest→oldest), then 2, then 3
 */
export function sortByPriority(
	posts: CanonicalPost[],
	priorityMap: Map<string, PriorityLevel>
): SortedPost[] {
	// Three buckets — index 0 = priority 1, index 1 = priority 2, index 2 = priority 3
	const buckets: [SortedPost[], SortedPost[], SortedPost[]] = [[], [], []];

	for (const post of posts) {
		const priority = priorityMap.get(post.fontId) ?? 3;
		buckets[priority - 1].push({ post, priority });
	}

	// Sort each bucket by publishedAt descending (newest first)
	const byDateDesc = (a: SortedPost, b: SortedPost) =>
		new Date(b.post.publishedAt).getTime() - new Date(a.post.publishedAt).getTime();

	buckets[0].sort(byDateDesc);
	buckets[1].sort(byDateDesc);
	buckets[2].sort(byDateDesc);

	return [...buckets[0], ...buckets[1], ...buckets[2]];
}
