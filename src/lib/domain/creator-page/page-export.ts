/**
 * PageExport — self-contained JSON snapshot of a CreatorPage for offline sharing.
 *
 * Allows a local UserCreator (without Nostr) to export a CreatorPage
 * as a `.notfeed.json` file that UserConsumers can import.
 *
 * Contains the full tree: Page → Profiles → Fonts + embedded images.
 * IDs are regenerated on import to avoid collisions. The `exportId` is
 * stable across re-exports to allow update-or-duplicate on reimport.
 *
 * Does NOT contain: internal IDs, posts, ConsumerState, Nostr sync data.
 */

import type { ImageAsset } from '../shared/image-asset.js';
import type { FontProtocol, FontConfig } from '../font/font.js';

/** Snapshot of a Font within the export (no internal IDs) */
export interface FontSnapshot {
	title: string;
	tags: string[];
	avatar: ImageAsset | null;
	protocol: FontProtocol;
	config: FontConfig;
	defaultEnabled: boolean;
}

/** Snapshot of a Profile within the export (no internal IDs) */
export interface ProfileSnapshot {
	title: string;
	tags: string[];
	avatar: ImageAsset | null;
	categoryId: string;
	defaultEnabled: boolean;
	fonts: FontSnapshot[];
}

/** The exported file structure */
export interface PageExport {
	/** Stable identifier — generated once on first export, preserved on re-exports */
	exportId: string;

	/** Incremented on every re-export */
	version: number;

	/** When this export was generated */
	exportedAt: Date;

	/** Creator's display name (informational, for import UI) */
	creatorDisplayName: string;

	/** Page metadata */
	page: {
		title: string;
		bio: string;
		tags: string[];
		avatar: ImageAsset | null;
		banner: ImageAsset | null;
	};

	/** Full profile + font tree */
	profiles: ProfileSnapshot[];
}

/** File extension and MIME for the export format */
export const PAGE_EXPORT_EXTENSION = '.notfeed.json';
export const PAGE_EXPORT_MIME = 'application/json';
