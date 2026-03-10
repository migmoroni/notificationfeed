/**
 * CreatorProfile store — implements CreatorProfileRepository using the local database.
 */

import type {
	CreatorProfile,
	CreatorProfileRepository,
	NewCreatorProfile
} from '$lib/domain/creator-profile/creator-profile.js';
import { getDatabase } from './db.js';

export function createCreatorProfileStore(): CreatorProfileRepository {
	return {
		async getAll(): Promise<CreatorProfile[]> {
			const db = await getDatabase();
			return db.creatorProfiles.getAll<CreatorProfile>();
		},

		async getById(id: string): Promise<CreatorProfile | null> {
			const db = await getDatabase();
			return db.creatorProfiles.getById<CreatorProfile>(id);
		},

		async getByCreatorPageId(creatorPageId: string): Promise<CreatorProfile[]> {
			const db = await getDatabase();
			return db.creatorProfiles.query<CreatorProfile>('creatorPageId', creatorPageId);
		},

		async getByProfileId(profileId: string): Promise<CreatorProfile[]> {
			const db = await getDatabase();
			return db.creatorProfiles.query<CreatorProfile>('profileId', profileId);
		},

		async create(data: NewCreatorProfile): Promise<CreatorProfile> {
			const db = await getDatabase();
			const record: CreatorProfile = { id: crypto.randomUUID(), ...data };
			await db.creatorProfiles.put(record);
			return record;
		},

		async update(id: string, data: Partial<NewCreatorProfile>): Promise<CreatorProfile> {
			const db = await getDatabase();
			const existing = await db.creatorProfiles.getById<CreatorProfile>(id);
			if (!existing) throw new Error(`CreatorProfile not found: ${id}`);
			const updated: CreatorProfile = { ...existing, ...data };
			await db.creatorProfiles.put(updated);
			return updated;
		},

		async delete(id: string): Promise<void> {
			const db = await getDatabase();
			await db.creatorProfiles.delete(id);
		},

		async deleteByCreatorPageId(creatorPageId: string): Promise<void> {
			const db = await getDatabase();
			const records = await db.creatorProfiles.query<CreatorProfile>('creatorPageId', creatorPageId);
			for (const r of records) {
				await db.creatorProfiles.delete(r.id);
			}
		},

		async deleteByProfileId(profileId: string): Promise<void> {
			const db = await getDatabase();
			const records = await db.creatorProfiles.query<CreatorProfile>('profileId', profileId);
			for (const r of records) {
				await db.creatorProfiles.delete(r.id);
			}
		}
	};
}
