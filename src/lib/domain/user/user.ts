/**
 * User — root identity in Notfeed.
 *
 * Two mutually exclusive roles: consumer and creator.
 * Both can coexist on the same device as separate user records.
 */

import type { ImageAsset } from '../shared/image-asset.js';

export type UserRole = 'consumer' | 'creator';

export interface UserBase {
	id: string;
	role: UserRole;
	displayName: string;

	/** Profile image (avatar slot, WEBP base64). Null = default icon. Mutually exclusive with profileEmoji. */
	profileImage: ImageAsset | null;

	/** Profile emoji (alternative to image). Mutually exclusive with profileImage. */
	profileEmoji: string | null;

	/** Soft-delete flag. Removed users are hidden but kept in DB. */
	removedAt: Date | null;

	createdAt: Date;
	updatedAt: Date;
}
