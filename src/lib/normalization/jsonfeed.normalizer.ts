/**
 * JSON Feed normalizer.
 *
 * Supports JSON Feed v1.0 and v1.1 (https://www.jsonfeed.org/version/1.1/).
 * Like the RSS/Atom normalizers, the result is `userId`-less — the
 * PostManager assigns ownership at insert time.
 */

import type { IngestedPost } from '$lib/persistence/post.store.js';
import {
	extractFirstImageUrlFromHtml,
	extractFirstImageUrlFromText,
	pickFirstImageUrl
} from '$lib/ingestion/media/image-capture.js';
import {
	extractFirstVideoUrlFromHtml,
	extractFirstVideoUrlFromText,
	pickFirstVideoUrl
} from '$lib/ingestion/media/video-capture.js';
import { resolveIngestionImageUrl } from '$lib/ingestion/media/image-quality.js';
import { resolveIngestionVideoUrl } from '$lib/ingestion/media/video-quality.js';
import { htmlToPlainText } from './content-text.js';

/** v1.1 author shape (also reused as v1 single-author fallback). */
export interface JsonfeedAuthor {
	name?: string;
	url?: string;
	avatar?: string;
}

export interface JsonfeedAttachment {
	url?: string;
	mime_type?: string;
	title?: string;
	size_in_bytes?: number;
	duration_in_seconds?: number;
}

/** Single item from a JSON Feed document (subset relevant to ingestion). */
export interface JsonfeedItem {
	id?: string;
	url?: string;
	external_url?: string;
	title?: string;
	content_html?: string;
	content_text?: string;
	summary?: string;
	date_published?: string;
	date_modified?: string;
	/** v1.1 */
	authors?: JsonfeedAuthor[];
	/** v1 (single author) */
	author?: JsonfeedAuthor;
	/** Optional item-level image (v1.1). */
	image?: string;
	/** Optional item-level video URL (common extension). */
	video?: string;
	/** Legacy field from some generators. */
	banner_image?: string;
	attachments?: JsonfeedAttachment[];
	/** Protocol-specific media hints captured in the JSON Feed client. */
	imageUrl?: string;
	videoUrl?: string;
}

/** Top-level document shape (only the field we consume). */
export interface JsonfeedDocument {
	version?: string;
	items?: JsonfeedItem[];
}

/**
 * Convert a JSON Feed item into an `IngestedPost`.
 *
 * Identity rules:
 *  - `item.id` is required by the spec; fall back to `item.url` so a
 *    malformed feed still yields a stable key.
 *
 * Content precedence: `content_html` → `content_text` → `summary` → ''.
 *
 * Author: v1.1 `authors[0].name` first, then v1 `author.name`.
 *
 * Dates: prefer `date_published`; fall back to `date_modified`; on
 * invalid/missing values use "now" so the post still surfaces in order.
 */
export function normalizeJsonfeedItem(item: JsonfeedItem, nodeId: string): IngestedPost {
	const now = Date.now();

	const id = item.id ?? item.url ?? '';
	const url = item.url ?? item.external_url ?? '';
	const title = htmlToPlainText(item.title ?? '');
	const content = htmlToPlainText(item.content_html ?? item.content_text ?? item.summary ?? '');

	const authorName =
		(item.authors && item.authors.length > 0 ? item.authors[0]?.name : undefined) ??
		item.author?.name ??
		'';

	const dateRaw = item.date_published ?? item.date_modified ?? '';
	const parsed = dateRaw ? Date.parse(dateRaw) : NaN;
	const publishedAt = Number.isFinite(parsed) ? parsed : now;
	const imageUrl = pickFirstImageUrl(
		item.imageUrl,
		extractFirstImageUrlFromHtml(item.content_html),
		extractFirstImageUrlFromText(item.content_text),
		extractFirstImageUrlFromHtml(item.summary),
		extractFirstImageUrlFromText(item.summary)
	);
	const resolvedImageUrl = resolveIngestionImageUrl(imageUrl);
	const videoUrl = pickFirstVideoUrl(
		item.videoUrl,
		extractFirstVideoUrlFromHtml(item.content_html),
		extractFirstVideoUrlFromText(item.content_text),
		extractFirstVideoUrlFromHtml(item.summary),
		extractFirstVideoUrlFromText(item.summary)
	);
	const resolvedVideoUrl = resolveIngestionVideoUrl(videoUrl);

	return {
		id,
		nodeId,
		protocol: 'jsonfeed',
		title,
		content,
		url,
		author: htmlToPlainText(authorName),
		publishedAt,
		ingestedAt: now,
		...(resolvedImageUrl ? { imageUrl: resolvedImageUrl } : {}),
		...(resolvedVideoUrl ? { videoUrl: resolvedVideoUrl } : {})
	};
}
