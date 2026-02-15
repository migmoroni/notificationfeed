/**
 * Canonical Post — the normalized, protocol-agnostic representation of a post.
 *
 * Every ingested item (Nostr event, RSS item, Atom entry) is transformed
 * into this shape before persistence and display.
 */

import type { FontProtocol } from '$lib/domain/font/font.js';

export interface CanonicalPost {
	/** Deterministic ID derived from source (e.g., Nostr event ID, RSS guid, Atom entry ID) */
	id: string;

	/** The Font that produced this post */
	fontId: string;

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
