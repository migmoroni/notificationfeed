/**
 * CreatorPage — a publishable artifact describing an editorial collection.
 *
 * Not an identity — it's a versionable document owned by a UserCreator.
 * Contains Profiles and their Fonts. Can be synced online (Blossom)
 * or exported as JSON for offline sharing.
 *
 * Has its own optional categoryAssignments. Effective categories are the
 * union of the page's own assignments + all child Profile/Font assignments.
 */

import type { ImageAsset } from '../shared/image-asset.js';
import type { CategoryAssignment } from '../shared/category-assignment.js';

export type PageSyncStatus = 'local' | 'synced' | 'exported' | 'imported';

export interface CreatorPage {
	id: string;

	/** Reference to the owning UserCreator */
	ownerId: string;

	title: string;
	/** Short opening phrase — shown above bio, used with links */
	tagline: string;
	bio: string;
	tags: string[];

	/** Avatar image (WEBP, max 512x512) */
	avatar: ImageAsset | null;

	/** Background/banner image (WEBP, max 1600x600) */
	banner: ImageAsset | null;

	/**
	 * Category assignments — one entry per tree.
	 * Effective categories = own + union of all child Profile/Font assignments.
	 */
	categoryAssignments: CategoryAssignment[];

	/** Nostr public key — set when synced online */
	nostrPublicKey: string | null;

	/** Blossom reference — set when synced via Blossom */
	blossomRef: string | null;

	/** Sync/distribution status */
	syncStatus: PageSyncStatus;

	/** Stable export ID — generated once, preserved across re-exports */
	exportId: string | null;

	/** When the page was last published */
	publishedAt: Date | null;

	/** Increments on every publish (starts at 0 = never published) */
	publishedVersion: number;

	createdAt: Date;
	updatedAt: Date;
}

export type NewCreatorPage = Omit<
	CreatorPage,
	| 'id'
	| 'createdAt'
	| 'updatedAt'
	| 'nostrPublicKey'
	| 'blossomRef'
	| 'syncStatus'
	| 'exportId'
	| 'publishedAt'
	| 'publishedVersion'
>;

/**
 * Contract for CreatorPage persistence.
 */
export interface CreatorPageRepository {
	getAll(): Promise<CreatorPage[]>;
	getByOwnerId(ownerId: string): Promise<CreatorPage[]>;
	getById(id: string): Promise<CreatorPage | null>;
	getByExportId(exportId: string): Promise<CreatorPage | null>;
	create(page: NewCreatorPage): Promise<CreatorPage>;
	update(id: string, data: Partial<NewCreatorPage>): Promise<CreatorPage>;
	delete(id: string): Promise<void>;
	setSyncStatus(id: string, status: PageSyncStatus): Promise<void>;
	setPublished(id: string, version: number): Promise<void>;
}
