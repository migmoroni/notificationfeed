/**
 * JSON Feed ingestion client.
 *
 * Goes through the `HttpAdapter` (Tauri direct or web-proxy chain) to
 * fetch the feed document and `JSON.parse` it. Honors conditional GET
 * via the previous `FetcherState` (`If-None-Match`, `If-Modified-Since`):
 * a `304 Not Modified` short-circuits the parser and returns `posts: []`
 * while preserving the cache headers.
 *
 * Lenient parsing: malformed JSON or a missing `items` array yields
 * `posts: []` (and still updates cache headers) rather than throwing,
 * matching the RSS client's handling of XML parse errors.
 */

import type { FontJsonfeedConfig } from '$lib/domain/content-tree/content-tree.js';
import type { ProtocolFetcherState } from '$lib/domain/ingestion/fetcher-state.js';
import type { IngestedPost } from '$lib/persistence/post.store.js';
import {
	normalizeJsonfeedItem,
	type JsonfeedAttachment,
	type JsonfeedDocument,
	type JsonfeedItem
} from '$lib/normalization/jsonfeed.normalizer.js';
import { isLikelyImageUrl, pickFirstImageUrl } from '$lib/ingestion/media/image-capture.js';
import { isLikelyVideoUrl, pickFirstVideoUrl } from '$lib/ingestion/media/video-capture.js';
import { isLikelyAudioUrl, pickFirstAudioUrl } from '$lib/ingestion/media/audio-capture.js';
import type { HttpAdapter } from '$lib/ingestion/net/index.js';

export interface FetchResult {
	posts: IngestedPost[];
	nextState: Pick<ProtocolFetcherState, 'etag' | 'lastModified' | 'lastFetchedAt' | 'lastSuccessAt'>;
}

/**
 * Fetch a single JSON Feed and return the normalized posts.
 */
export async function fetchJsonfeedFeed(
	http: HttpAdapter,
	config: FontJsonfeedConfig,
	nodeId: string,
	prev: ProtocolFetcherState | null
): Promise<FetchResult> {
	const now = Date.now();
	const response = await http.fetchText(config.url, {
		feedKind: 'jsonfeed',
		etag: prev?.etag ?? null,
		lastModified: prev?.lastModified ?? null
	});

	if (response.status === 304) {
		return {
			posts: [],
			nextState: {
				etag: response.etag ?? prev?.etag ?? null,
				lastModified: response.lastModified ?? prev?.lastModified ?? null,
				lastFetchedAt: now,
				lastSuccessAt: now
			}
		};
	}

	const items = parseJsonfeedBody(response.body).map(enrichProtocolMediaHints);
	const posts = items.map((item) => normalizeJsonfeedItem(item, nodeId));

	return {
		posts,
		nextState: {
			etag: response.etag,
			lastModified: response.lastModified,
			lastFetchedAt: now,
			lastSuccessAt: now
		}
	};
}

/**
 * Parse a JSON Feed document body. Returns `[]` on JSON syntax errors,
 * non-object roots, or a missing/non-array `items` field.
 */
function parseJsonfeedBody(body: string): JsonfeedItem[] {
	let doc: unknown;
	try {
		doc = JSON.parse(body);
	} catch {
		return [];
	}
	if (!doc || typeof doc !== 'object') return [];
	const items = (doc as JsonfeedDocument).items;
	if (!Array.isArray(items)) return [];
	return items;
}

function pickAttachmentImage(attachments: JsonfeedAttachment[] | undefined): string | undefined {
	if (!attachments || attachments.length === 0) return undefined;
	for (const attachment of attachments) {
		const mimeType = attachment.mime_type?.toLowerCase();
		if (mimeType?.startsWith('image/')) {
			const image = pickFirstImageUrl(attachment.url);
			if (image) return image;
			continue;
		}
		if (attachment.url && isLikelyImageUrl(attachment.url)) {
			const image = pickFirstImageUrl(attachment.url);
			if (image) return image;
		}
	}
	return undefined;
}

function pickAttachmentVideo(attachments: JsonfeedAttachment[] | undefined): string | undefined {
	if (!attachments || attachments.length === 0) return undefined;
	for (const attachment of attachments) {
		const mimeType = attachment.mime_type?.toLowerCase();
		if (mimeType?.startsWith('video/')) {
			const video = pickFirstVideoUrl(attachment.url);
			if (video) return video;
			continue;
		}
		if (attachment.url && isLikelyVideoUrl(attachment.url)) {
			const video = pickFirstVideoUrl(attachment.url);
			if (video) return video;
		}
	}
	return undefined;
}

function pickAttachmentAudio(attachments: JsonfeedAttachment[] | undefined): string | undefined {
	if (!attachments || attachments.length === 0) return undefined;
	for (const attachment of attachments) {
		const mimeType = attachment.mime_type?.toLowerCase();
		if (mimeType?.startsWith('audio/')) {
			const audio = pickFirstAudioUrl(attachment.url);
			if (audio) return audio;
			continue;
		}
		if (attachment.url && isLikelyAudioUrl(attachment.url)) {
			const audio = pickFirstAudioUrl(attachment.url);
			if (audio) return audio;
		}
	}
	return undefined;
}

/**
 * Capture JSON Feed-specific media hints so the normalizer can stay
 * focused on canonicalization and generic content fallback extraction.
 */
function enrichProtocolMediaHints(item: JsonfeedItem): JsonfeedItem {
	const imageUrl = pickFirstImageUrl(
		item.imageUrl,
		item.image,
		item.banner_image,
		pickAttachmentImage(item.attachments)
	);
	const videoUrl = pickFirstVideoUrl(
		item.videoUrl,
		item.video,
		pickAttachmentVideo(item.attachments)
	);
	const audioUrl = pickFirstAudioUrl(
		item.audioUrl,
		item.audio,
		pickAttachmentAudio(item.attachments)
	);

	return {
		...item,
		...(imageUrl ? { imageUrl } : {}),
		...(videoUrl ? { videoUrl } : {}),
		...(audioUrl ? { audioUrl } : {})
	};
}
