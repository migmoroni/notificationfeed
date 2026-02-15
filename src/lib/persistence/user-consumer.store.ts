/**
 * UserConsumer store — implements UserConsumerRepository using the local database.
 */

import type { UserConsumerRepository } from '$lib/domain/user/user-consumer.js';
import type { UserConsumer, NewUserConsumer } from '$lib/domain/user/user-consumer.js';
import type { FollowRef } from '$lib/domain/shared/follow-ref.js';
import type { ConsumerState } from '$lib/domain/shared/consumer-state.js';
import { getDatabase } from './db.js';

export function createUserConsumerStore(): UserConsumerRepository {
	return {
		async getAll(): Promise<UserConsumer[]> {
			const db = await getDatabase();
			const all = await db.users.query<UserConsumer>('role', 'consumer');
			return all;
		},

		async getById(id: string): Promise<UserConsumer | null> {
			const db = await getDatabase();
			return db.users.getById<UserConsumer>(id);
		},

		async create(data: NewUserConsumer): Promise<UserConsumer> {
			const db = await getDatabase();
			const now = new Date();
			const consumer: UserConsumer = {
				id: crypto.randomUUID(),
				role: 'consumer',
				displayName: data.displayName,
				follows: data.follows ?? [],
				createdAt: now,
				updatedAt: now
			};
			await db.users.put(consumer);
			return consumer;
		},

		async update(id: string, data: Partial<NewUserConsumer>): Promise<UserConsumer> {
			const db = await getDatabase();
			const existing = await db.users.getById<UserConsumer>(id);
			if (!existing) throw new Error(`UserConsumer not found: ${id}`);

			const updated: UserConsumer = {
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

		async addFollow(userId: string, follow: FollowRef): Promise<void> {
			const db = await getDatabase();
			const user = await db.users.getById<UserConsumer>(userId);
			if (!user) throw new Error(`UserConsumer not found: ${userId}`);

			const exists = user.follows.some(
				(f) => f.targetType === follow.targetType && f.targetId === follow.targetId
			);
			if (exists) return;

			user.follows.push(follow);
			user.updatedAt = new Date();
			await db.users.put(user);
		},

		async removeFollow(userId: string, targetId: string): Promise<void> {
			const db = await getDatabase();
			const user = await db.users.getById<UserConsumer>(userId);
			if (!user) throw new Error(`UserConsumer not found: ${userId}`);

			user.follows = user.follows.filter((f) => f.targetId !== targetId);
			user.updatedAt = new Date();
			await db.users.put(user);
		},

		async getFollows(userId: string): Promise<FollowRef[]> {
			const db = await getDatabase();
			const user = await db.users.getById<UserConsumer>(userId);
			if (!user) throw new Error(`UserConsumer not found: ${userId}`);
			return user.follows;
		},

		async getState(userId: string, entityId: string): Promise<ConsumerState | null> {
			const db = await getDatabase();
			const states = await db.consumerStates.query<ConsumerState & { userId: string }>(
				'entityType',
				'creator_page'
			);
			// Query all states, filter by userId and entityId
			const allStates = await db.consumerStates.getAll<ConsumerState & { userId: string }>();
			return allStates.find((s) => s.userId === userId && s.entityId === entityId) ?? null;
		},

		async getAllStates(userId: string): Promise<ConsumerState[]> {
			const db = await getDatabase();
			const allStates = await db.consumerStates.getAll<ConsumerState & { userId: string }>();
			return allStates.filter((s) => s.userId === userId);
		},

		async setState(userId: string, state: ConsumerState): Promise<void> {
			const db = await getDatabase();
			await db.consumerStates.put({ ...state, userId });
		},

		async removeState(userId: string, entityId: string): Promise<void> {
			const db = await getDatabase();
			await db.consumerStates.delete(entityId);
		}
	};
}
