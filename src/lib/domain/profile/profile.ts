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
 * - Has categoryAssignments: up to 3 categories per tree (subject, content_type).
 * - Categories are sublevels (depth >= 1), never root groupers.
 */

import type { ImageAsset } from '../shared/image-asset.js';
import type { UserRole } from '../user/user.js';
import type { CategoryAssignment } from '../shared/category-assignment.js';

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

	/**
	 * Category assignments — one entry per tree.
	 * Each tree allows up to 3 category sublevels.
	 * Example: [{ treeId: 'subject', categoryIds: ['cat1','cat2'] }, { treeId: 'content_type', categoryIds: ['cat3'] }]
	 */
	categoryAssignments: CategoryAssignment[];

	/** Default enabled state for new consumers */
	defaultEnabled: boolean;

	createdAt: Date;
	updatedAt: Date;
}

export type NewProfile = Omit<Profile, 'id' | 'createdAt' | 'updatedAt'>;
