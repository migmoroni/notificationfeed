/**
 * ProfileFont store — implements ProfileFontRepository using the local database.
 */

import type {
	ProfileFont,
	ProfileFontRepository,
	NewProfileFont
} from '$lib/domain/profile-font/profile-font.js';
import { getDatabase } from './db.js';

export function createProfileFontStore(): ProfileFontRepository {
	return {
		async getAll(): Promise<ProfileFont[]> {
			const db = await getDatabase();
			return db.profileFonts.getAll<ProfileFont>();
		},

		async getById(id: string): Promise<ProfileFont | null> {
			const db = await getDatabase();
			return db.profileFonts.getById<ProfileFont>(id);
		},

		async getByProfileId(profileId: string): Promise<ProfileFont[]> {
			const db = await getDatabase();
			return db.profileFonts.query<ProfileFont>('profileId', profileId);
		},

		async getByFontId(fontId: string): Promise<ProfileFont[]> {
			const db = await getDatabase();
			return db.profileFonts.query<ProfileFont>('fontId', fontId);
		},

		async create(data: NewProfileFont): Promise<ProfileFont> {
			const db = await getDatabase();
			const record: ProfileFont = { id: crypto.randomUUID(), ...data };
			await db.profileFonts.put(record);
			return record;
		},

		async update(id: string, data: Partial<NewProfileFont>): Promise<ProfileFont> {
			const db = await getDatabase();
			const existing = await db.profileFonts.getById<ProfileFont>(id);
			if (!existing) throw new Error(`ProfileFont not found: ${id}`);
			const updated: ProfileFont = { ...existing, ...data };
			await db.profileFonts.put(updated);
			return updated;
		},

		async delete(id: string): Promise<void> {
			const db = await getDatabase();
			await db.profileFonts.delete(id);
		},

		async deleteByProfileId(profileId: string): Promise<void> {
			const db = await getDatabase();
			const records = await db.profileFonts.query<ProfileFont>('profileId', profileId);
			for (const r of records) {
				await db.profileFonts.delete(r.id);
			}
		},

		async deleteByFontId(fontId: string): Promise<void> {
			const db = await getDatabase();
			const records = await db.profileFonts.query<ProfileFont>('fontId', fontId);
			for (const r of records) {
				await db.profileFonts.delete(r.id);
			}
		}
	};
}
