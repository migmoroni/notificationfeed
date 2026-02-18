/**
 * CategoryAssignment — links an entity to categories within a specific tree.
 *
 * A Profile can hold multiple assignments (one per tree).
 * Each assignment allows up to 3 categories from the same tree.
 *
 * Validation rules:
 * - All categoryIds must belong to the declared treeId
 * - No duplicate categoryIds within the same treeId
 * - Maximum 3 categoryIds per treeId
 * - Categories must be sublevels (depth >= 1)
 */

import type { Category, CategoryTreeId } from '$lib/domain/category/category.js';

export interface CategoryAssignment {
	treeId: CategoryTreeId;
	categoryIds: string[];
}

export const MAX_CATEGORIES_PER_TREE = 3;

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
		// Max 3 per tree
		if (assignment.categoryIds.length > MAX_CATEGORIES_PER_TREE) {
			errors.push({
				treeId: assignment.treeId,
				message: `Maximum ${MAX_CATEGORIES_PER_TREE} categories per tree (got ${assignment.categoryIds.length})`
			});
		}

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
