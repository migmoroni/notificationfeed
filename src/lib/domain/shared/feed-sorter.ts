/**
 * Feed Sorter — sorts posts using a per-macro priority map.
 *
 * Priority is no longer a global per-node property. The active FeedMacro
 * supplies a sparse `Record<nodeId, 'high'>` map; nodes absent from the map
 * are treated as `'default'`.
 *
 * Algorithm:
 *   1. `'high'` posts come first, sorted by publishedAt desc.
 *   2. `'default'` posts follow, sorted by publishedAt desc.
 */

import type { PriorityLevel } from '../user/priority-level.js';

export interface CanonicalPostLike {
	nodeId: string;
	publishedAt: number;
}

export interface SortedPost<T extends CanonicalPostLike = CanonicalPostLike> {
	post: T;
	priority: PriorityLevel;
}

/** Empty priority map shared across consumers that have no active macro. */
export const EMPTY_PRIORITY_MAP: Record<string, 'high'> = Object.freeze({});

/**
 * Sort posts: high group first (newest→oldest), then default group (newest→oldest).
 *
 * @param posts - all posts to sort
 * @param priorityByNodeId - sparse map: only `'high'` entries; absence ⇒ default
 */
export function sortByPriority<T extends CanonicalPostLike>(
	posts: T[],
	priorityByNodeId: Record<string, 'high'>
): SortedPost<T>[] {
	const high: SortedPost<T>[] = [];
	const def: SortedPost<T>[] = [];

	for (const post of posts) {
		const isHigh = priorityByNodeId[post.nodeId] === 'high';
		if (isHigh) high.push({ post, priority: 'high' });
		else def.push({ post, priority: 'default' });
	}

	const byDateDesc = (a: SortedPost<T>, b: SortedPost<T>) =>
		b.post.publishedAt - a.post.publishedAt;

	high.sort(byDateDesc);
	def.sort(byDateDesc);

	return [...high, ...def];
}
