/**
 * UserCreator — account that manages CreatorPages.
 *
 * Creates and manages CreatorPages, Profiles and Fonts.
 * Can sync identity via Nostr and pages via Blossom.
 * Shares public key (text or QR code) for consumers to follow.
 */

import type { UserBase } from './user.js';

export type SyncStatus = 'local' | 'synced';

export interface NostrKeypair {
	publicKey: string;
	privateKey: string;
}

export interface UserCreator extends UserBase {
	role: 'creator';

	/** Nostr keypair — null until the creator opts into online sync */
	nostrKeypair: NostrKeypair | null;

	/** Whether this creator account is synced via Nostr */
	syncStatus: SyncStatus;
}

export type NewUserCreator = Omit<UserCreator, 'id' | 'role' | 'createdAt' | 'updatedAt' | 'nostrKeypair' | 'syncStatus'>;

/**
 * Contract for UserCreator persistence.
 */
export interface UserCreatorRepository {
	getAll(): Promise<UserCreator[]>;
	getById(id: string): Promise<UserCreator | null>;
	create(user: NewUserCreator): Promise<UserCreator>;
	update(id: string, data: Partial<NewUserCreator>): Promise<UserCreator>;
	delete(id: string): Promise<void>;

	/** Nostr keypair management */
	setKeypair(userId: string, keypair: NostrKeypair): Promise<void>;
	setSyncStatus(userId: string, status: SyncStatus): Promise<void>;
}
