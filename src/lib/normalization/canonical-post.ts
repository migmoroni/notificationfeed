/**
 * Canonical Post — normalized, protocol-agnostic post representation.
 *
 * The nodeId references a TreeNode with role='font', using composite format `treeId:localUuid`.
 */

import type { FontProtocol } from '$lib/domain/content-tree/content-tree.js';

export interface CanonicalPost {
	/** Deterministic ID derived from source (e.g., Nostr event ID, RSS guid, Atom entry ID) */
	id: string;

	/** The content node (role='font') that produced this post */
	nodeId: string;

	/** Origin protocol */
	protocol: FontProtocol;

	/** Post title (may be empty for Nostr) */
	title: string;

	/** Main text content (plain text or sanitized HTML) */
	content: string;

	/** Link to the original source */
	url: string;

	/** Author name or pubkey */
	author: string;

	/** Publication timestamp */
	publishedAt: Date;

	/** When this post was ingested locally */
	ingestedAt: Date;

	/** Whether the user has read this post */
	read: boolean;
}

/**
 * PostContainer — groups all posts for a single font node.
 *
 * Stored as one IndexedDB record per nodeId for efficient bulk lookup.
 */
export interface PostContainer {
	nodeId: string;
	posts: CanonicalPost[];
}
