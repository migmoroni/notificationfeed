/**
 * UserCreator — account that manages CreatorPages.
 *
 * Creates and manages CreatorPages, Profiles and Fonts.
 * Purely local/offline — online sync is not supported.
 */

import type { UserBase } from './user.js';

export interface UserCreator extends UserBase {
	role: 'creator';

	/** IDs of ContentTrees created/owned by this creator */
	ownedTreeIds: string[];

	/** IDs of ContentMedias created/owned by this creator */
	ownedMediaIds: string[];
}

export type NewUserCreator = Omit<UserCreator, 'id' | 'role' | 'createdAt' | 'updatedAt'>;

/**
 * Contract for UserCreator persistence.
 */
export interface UserCreatorRepository {
	getAll(): Promise<UserCreator[]>;
	getById(id: string): Promise<UserCreator | null>;
	create(user: NewUserCreator): Promise<UserCreator>;
	update(id: string, data: Partial<NewUserCreator>): Promise<UserCreator>;
	delete(id: string): Promise<void>;
}
