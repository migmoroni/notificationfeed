import type { NewProfile, Profile } from './profile.js';

/**
 * Contract for Profile persistence.
 * Implementations live in `$lib/persistence/`.
 */
export interface ProfileRepository {
	getAll(): Promise<Profile[]>;
	getById(id: string): Promise<Profile | null>;
	create(profile: NewProfile): Promise<Profile>;
	update(id: string, data: Partial<NewProfile>): Promise<Profile>;
	delete(id: string): Promise<void>;
}
