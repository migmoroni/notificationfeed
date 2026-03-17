/**
 * ContentNode — the minimal unit of content in Notfeed.
 *
 * Replaces the old separate entities: CreatorPage, Profile, Font.
 * Every piece of content is now a generic node with a `role` discriminant
 * that determines its semantic meaning and body shape.
 *
 * Structure:
 *   contentNode
 *     ├ role        — semantic type ('creator' | 'profile' | 'font' | ...)
 *     ├ data
 *     │  ├ header   — common display fields (title, tags, cover, etc.)
 *     │  └ body     — role-specific payload (discriminated union)
 *     └ metadata    — system fields (id, timestamps, version)
 *
 * The system treats `role` as a semantic identifier, not a fixed structure.
 * New roles can be added without breaking existing code.
 */

import type { CategoryAssignment } from '../shared/category-assignment.js';

// ---------------------------------------------------------------------------
// Roles
// ---------------------------------------------------------------------------

export type NodeRole = 'creator' | 'profile' | 'font';

// ---------------------------------------------------------------------------
// Header (shared across all roles)
// ---------------------------------------------------------------------------

/**
 * Common display fields used by lists, cards, previews, and navigation.
 */
export interface ContentNodeHeader {
	title: string;

	/** Short phrase or tagline */
	subtitle?: string;

	/** Longer description / bio */
	summary?: string;

	/** Reference to a ContentMedia for avatar/cover image */
	coverMediaId?: string;

	/** Reference to a ContentMedia for banner (primarily for creator role) */
	bannerMediaId?: string;

	/** Freeform tags for search and categorization */
	tags: string[];

	/** Category assignments — one entry per tree. */
	categoryAssignments: CategoryAssignment[];
}

// ---------------------------------------------------------------------------
// Body variants (discriminated by role)
// ---------------------------------------------------------------------------

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

/** Body for nodes with role = 'creator' */
export interface CreatorBody {
	role: 'creator';
}

/** Body for nodes with role = 'profile' */
export interface ProfileBody {
	role: 'profile';
	/** Default enabled state for new consumers */
	defaultEnabled: boolean;
}

/** Body for nodes with role = 'font' */
export interface FontBody {
	role: 'font';
	protocol: FontProtocol;
	config: FontConfig;
	/** Default enabled state for new consumers */
	defaultEnabled: boolean;
}

export type ContentNodeBody = CreatorBody | ProfileBody | FontBody;

// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------

export interface ContentNodeMetadata {
	/** UUIDv7, immutable once created */
	id: string;

	/** Schema version for future migrations */
	versionSchema: number;

	createdAt: Date;
	updatedAt: Date;

	/** ID of the creator user (if known) */
	author?: string;
}

// ---------------------------------------------------------------------------
// ContentNode (assembled)
// ---------------------------------------------------------------------------

export interface ContentNode {
	role: NodeRole;
	data: {
		header: ContentNodeHeader;
		body: ContentNodeBody;
	};
	metadata: ContentNodeMetadata;
}

// ---------------------------------------------------------------------------
// Convenience type guards
// ---------------------------------------------------------------------------

export function isCreatorNode(node: ContentNode): node is ContentNode & { data: { body: CreatorBody } } {
	return node.role === 'creator';
}

export function isProfileNode(node: ContentNode): node is ContentNode & { data: { body: ProfileBody } } {
	return node.role === 'profile';
}

export function isFontNode(node: ContentNode): node is ContentNode & { data: { body: FontBody } } {
	return node.role === 'font';
}

// ---------------------------------------------------------------------------
// Repository contract
// ---------------------------------------------------------------------------

export interface ContentNodeRepository {
	getAll(): Promise<ContentNode[]>;
	getById(id: string): Promise<ContentNode | null>;
	getByRole(role: NodeRole): Promise<ContentNode[]>;
	getByIds(ids: string[]): Promise<ContentNode[]>;
	getByAuthor(authorId: string): Promise<ContentNode[]>;
	put(node: ContentNode): Promise<void>;
	delete(id: string): Promise<void>;
}
