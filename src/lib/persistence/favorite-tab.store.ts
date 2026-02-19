/**
 * FavoriteTab store — implements FavoriteTabRepository using IndexedDB.
 *
 * Automatically creates the system "all_favorites" tab on first access.
 */

import type { FavoriteTabRepository, FavoriteTab, NewFavoriteTab } from '$lib/domain/favorite-tab/favorite-tab.js';
import { getDatabase } from './db.js';

export const ALL_FAVORITES_ID = '00000000-0000-0000-0000-allfav000001';

async function ensureSystemTab(): Promise<FavoriteTab> {
	const db = await getDatabase();
	const existing = await db.favoriteTabs.getById<FavoriteTab>(ALL_FAVORITES_ID);
	if (existing) return existing;

	const tab: FavoriteTab = {
		id: ALL_FAVORITES_ID,
		title: 'Todos',
		emoji: '⭐',
		position: 0,
		isSystem: true,
		createdAt: new Date()
	};
	await db.favoriteTabs.put(tab);
	return tab;
}

export function createFavoriteTabStore(): FavoriteTabRepository {
	return {
		async getAll(): Promise<FavoriteTab[]> {
			await ensureSystemTab();
			const db = await getDatabase();
			const all = await db.favoriteTabs.getAll<FavoriteTab>();
			return all.sort((a, b) => a.position - b.position);
		},

		async getById(id: string): Promise<FavoriteTab | null> {
			const db = await getDatabase();
			return db.favoriteTabs.getById<FavoriteTab>(id);
		},

		async getSystemTab(): Promise<FavoriteTab> {
			return ensureSystemTab();
		},

		async create(data: NewFavoriteTab): Promise<FavoriteTab> {
			if (data.isSystem) throw new Error('Cannot create additional system tabs');

			const db = await getDatabase();
			const tab: FavoriteTab = {
				id: crypto.randomUUID(),
				...data,
				createdAt: new Date()
			};
			await db.favoriteTabs.put(tab);
			return tab;
		},

		async update(id: string, data: Partial<Pick<FavoriteTab, 'title' | 'emoji' | 'position'>>): Promise<FavoriteTab> {
			const db = await getDatabase();
			const existing = await db.favoriteTabs.getById<FavoriteTab>(id);
			if (!existing) throw new Error(`FavoriteTab not found: ${id}`);
			if (existing.isSystem) throw new Error('Cannot edit system tab');

			const updated: FavoriteTab = { ...existing, ...data };
			await db.favoriteTabs.put(updated);
			return updated;
		},

		async delete(id: string): Promise<void> {
			const db = await getDatabase();
			const existing = await db.favoriteTabs.getById<FavoriteTab>(id);
			if (!existing) return;
			if (existing.isSystem) throw new Error('Cannot delete system tab');

			await db.favoriteTabs.delete(id);
		}
	};
}
