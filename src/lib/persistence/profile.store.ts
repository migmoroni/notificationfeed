/**
 * Profile store — implements ProfileRepository using the local database.
 */

import type { ProfileRepository } from '$lib/domain/profile/profile.repository.js';
import type { NewProfile, Profile } from '$lib/domain/profile/profile.js';
import { getDatabase } from './db.js';

export function createProfileStore(): ProfileRepository {
	return {
		async getAll(): Promise<Profile[]> {
			const db = await getDatabase();
			return db.profiles.getAll<Profile>();
		},

		async getById(id: string): Promise<Profile | null> {
			const db = await getDatabase();
			return db.profiles.getById<Profile>(id);
		},

		async create(data: NewProfile): Promise<Profile> {
			const db = await getDatabase();
			const now = new Date();
			const profile: Profile = {
				id: crypto.randomUUID(),
				...data,
				createdAt: now,
				updatedAt: now
			};
			await db.profiles.put(profile);
			return profile;
		},

		async update(id: string, data: Partial<NewProfile>): Promise<Profile> {
			const db = await getDatabase();
			const existing = await db.profiles.getById<Profile>(id);
			if (!existing) throw new Error(`Profile not found: ${id}`);

			const updated: Profile = {
				...existing,
				...data,
				updatedAt: new Date()
			};
			await db.profiles.put(updated);
			return updated;
		},

		async delete(id: string): Promise<void> {
			const db = await getDatabase();
			await db.profiles.delete(id);
		}
	};
}
