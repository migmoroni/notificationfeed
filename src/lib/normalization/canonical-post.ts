/**
 * Canonical Post — normalized, protocol-agnostic post representation.
 *
 * The nodeId references a TreeNode with role='font', using composite format `treeId:localUuid`.
 *
 * Posts are duplicated **per user** (each user has their own "box"), so the
 * primary identity of a post in the DB is the triple `(userId, nodeId, id)`.
 * Read/saved/trashed flags are per-box.
 *
 * All timestamps are epoch milliseconds (number) for IndexedDB-friendly indexing.
 */

import type { FontProtocol } from '$lib/domain/content-tree/content-tree.js';

export interface CanonicalPost {
	/** Owner of this box. */
	userId: string;

	/** The content node (role='font') that produced this post. */
	nodeId: string;

	/** Deterministic ID derived from source (e.g., Nostr event ID, RSS guid, Atom entry ID). */
	id: string;

	/** Origin protocol. */
	protocol: FontProtocol;

	/** Post title (may be empty for Nostr). */
	title: string;

	/** Main text content, normalized to plain text for previews and notifications. */
	content: string;

	/** Link to the original source. */
	url: string;

	/** Author name or pubkey. */
	author: string;

	/** Publication timestamp (epoch ms). */
	publishedAt: number;

	/** When this post was ingested locally (epoch ms). */
	ingestedAt: number;

	/** URL to a thumbnail or main image associated with the post. */
	imageUrl?: string;

	/** URL to a primary video associated with the post. */
	videoUrl?: string;

	/** URL to a primary audio associated with the post. */
	audioUrl?: string;

	/** Whether the user has read this post. */
	read: boolean;

	/** When the user saved this post (epoch ms), or null. Saved posts never auto-trash. */
	savedAt: number | null;

	/** When the post was sent to trash (epoch ms), or null. */
	trashedAt: number | null;

	/**
	 * When the notification engine fired a notification covering this
	 * post (epoch ms), or null when not yet processed. Marks the post
	 * as “seen by the pipeline” so subsequent ticks ignore it.
	 */
	notifiedAt: number | null;
}
