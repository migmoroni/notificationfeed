/**
 * Profile — thematic or editorial identity that groups Fonts.
 *
 * A Profile has two lifecycle modes determined by `creatorPageId`:
 *
 * 1. **Standalone** (`creatorPageId = null`)
 *    - Acts as an independent aggregate root.
 *    - Created by UserConsumer for manual third-party feeds.
 *    - Navigated directly: `/browse/profile/{id}`.
 *    - Deleting it cascades to its Fonts and associated posts.
 *
 * 2. **Dependent** (`creatorPageId = string`)
 *    - Child entity within the CreatorPage aggregate.
 *    - Identity and navigation are scoped under the parent page:
 *      `/browse/creator/{creatorPageId}/profile/{id}`.
 *    - Follows the CreatorPage lifecycle: deleting the page
 *      detaches the profile (becomes standalone), does NOT delete it.
 *    - Priority inheritance chain: Font → Profile → CreatorPage → default(3).
 *
 * Invariants:
 * - Always has an owner (consumer or creator).
 * - If ownerType='consumer', creatorPageId must be null (always standalone).
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

	/**
	 * CreatorPage this profile belongs to.
	 * - `null` → standalone profile (independent aggregate root).
	 * - `string` → dependent child of the referenced CreatorPage aggregate.
	 *   Navigation, URL structure, and priority inheritance are scoped
	 *   under the parent page.
	 */
	creatorPageId: string | null;

	/** Section within the parent CreatorPage (visual grouping only, null = unsectioned) */
	sectionId: string | null;

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
