import type { NewProfile, Profile } from './profile.js';
import type { UserRole } from '../user/user.js';

/**
 * Contract for Profile persistence.
 * Implementations live in `$lib/persistence/`.
 */
export interface ProfileRepository {
	getAll(): Promise<Profile[]>;
	getById(id: string): Promise<Profile | null>;
	getByOwnerId(ownerId: string, ownerType?: UserRole): Promise<Profile[]>;
	getByCreatorPageId(creatorPageId: string): Promise<Profile[]>;
	getByCategoryId(categoryId: string): Promise<Profile[]>;
	create(profile: NewProfile): Promise<Profile>;
	update(id: string, data: Partial<NewProfile>): Promise<Profile>;
	delete(id: string): Promise<void>;
}
