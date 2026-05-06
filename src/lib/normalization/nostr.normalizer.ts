/**
 * Nostr normalizer (Plano B).
 */

import type { NostrEvent } from '$lib/ingestion/nostr/nostr.client.js';
import type { IngestedPost } from '$lib/persistence/post.store.js';
import {
	extractFirstImageUrlFromText,
	pickFirstImageUrl
} from '$lib/ingestion/media/image-capture.js';
import {
	extractFirstVideoUrlFromText,
	pickFirstVideoUrl
} from '$lib/ingestion/media/video-capture.js';
import {
	extractFirstAudioUrlFromText,
	pickFirstAudioUrl
} from '$lib/ingestion/media/audio-capture.js';
import { resolveIngestionImageUrl } from '$lib/ingestion/media/image-quality.js';
import { resolveIngestionVideoUrl } from '$lib/ingestion/media/video-quality.js';
import { resolveIngestionAudioUrl } from '$lib/ingestion/media/audio-quality.js';

/**
 * Convert a Nostr event into an `IngestedPost`.
 *
 * Nostr-specific mappings:
 *  - `event.id` (32-byte hex) becomes the post id directly — it's
 *    already globally unique and content-addressed.
 *  - There is no Nostr equivalent of an HTML title for kind-1 notes,
 *    so `title` is left empty; the UI renders the content body as
 *    headline when title is blank.
 *  - `url` uses the `nostr:` URI scheme (NIP-21) so external clients
 *    can resolve the event.
 *  - `event.created_at` is in seconds (Nostr convention); we multiply
 *    by 1000 to align with the rest of the codebase's epoch-ms basis.
 *
 * Like the other normalizers, no `userId` is assigned here — the
 * PostManager fans the post out to each interested user's box.
 */
export function normalizeNostrEvent(event: NostrEvent, nodeId: string): IngestedPost {
	const imageUrl = pickFirstImageUrl(
		event.imageUrl,
		extractFirstImageUrlFromText(event.content)
	);
	const resolvedImageUrl = resolveIngestionImageUrl(imageUrl);
	const videoUrl = pickFirstVideoUrl(
		event.videoUrl,
		extractFirstVideoUrlFromText(event.content)
	);
	const resolvedVideoUrl = resolveIngestionVideoUrl(videoUrl);
	const audioUrl = pickFirstAudioUrl(
		event.audioUrl,
		extractFirstAudioUrlFromText(event.content)
	);
	const resolvedAudioUrl = resolveIngestionAudioUrl(audioUrl);

	return {
		id: event.id,
		nodeId,
		protocol: 'nostr',
		title: '',
		content: event.content,
		url: `nostr:${event.id}`,
		author: event.pubkey,
		publishedAt: event.created_at * 1000,
		ingestedAt: Date.now(),
		...(resolvedImageUrl ? { imageUrl: resolvedImageUrl } : {}),
		...(resolvedVideoUrl ? { videoUrl: resolvedVideoUrl } : {}),
		...(resolvedAudioUrl ? { audioUrl: resolvedAudioUrl } : {})
	};
}
