/**
 * JSON Feed normalizer.
 *
 * Supports JSON Feed v1.0 and v1.1 (https://www.jsonfeed.org/version/1.1/).
 * Like the RSS/Atom normalizers, the result is `userId`-less — the
 * PostManager assigns ownership at insert time.
 */

import type { IngestedPost } from '$lib/persistence/post.store.js';

/** v1.1 author shape (also reused as v1 single-author fallback). */
export interface JsonfeedAuthor {
	name?: string;
	url?: string;
	avatar?: string;
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
	const title = item.title ?? '';
	const content = item.content_html ?? item.content_text ?? item.summary ?? '';

	const authorName =
		(item.authors && item.authors.length > 0 ? item.authors[0]?.name : undefined) ??
		item.author?.name ??
		'';

	const dateRaw = item.date_published ?? item.date_modified ?? '';
	const parsed = dateRaw ? Date.parse(dateRaw) : NaN;
	const publishedAt = Number.isFinite(parsed) ? parsed : now;

	return {
		id,
		nodeId,
		protocol: 'jsonfeed',
		title,
		content,
		url,
		author: authorName,
		publishedAt,
		ingestedAt: now
	};
}
