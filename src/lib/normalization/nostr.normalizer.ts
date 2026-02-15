/**
 * Nostr normalizer.
 *
 * Transforms a raw Nostr event into a CanonicalPost.
 */

import type { NostrEvent } from '$lib/ingestion/nostr/nostr.client.js';
import type { CanonicalPost } from './canonical-post.js';

export function normalizeNostrEvent(event: NostrEvent, fontId: string): CanonicalPost {
	return {
		id: event.id,
		fontId,
		protocol: 'nostr',
		title: '',
		content: event.content,
		url: `nostr:${event.id}`,
		author: event.pubkey,
		publishedAt: new Date(event.created_at * 1000),
		ingestedAt: new Date(),
		read: false
	};
}
