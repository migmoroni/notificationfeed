/**
 * Font — a technical distribution channel bound to a Profile.
 *
 * Encapsulates protocol-specific configuration (Nostr relay, RSS URL, Atom URL).
 * Inherits its Category from the parent Profile — never has its own.
 *
 * Invariants:
 * - Always belongs to exactly one Profile. Orphan fonts are forbidden.
 * - Category is derived from the parent Profile (not stored).
 * - Can be enabled/disabled by UserConsumer (via ConsumerState).
 */

import type { ImageAsset } from '../shared/image-asset.js';

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

	title: string;
	tags: string[];

	/** Avatar image (WEBP, max 512x512) */
	avatar: ImageAsset | null;

	protocol: FontProtocol;
	config: FontConfig;

	/** Default enabled state for new consumers */
	defaultEnabled: boolean;

	createdAt: Date;
	updatedAt: Date;
}

export type NewFont = Omit<Font, 'id' | 'createdAt' | 'updatedAt'>;
