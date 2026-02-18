/**
 * FavoriteFolder store — implements FavoriteFolderRepository using IndexedDB.
 *
 * Automatically creates the Inbox folder on first access if it doesn't exist.
 */

import type { FavoriteFolderRepository, FavoriteFolder, NewFavoriteFolder } from '$lib/domain/favorite-folder/favorite-folder.js';
import { getDatabase } from './db.js';

const INBOX_ID = '00000000-0000-0000-0000-inbox0000001';

async function ensureInbox(): Promise<FavoriteFolder> {
	const db = await getDatabase();
	const existing = await db.favoriteFolders.getById<FavoriteFolder>(INBOX_ID);
	if (existing) return existing;

	const inbox: FavoriteFolder = {
		id: INBOX_ID,
		name: 'Inbox',
		isInbox: true,
		order: 0,
		createdAt: new Date()
	};
	await db.favoriteFolders.put(inbox);
	return inbox;
}

export function createFavoriteFolderStore(): FavoriteFolderRepository {
	return {
		async getAll(): Promise<FavoriteFolder[]> {
			await ensureInbox();
			const db = await getDatabase();
			const all = await db.favoriteFolders.getAll<FavoriteFolder>();
			return all.sort((a, b) => a.order - b.order);
		},

		async getById(id: string): Promise<FavoriteFolder | null> {
			const db = await getDatabase();
			return db.favoriteFolders.getById<FavoriteFolder>(id);
		},

		async getInbox(): Promise<FavoriteFolder> {
			return ensureInbox();
		},

		async create(data: NewFavoriteFolder): Promise<FavoriteFolder> {
			if (data.isInbox) throw new Error('Cannot create additional Inbox folders');

			const db = await getDatabase();
			const folder: FavoriteFolder = {
				id: crypto.randomUUID(),
				...data,
				createdAt: new Date()
			};
			await db.favoriteFolders.put(folder);
			return folder;
		},

		async update(id: string, data: Partial<Pick<FavoriteFolder, 'name' | 'order'>>): Promise<FavoriteFolder> {
			const db = await getDatabase();
			const existing = await db.favoriteFolders.getById<FavoriteFolder>(id);
			if (!existing) throw new Error(`FavoriteFolder not found: ${id}`);
			if (existing.isInbox && data.name) throw new Error('Cannot rename Inbox folder');

			const updated: FavoriteFolder = { ...existing, ...data };
			await db.favoriteFolders.put(updated);
			return updated;
		},

		async delete(id: string): Promise<void> {
			const db = await getDatabase();
			const existing = await db.favoriteFolders.getById<FavoriteFolder>(id);
			if (!existing) return;
			if (existing.isInbox) throw new Error('Cannot delete Inbox folder');

			await db.favoriteFolders.delete(id);
		}
	};
}

export { INBOX_ID };
