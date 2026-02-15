/**
 * CreatorPage store — implements CreatorPageRepository using the local database.
 */

import type { CreatorPageRepository, PageSyncStatus } from '$lib/domain/creator-page/creator-page.js';
import type { CreatorPage, NewCreatorPage } from '$lib/domain/creator-page/creator-page.js';
import { getDatabase } from './db.js';

export function createCreatorPageStore(): CreatorPageRepository {
	return {
		async getAll(): Promise<CreatorPage[]> {
			const db = await getDatabase();
			return db.creatorPages.getAll<CreatorPage>();
		},

		async getById(id: string): Promise<CreatorPage | null> {
			const db = await getDatabase();
			return db.creatorPages.getById<CreatorPage>(id);
		},

		async getByOwnerId(ownerId: string): Promise<CreatorPage[]> {
			const db = await getDatabase();
			return db.creatorPages.query<CreatorPage>('ownerId', ownerId);
		},

		async getByExportId(exportId: string): Promise<CreatorPage | null> {
			const db = await getDatabase();
			const all = await db.creatorPages.getAll<CreatorPage>();
			return all.find((p) => p.exportId === exportId) ?? null;
		},

		async create(data: NewCreatorPage): Promise<CreatorPage> {
			const db = await getDatabase();
			const now = new Date();
			const page: CreatorPage = {
				id: crypto.randomUUID(),
				...data,
				nostrPublicKey: null,
				blossomRef: null,
				syncStatus: 'local',
				exportId: null,
				createdAt: now,
				updatedAt: now
			};
			await db.creatorPages.put(page);
			return page;
		},

		async update(id: string, data: Partial<NewCreatorPage>): Promise<CreatorPage> {
			const db = await getDatabase();
			const existing = await db.creatorPages.getById<CreatorPage>(id);
			if (!existing) throw new Error(`CreatorPage not found: ${id}`);

			const updated: CreatorPage = {
				...existing,
				...data,
				updatedAt: new Date()
			};
			await db.creatorPages.put(updated);
			return updated;
		},

		async delete(id: string): Promise<void> {
			const db = await getDatabase();
			await db.creatorPages.delete(id);
		},

		async setSyncStatus(id: string, status: PageSyncStatus): Promise<void> {
			const db = await getDatabase();
			const existing = await db.creatorPages.getById<CreatorPage>(id);
			if (!existing) throw new Error(`CreatorPage not found: ${id}`);

			existing.syncStatus = status;
			existing.updatedAt = new Date();
			await db.creatorPages.put(existing);
		}
	};
}
