/**
 * UserCreator store — implements UserCreatorRepository using the local database.
 */

import type { UserCreatorRepository } from '$lib/domain/user/user-creator.js';
import type { UserCreator, NewUserCreator } from '$lib/domain/user/user-creator.js';
import { getDatabase } from './db.js';

export function createUserCreatorStore(): UserCreatorRepository {
	/** Ensure legacy records have new fields with defaults */
	function migrate(user: UserCreator): UserCreator {
		let needsMigration = false;
		if (!user.ownedTreeIds) { user.ownedTreeIds = []; needsMigration = true; }
		if (!user.ownedMediaIds) { user.ownedMediaIds = []; needsMigration = true; }
		return user;
	}

	return {
		async getAll(): Promise<UserCreator[]> {
			const db = await getDatabase();
			const users = await db.users.query<UserCreator>('role', 'creator');
			return users.map(migrate);
		},

		async getById(id: string): Promise<UserCreator | null> {
			const db = await getDatabase();
			const user = await db.users.getById<UserCreator>(id);
			return user ? migrate(user) : null;
		},

		async create(data: NewUserCreator): Promise<UserCreator> {
			const db = await getDatabase();
			const now = new Date();
			const creator: UserCreator = {
				id: crypto.randomUUID(),
				role: 'creator',
				displayName: data.displayName,
				profileImage: null,
				profileEmoji: null,
				removedAt: null,
				ownedTreeIds: [],
				ownedMediaIds: [],
				createdAt: now,
				updatedAt: now
			};
			await db.users.put(creator);
			return creator;
		},

		async update(id: string, data: Partial<NewUserCreator>): Promise<UserCreator> {
			const db = await getDatabase();
			const existing = await db.users.getById<UserCreator>(id);
			if (!existing) throw new Error(`UserCreator not found: ${id}`);

			const updated: UserCreator = {
				...existing,
				...data,
				updatedAt: new Date()
			};
			await db.users.put(updated);
			return updated;
		},

		async delete(id: string): Promise<void> {
			const db = await getDatabase();
			await db.users.delete(id);
		}
	};
}
