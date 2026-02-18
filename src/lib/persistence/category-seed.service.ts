/**
 * Category Seed Service — populates/migrates the official taxonomy on app boot.
 *
 * Compares the persisted seed version (localStorage) with CATEGORY_SEED_VERSION.
 * If stale or missing, applies the seed:
 * - New categories are inserted with isActive = true
 * - Removed categories are marked isActive = false (preserves existing assignments)
 * - Existing categories have their metadata updated (label, order, parentId, depth)
 *
 * This service should run once on boot, before consumer.init().
 */

import type { Category } from '$lib/domain/category/category.js';
import { CATEGORY_SEED, CATEGORY_SEED_VERSION } from '$lib/domain/category/category-seed.js';
import { getDatabase } from './db.js';

const VERSION_KEY = 'notfeed_cat_seed_version';

export function getCategorySeedVersion(): number {
	const stored = localStorage.getItem(VERSION_KEY);
	return stored ? parseInt(stored, 10) : 0;
}

export function setCategorySeedVersion(version: number): void {
	localStorage.setItem(VERSION_KEY, String(version));
}

/**
 * Seed or migrate categories. Idempotent — safe to call multiple times.
 */
export async function seedCategories(): Promise<void> {
	const current = getCategorySeedVersion();
	if (current >= CATEGORY_SEED_VERSION) return;

	const db = await getDatabase();
	const existing = await db.categories.getAll<Category>();
	const existingMap = new Map(existing.map((c) => [c.id, c]));
	const seedIds = new Set(CATEGORY_SEED.map((c) => c.id));

	// Insert or update seed categories
	for (const seed of CATEGORY_SEED) {
		const ex = existingMap.get(seed.id);
		if (ex) {
			// Update metadata, preserve isActive
			const updated: Category = {
				...seed,
				isActive: ex.isActive
			};
			await db.categories.put(updated);
		} else {
			// New category
			const cat: Category = {
				...seed,
				isActive: true
			};
			await db.categories.put(cat);
		}
	}

	// Mark removed categories as inactive
	for (const ex of existing) {
		if (ex.isSystem && !seedIds.has(ex.id)) {
			await db.categories.put({ ...ex, isActive: false });
		}
	}

	setCategorySeedVersion(CATEGORY_SEED_VERSION);
}
