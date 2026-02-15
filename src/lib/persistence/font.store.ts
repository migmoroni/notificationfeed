/**
 * Font store — implements FontRepository using the local database.
 */

import type { FontRepository } from '$lib/domain/font/font.repository.js';
import type { Font, NewFont } from '$lib/domain/font/font.js';
import { getDatabase } from './db.js';

export function createFontStore(): FontRepository {
	return {
		async getAll(): Promise<Font[]> {
			const db = await getDatabase();
			return db.fonts.getAll<Font>();
		},

		async getByProfileId(profileId: string): Promise<Font[]> {
			const db = await getDatabase();
			return db.fonts.query<Font>('profileId', profileId);
		},

		async getById(id: string): Promise<Font | null> {
			const db = await getDatabase();
			return db.fonts.getById<Font>(id);
		},

		async create(data: NewFont): Promise<Font> {
			const db = await getDatabase();
			const now = new Date();
			const font: Font = {
				id: crypto.randomUUID(),
				...data,
				createdAt: now,
				updatedAt: now
			};
			await db.fonts.put(font);
			return font;
		},

		async update(id: string, data: Partial<NewFont>): Promise<Font> {
			const db = await getDatabase();
			const existing = await db.fonts.getById<Font>(id);
			if (!existing) throw new Error(`Font not found: ${id}`);

			const updated: Font = {
				...existing,
				...data,
				updatedAt: new Date()
			};
			await db.fonts.put(updated);
			return updated;
		},

		async delete(id: string): Promise<void> {
			const db = await getDatabase();
			await db.fonts.delete(id);
		},

		async deleteByProfileId(profileId: string): Promise<void> {
			const db = await getDatabase();
			const fonts = await db.fonts.query<Font>('profileId', profileId);
			for (const font of fonts) {
				await db.fonts.delete(font.id);
			}
		}
	};
}
