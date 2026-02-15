/**
 * Font — a data source bound to a Profile.
 *
 * Encapsulates protocol-specific configuration (Nostr relay, RSS URL, Atom URL).
 * Each Font knows how to describe where to fetch data from.
 */

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
	profileId: string;
	label: string;
	protocol: FontProtocol;
	config: FontConfig;
	enabled: boolean;
	createdAt: Date;
	updatedAt: Date;
}

export type NewFont = Omit<Font, 'id' | 'createdAt' | 'updatedAt'>;
