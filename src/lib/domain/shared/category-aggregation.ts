/**
 * Category Aggregation — merges category assignments from child entities upward.
 *
 * Categories propagate UPWARD only, never downward:
 *   Font       → only its own assignments
 *   Profile    → own + union of child Font assignments
 *   CreatorPage → own + union of child Profile effective assignments
 *
 * A parent's categories never propagate to its children.
 *
 * Merging is per-tree: categoryIds are unioned within the same treeId.
 * Duplicate categoryIds are deduplicated.
 */

import type { CategoryAssignment } from './category-assignment.js';
import type { CategoryTreeId } from '$lib/domain/category/category.js';

/**
 * Merge multiple lists of CategoryAssignment into one.
 * Within each treeId, categoryIds are unioned and deduplicated.
 */
export function mergeAssignments(...sources: CategoryAssignment[][]): CategoryAssignment[] {
	const byTree = new Map<CategoryTreeId, Set<string>>();

	for (const assignments of sources) {
		for (const a of assignments) {
			const existing = byTree.get(a.treeId);
			if (existing) {
				for (const id of a.categoryIds) existing.add(id);
			} else {
				byTree.set(a.treeId, new Set(a.categoryIds));
			}
		}
	}

	const result: CategoryAssignment[] = [];
	for (const [treeId, ids] of byTree) {
		if (ids.size > 0) {
			result.push({ treeId, categoryIds: [...ids] });
		}
	}
	return result;
}

/**
 * Effective categories for a Profile = own + union of child Font assignments.
 */
export function getEffectiveProfileCategories(
	profileAssignments: CategoryAssignment[],
	fontAssignments: CategoryAssignment[][]
): CategoryAssignment[] {
	return mergeAssignments(profileAssignments, ...fontAssignments);
}

/**
 * Effective categories for a CreatorPage = own + union of child Profile effective assignments.
 */
export function getEffectivePageCategories(
	pageAssignments: CategoryAssignment[],
	profileEffectiveAssignments: CategoryAssignment[][]
): CategoryAssignment[] {
	return mergeAssignments(pageAssignments, ...profileEffectiveAssignments);
}
