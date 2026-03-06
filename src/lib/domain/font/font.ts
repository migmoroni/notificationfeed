/**
 * Font — a technical distribution channel bound to a Profile.
 *
 * Encapsulates protocol-specific configuration (Nostr relay, RSS URL, Atom URL).
 * Has its own optional categoryAssignments that aggregate upward:
 *   Font categories bubble up to Profile, which bubbles up to CreatorPage.
 *
 * Invariants:
 * - Always belongs to exactly one Profile. Orphan fonts are forbidden.
 * - Can be enabled/disabled by UserConsumer (via ConsumerState).
 */

import type { ImageAsset } from '../shared/image-asset.js';
import type { CategoryAssignment } from '../shared/category-assignment.js';

export type FontProtocol = 'nostr' | 'rss' | 'atom';

export interface FontNostrConfig {
	relays: string[];
	pubkey: string;
	kinds?: number[];
}

export interface FontRssConfig {
	url: string;
}

export interface FontAtomConfig {
	url: string;
}

export type FontConfig = FontNostrConfig | FontRssConfig | FontAtomConfig;

export interface Font {
	id: string;

	/** Profile this font belongs to (mandatory) */
	profileId: string;

	/** Section within the parent Profile (visual grouping only, null = unsectioned) */
	sectionId: string | null;

	title: string;
	bio: string;
	tags: string[];

	/** Avatar image (WEBP, max 512x512) */
	avatar: ImageAsset | null;

	protocol: FontProtocol;
	config: FontConfig;

	/**
	 * Category assignments — one entry per tree.
	 * Bubbles up to the parent Profile during aggregation.
	 */
	categoryAssignments: CategoryAssignment[];

	/** Default enabled state for new consumers */
	defaultEnabled: boolean;

	createdAt: Date;
	updatedAt: Date;
}

export type NewFont = Omit<Font, 'id' | 'createdAt' | 'updatedAt'>;
