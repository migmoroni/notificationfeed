/**
 * UserConsumer — local consumption account.
 *
 * Consumes feeds, organizes content, manages follows and custom categories.
 * Never publishes content. Custom categories are exclusively owned by consumers.
 */

import type { UserBase } from './user.js';
import type { FollowRef } from '../shared/follow-ref.js';
import type { ConsumerState } from '../shared/consumer-state.js';

export interface UserConsumer extends UserBase {
	role: 'consumer';

	/** References to followed CreatorPages and/or UserCreators */
	follows: FollowRef[];
}

export type NewUserConsumer = Omit<UserConsumer, 'id' | 'role' | 'createdAt' | 'updatedAt' | 'follows'> & {
	follows?: FollowRef[];
};

/**
 * Contract for UserConsumer persistence.
 */
export interface UserConsumerRepository {
	getAll(): Promise<UserConsumer[]>;
	getById(id: string): Promise<UserConsumer | null>;
	create(user: NewUserConsumer): Promise<UserConsumer>;
	update(id: string, data: Partial<NewUserConsumer>): Promise<UserConsumer>;
	delete(id: string): Promise<void>;

	/** Follow management */
	addFollow(userId: string, follow: FollowRef): Promise<void>;
	removeFollow(userId: string, targetId: string): Promise<void>;
	getFollows(userId: string): Promise<FollowRef[]>;

	/** Consumer state overrides */
	getState(userId: string, entityId: string): Promise<ConsumerState | null>;
	getAllStates(userId: string): Promise<ConsumerState[]>;
	setState(userId: string, state: ConsumerState): Promise<void>;
	removeState(userId: string, entityId: string): Promise<void>;
}
