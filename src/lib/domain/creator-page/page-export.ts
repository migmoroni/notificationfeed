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
import type { CategoryAssignment } from '../shared/category-assignment.js';

/** Snapshot of a Section within the export (no internal IDs) */
export interface SectionSnapshot {
	title: string;
	color: string;
	order: number;
	emoji?: string;
	hideTitle?: boolean;
}

/** Snapshot of a Font within the export (no internal IDs) */
export interface FontSnapshot {
	title: string;
	tags: string[];
	avatar: ImageAsset | null;
	protocol: FontProtocol;
	config: FontConfig;
	categoryAssignments: CategoryAssignment[];
	defaultEnabled: boolean;
	/** Index into parent profile's sections[] (null = unsectioned) */
	sectionId?: number | null;
}

/** Snapshot of a Profile within the export (no internal IDs) */
export interface ProfileSnapshot {
	title: string;
	tags: string[];
	avatar: ImageAsset | null;
	categoryAssignments: CategoryAssignment[];
	defaultEnabled: boolean;
	/** Index into page-level sections[] (null = unsectioned) */
	sectionId?: number | null;
	/** Sections that group this profile's fonts */
	sections?: SectionSnapshot[];
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
		tagline: string;
		bio: string;
		tags: string[];
		avatar: ImageAsset | null;
		banner: ImageAsset | null;
		categoryAssignments: CategoryAssignment[];
		/** Sections that group profiles within this page */
		sections?: SectionSnapshot[];
	};

	/** Full profile + font tree */
	profiles: ProfileSnapshot[];
}

/** File extension and MIME for the export format */
export const PAGE_EXPORT_EXTENSION = '.notfeed.json';
export const PAGE_EXPORT_MIME = 'application/json';
