/**
 * Category store — implements CategoryRepository using the local database.
 */

import type { CategoryRepository } from '$lib/domain/category/category.js';
import type { Category, NewCategory, CategoryOrigin } from '$lib/domain/category/category.js';
import { getDatabase } from './db.js';

export function createCategoryStore(): CategoryRepository {
	return {
		async getAll(): Promise<Category[]> {
			const db = await getDatabase();
			return db.categories.getAll<Category>();
		},

		async getById(id: string): Promise<Category | null> {
			const db = await getDatabase();
			return db.categories.getById<Category>(id);
		},

		async getByOrigin(origin: CategoryOrigin): Promise<Category[]> {
			const db = await getDatabase();
			return db.categories.query<Category>('origin', origin);
		},

		async getChildren(parentId: string): Promise<Category[]> {
			const db = await getDatabase();
			return db.categories.query<Category>('parentId', parentId);
		},

		async getByOwnerId(ownerId: string): Promise<Category[]> {
			const db = await getDatabase();
			return db.categories.query<Category>('ownerId', ownerId);
		},

		async getSublevels(): Promise<Category[]> {
			const db = await getDatabase();
			const all = await db.categories.getAll<Category>();
			return all.filter((c) => c.depth >= 1);
		},

		async create(data: NewCategory): Promise<Category> {
			const db = await getDatabase();

			// Compute depth from parent
			let depth = 0;
			if (data.parentId) {
				const parent = await db.categories.getById<Category>(data.parentId);
				if (parent) {
					depth = parent.depth + 1;
				}
			}

			const category: Category = {
				id: crypto.randomUUID(),
				...data,
				depth
			};
			await db.categories.put(category);
			return category;
		},

		async update(id: string, data: Partial<NewCategory>): Promise<Category> {
			const db = await getDatabase();
			const existing = await db.categories.getById<Category>(id);
			if (!existing) throw new Error(`Category not found: ${id}`);

			const updated: Category = {
				...existing,
				...data
			};

			// Recompute depth if parent changed
			if (data.parentId !== undefined) {
				if (data.parentId) {
					const parent = await db.categories.getById<Category>(data.parentId);
					updated.depth = parent ? parent.depth + 1 : 0;
				} else {
					updated.depth = 0;
				}
			}

			await db.categories.put(updated);
			return updated;
		},

		async delete(id: string): Promise<void> {
			const db = await getDatabase();
			await db.categories.delete(id);
		}
	};
}
