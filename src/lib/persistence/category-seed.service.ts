/**
 * Category Seed Service — populates the official taxonomy on app boot.
 *
 * Inserts all seed categories if the categories table is empty.
 * Since the app hasn't launched, there's no migration logic.
 * If the taxonomy changes during development, delete the local DB and reload.
 *
 * This service should run once on boot, before consumer.init().
 */

import type { Category } from '$lib/domain/category/category.js';
import { CATEGORY_SEED } from '$lib/domain/category/category-seed.js';
import { getStorageBackend } from './db.js';

/**
 * Seed categories if the table is empty. Idempotent.
 */
export async function seedCategories(): Promise<void> {
	const db = await getStorageBackend();
	const existing = await db.categories.getAll<Category>();
	if (existing.length > 0) return;

	for (const seed of CATEGORY_SEED) {
		await db.categories.put(seed as Category);
	}
}
