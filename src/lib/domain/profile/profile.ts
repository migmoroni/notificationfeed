/**
 * Profile — thematic or editorial identity that groups Fonts.
 *
 * Can be created by either a UserConsumer (standalone, for manual feeds)
 * or a UserCreator (standalone or bound to a CreatorPage).
 *
 * Invariants:
 * - Always has an owner (consumer or creator).
 * - If ownerType='consumer', creatorPageId must be null.
 * - If ownerType='creator', creatorPageId may reference a CreatorPage.
 * - Belongs to exactly one Category sublevel (depth >= 1).
 * - Category is never inherited — it's directly assigned.
 */

import type { ImageAsset } from '../shared/image-asset.js';
import type { UserRole } from '../user/user.js';

export interface Profile {
	id: string;

	/** Who created this profile */
	ownerType: UserRole;
	ownerId: string;

	/** CreatorPage this profile belongs to (null = standalone) */
	creatorPageId: string | null;

	title: string;
	tags: string[];

	/** Avatar image (WEBP, max 512x512) */
	avatar: ImageAsset | null;

	/** Reference to a Category sublevel (depth >= 1) */
	categoryId: string;

	/** Default enabled state for new consumers */
	defaultEnabled: boolean;

	createdAt: Date;
	updatedAt: Date;
}

export type NewProfile = Omit<Profile, 'id' | 'createdAt' | 'updatedAt'>;
