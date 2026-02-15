/**
 * CreatorPage — a publishable artifact describing an editorial collection.
 *
 * Not an identity — it's a versionable document owned by a UserCreator.
 * Contains Profiles and their Fonts. Can be synced online (Blossom)
 * or exported as JSON for offline sharing.
 *
 * Categories are derived (union of Profile categories) — never stored directly.
 */

import type { ImageAsset } from '../shared/image-asset.js';

export type PageSyncStatus = 'local' | 'synced' | 'exported' | 'imported';

export interface CreatorPage {
	id: string;

	/** Reference to the owning UserCreator */
	ownerId: string;

	title: string;
	bio: string;
	tags: string[];

	/** Avatar image (WEBP, max 512x512) */
	avatar: ImageAsset | null;

	/** Background/banner image (WEBP, max 1600x600) */
	banner: ImageAsset | null;

	/** Nostr public key — set when synced online */
	nostrPublicKey: string | null;

	/** Blossom reference — set when synced via Blossom */
	blossomRef: string | null;

	/** Sync/distribution status */
	syncStatus: PageSyncStatus;

	/** Stable export ID — generated once, preserved across re-exports */
	exportId: string | null;

	createdAt: Date;
	updatedAt: Date;
}

export type NewCreatorPage = Omit<
	CreatorPage,
	'id' | 'createdAt' | 'updatedAt' | 'nostrPublicKey' | 'blossomRef' | 'syncStatus' | 'exportId'
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
}
