/**
 * UserCreator store — implements UserCreatorRepository using the local database.
 */

import type { UserCreatorRepository, SyncStatus, NostrKeypair } from '$lib/domain/user/user-creator.js';
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

		async getByPublicKey(pubkey: string): Promise<UserCreator | null> {
			const db = await getDatabase();
			const all = await db.users.query<UserCreator>('role', 'creator');
			const found = all.find((u) => u.nostrKeypair?.publicKey === pubkey) ?? null;
			return found ? migrate(found) : null;
		},

		async create(data: NewUserCreator): Promise<UserCreator> {
			const db = await getDatabase();
			const now = new Date();
			const creator: UserCreator = {
				id: crypto.randomUUID(),
				role: 'creator',
				displayName: data.displayName,
				nostrKeypair: null,
				syncStatus: 'local',
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
		},

		async setKeypair(userId: string, keypair: NostrKeypair): Promise<void> {
			const db = await getDatabase();
			const user = await db.users.getById<UserCreator>(userId);
			if (!user) throw new Error(`UserCreator not found: ${userId}`);

			user.nostrKeypair = keypair;
			user.updatedAt = new Date();
			await db.users.put(user);
		},

		async setSyncStatus(userId: string, status: SyncStatus): Promise<void> {
			const db = await getDatabase();
			const user = await db.users.getById<UserCreator>(userId);
			if (!user) throw new Error(`UserCreator not found: ${userId}`);

			user.syncStatus = status;
			user.updatedAt = new Date();
			await db.users.put(user);
		}
	};
}
