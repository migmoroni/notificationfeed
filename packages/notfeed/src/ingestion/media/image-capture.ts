const URL_RE = /\b(?:https?:\/\/|ipfs:\/\/|ipns:\/\/)[^\s<>"'\])]+/gi;
const IMAGE_EXT_RE = /\.(?:avif|webp|png|jpe?g|gif|bmp|svg|tiff?|heic|heif|apng)$/i;
const VIDEO_EXT_RE = /\.(?:mp4|webm|ogg|ogv|mov|m4v|m3u8|mpd)$/i;
const IMAGE_QUERY_VALUE_RE = /(?:^|\b)(?:image\/|avif|webp|png|jpe?g|gif|bmp|svg|tiff?|heic|heif|apng)(?:$|\b)/i;
const VIDEO_QUERY_VALUE_RE = /(?:^|\b)(?:video\/|mp4|webm|ogg|ogv|mov|m4v|m3u8|mpd)(?:$|\b)/i;
const IMAGE_PATH_HINT_RE = /\/(?:img|image|images|photo|photos|thumb|thumbnail|media)\b/i;
const SUPPORTED_PROTOCOLS = new Set(['http:', 'https:', 'ipfs:', 'ipns:']);

function trimUrlPunctuation(value: string): string {
	return value.replace(/^["'(<\[]+/, '').replace(/["')>\].,!?;:]+$/, '');
}

function normalizeUrlCandidate(value: string | null | undefined): string | undefined {
	const raw = value?.trim();
	if (!raw) return undefined;
	const candidate = trimUrlPunctuation(raw);
	if (!candidate) return undefined;

	let parsed: URL;
	try {
		parsed = new URL(candidate);
	} catch {
		return undefined;
	}

	if (!SUPPORTED_PROTOCOLS.has(parsed.protocol)) return undefined;
	return parsed.toString();
}

function extractFromSrcset(srcset: string): string | undefined {
	const first = srcset
		.split(',')
		.map((part) => part.trim())
		.find(Boolean);
	if (!first) return undefined;
	const [url] = first.split(/\s+/, 1);
	return normalizeUrlCandidate(url);
}

/**
 * Returns true when a URL is likely an image resource.
 */
export function isLikelyImageUrl(url: string | null | undefined): boolean {
	const normalized = normalizeUrlCandidate(url);
	if (!normalized) return false;

	let parsed: URL;
	try {
		parsed = new URL(normalized);
	} catch {
		return false;
	}

	if (VIDEO_EXT_RE.test(parsed.pathname)) return false;
	if (IMAGE_EXT_RE.test(parsed.pathname)) return true;
	if (IMAGE_PATH_HINT_RE.test(parsed.pathname)) return true;

	const queryFields = ['format', 'fm', 'f', 'mime', 'type'];
	for (const field of queryFields) {
		const value = parsed.searchParams.get(field);
		if (!value) continue;
		if (VIDEO_QUERY_VALUE_RE.test(value)) return false;
		if (IMAGE_QUERY_VALUE_RE.test(value)) return true;
	}

	return false;
}

/**
 * Pick the first valid URL from explicit image candidates.
 */
export function pickFirstImageUrl(...candidates: Array<string | null | undefined>): string | undefined {
	for (const candidate of candidates) {
		const normalized = normalizeUrlCandidate(candidate);
		if (normalized) return normalized;
	}
	return undefined;
}

/**
 * Extract the first image URL from HTML markup (`img/src` or `srcset`).
 */
export function extractFirstImageUrlFromHtml(html: string | null | undefined): string | undefined {
	if (!html) return undefined;

	const srcRegex = /<(?:img|source)\b[^>]*\b(?:src|data-src)\s*=\s*(?:"([^"]+)"|'([^']+)'|([^\s>]+))/gi;
	for (const match of html.matchAll(srcRegex)) {
		const src = match[1] ?? match[2] ?? match[3] ?? '';
		if (!src || src.toLowerCase().startsWith('data:')) continue;
		const normalized = normalizeUrlCandidate(src);
		if (normalized) return normalized;
	}

	const srcsetRegex = /<(?:img|source)\b[^>]*\bsrcset\s*=\s*(?:"([^"]+)"|'([^']+)'|([^\s>]+))/gi;
	for (const match of html.matchAll(srcsetRegex)) {
		const srcset = match[1] ?? match[2] ?? match[3] ?? '';
		const candidate = extractFromSrcset(srcset);
		if (candidate) return candidate;
	}

	return undefined;
}

/**
 * Extract the first URL that looks like an image from plain text.
 */
export function extractFirstImageUrlFromText(text: string | null | undefined): string | undefined {
	if (!text) return undefined;

	for (const match of text.matchAll(URL_RE)) {
		const url = match[0];
		if (isLikelyImageUrl(url)) {
			return normalizeUrlCandidate(url);
		}
	}

	return undefined;
}

/**
 * Extract image URLs from structured Nostr tags (`image`, `thumb`, `imeta`).
 */
export function extractImageUrlFromNostrTags(tags: string[][] | null | undefined): string | undefined {
	if (!tags || tags.length === 0) return undefined;

	for (const tag of tags) {
		if (!tag || tag.length < 2) continue;
		const kind = tag[0]?.toLowerCase() ?? '';

		if (kind === 'image' || kind === 'img' || kind === 'thumb' || kind === 'thumbnail' || kind === 'photo') {
			const direct = normalizeUrlCandidate(tag[1]);
			if (direct) return direct;
		}

		if (kind === 'imeta') {
			let urlCandidate: string | undefined;
			let mimeType: string | undefined;

			for (const meta of tag.slice(1)) {
				const trimmed = meta.trim();
				const lower = trimmed.toLowerCase();
				if (lower.startsWith('url ')) {
					urlCandidate = trimmed.slice(4).trim();
				} else if (lower.startsWith('image ')) {
					urlCandidate = trimmed.slice(6).trim();
				} else if (lower.startsWith('m ')) {
					mimeType = trimmed.slice(2).trim().toLowerCase();
				}
			}

			if (urlCandidate) {
				if (mimeType?.startsWith('image/')) {
					const normalized = normalizeUrlCandidate(urlCandidate);
					if (normalized) return normalized;
				}
				if (isLikelyImageUrl(urlCandidate)) {
					const normalized = normalizeUrlCandidate(urlCandidate);
					if (normalized) return normalized;
				}
			}
		}

		if (kind === 'url' || kind === 'u' || kind === 'r') {
			if (isLikelyImageUrl(tag[1])) {
				const normalized = normalizeUrlCandidate(tag[1]);
				if (normalized) return normalized;
			}
		}
	}

	return undefined;
}