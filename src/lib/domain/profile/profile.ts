/**
 * Profile — thematic or editorial identity that groups Fonts.
 *
 * Profiles are independent entities. Relationships to CreatorPages are
 * managed via the CreatorProfile junction store (N:N). A profile can
 * exist standalone or be linked to one or more CreatorPages.
 *
 * Priority inheritance chain: Font → Profile → CreatorPage → default(3).
 *
 * Invariants:
 * - Always has an owner (ownerType/ownerId indicates who created it).
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

	title: string;
	bio: string;
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
