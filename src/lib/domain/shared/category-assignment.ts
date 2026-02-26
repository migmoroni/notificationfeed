/**
 * CategoryAssignment — links an entity to categories within a specific tree.
 *
 * A Profile can hold multiple assignments (one per tree).
 * The suggested amount is 3 categories per tree, but more can be assigned.
 *
 * Validation rules:
 * - All categoryIds must belong to the declared treeId
 * - No duplicate categoryIds within the same treeId
 * - Categories must be sublevels (depth >= 1)
 */

import type { Category, CategoryTreeId } from '$lib/domain/category/category.js';

export interface CategoryAssignment {
	treeId: CategoryTreeId;
	categoryIds: string[];
}

/** Suggested (not enforced) number of categories per tree. */
export const SUGGESTED_CATEGORIES_PER_TREE = 3;

export interface AssignmentValidationError {
	treeId: CategoryTreeId;
	message: string;
}

/**
 * Validates that all category assignments are internally consistent.
 * Returns an empty array if valid; otherwise returns a list of errors.
 */
export function validateAssignments(
	assignments: CategoryAssignment[],
	allCategories: Category[]
): AssignmentValidationError[] {
	const errors: AssignmentValidationError[] = [];
	const categoryMap = new Map(allCategories.map((c) => [c.id, c]));

	for (const assignment of assignments) {
		// No duplicates
		const unique = new Set(assignment.categoryIds);
		if (unique.size !== assignment.categoryIds.length) {
			errors.push({
				treeId: assignment.treeId,
				message: 'Duplicate category IDs within the same tree'
			});
		}

		// Each ID must exist, belong to the declared tree, and be a sublevel
		for (const catId of assignment.categoryIds) {
			const cat = categoryMap.get(catId);
			if (!cat) {
				errors.push({
					treeId: assignment.treeId,
					message: `Category not found: ${catId}`
				});
				continue;
			}
			if (cat.treeId !== assignment.treeId) {
				errors.push({
					treeId: assignment.treeId,
					message: `Category "${cat.label}" (${catId}) belongs to tree "${cat.treeId}", not "${assignment.treeId}"`
				});
			}
			if (cat.depth < 1) {
				errors.push({
					treeId: assignment.treeId,
					message: `Category "${cat.label}" (${catId}) is a root — only sublevels (depth >= 1) can be assigned`
				});
			}
		}
	}

	return errors;
}
