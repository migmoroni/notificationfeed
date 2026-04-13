/**
 * Category Data — types and resolvers for JSON-based category data files.
 *
 * Data files live in `./data/` as JSON arrays.
 * Root nodes (depth 0) have a plain string label.
 * Leaf nodes (depth >= 1) have a versioned label array.
 *
 * The version suffix only appears in node `categoryAssignments`:
 *   "baaaa3" → category "baaaa", label at index 3.
 *   No suffix → version 0.
 */

import type { SeedCategory } from './category-seed.js';
import type { CategoryTreeId } from './category.js';

/** Root entry — structural grouping, label is a plain string */
export interface CategoryDataRoot {
	id: string;
	label: string;
	parentId: null;
	order: number;
}

/** Leaf entry — assignable category, label is a version array */
export interface CategoryDataLeaf {
	id: string;
	label: string[];
	parentId: string;
	order: number;
}

export type CategoryDataEntry = CategoryDataRoot | CategoryDataLeaf;

export function isLeafEntry(entry: CategoryDataEntry): entry is CategoryDataLeaf {
	return Array.isArray(entry.label);
}

/**
 * Parse a category reference from a node's categoryAssignments.
 * "baaaa3" → { categoryId: "baaaa", version: 3 }
 * "baaaa"  → { categoryId: "baaaa", version: 0 }
 */
export function parseCategoryRef(ref: string): { categoryId: string; version: number } {
	const match = ref.match(/^([a-zA-Z]+)(\d+)?$/);
	if (!match) return { categoryId: ref, version: 0 };
	return {
		categoryId: match[1],
		version: match[2] != null ? Number(match[2]) : 0
	};
}

/**
 * Resolve a versioned category reference to its label string.
 * Given "baaaa3" and the data entries, finds entry "baaaa" and returns label[3].
 */
export function resolveCategoryLabel(ref: string, data: CategoryDataEntry[]): string | null {
	const { categoryId, version } = parseCategoryRef(ref);
	const entry = data.find((e) => e.id === categoryId);
	if (!entry) return null;
	if (isLeafEntry(entry)) {
		return entry.label[version] ?? entry.label[entry.label.length - 1] ?? null;
	}
	return entry.label;
}

/**
 * Convert a data entry into a SeedCategory for DB population.
 * Uses the latest label version for DB seeding.
 */
export function resolveEntry(
	entry: CategoryDataEntry,
	treeId: CategoryTreeId,
	depth: number
): SeedCategory {
	const label = isLeafEntry(entry)
		? entry.label[entry.label.length - 1]
		: entry.label;
	return {
		id: entry.id,
		label,
		treeId,
		parentId: entry.parentId,
		depth,
		order: entry.order
	};
}

/**
 * Derive depth from category ID length and tree structure.
 * - 2 chars → depth 0 (root)
 * - 3 chars → depth 1 (region sub-branch)
 * - 5 chars → depth 1 (2-level trees) or depth 2 (3-level trees like region)
 */
export function deriveDepth(id: string, threeLevel: boolean): number {
	switch (id.length) {
		case 2: return 0;
		case 3: return 1;
		case 5: return threeLevel ? 2 : 1;
		default: return 0;
	}
}
