const URL_RE = /\b(?:https?:\/\/|ipfs:\/\/|ipns:\/\/)[^\s<>"'\])]+/gi;
const VIDEO_EXT_RE = /\.(?:mp4|webm|ogg|ogv|mov|m4v|m3u8|mpd)$/i;
const VIDEO_QUERY_VALUE_RE = /(?:^|\b)(?:video\/|mp4|webm|ogg|mov|m4v|m3u8|mpd)(?:$|\b)/i;
const VIDEO_PATH_HINT_RE = /\/(?:video|videos|watch|embed|player|clip|clips|stream|streams|shorts|reel|reels)\b/i;
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

function isKnownVideoHost(hostname: string): boolean {
	const host = hostname.toLowerCase();
	return (
		host === 'youtube.com' ||
		host.endsWith('.youtube.com') ||
		host === 'youtu.be' ||
		host.endsWith('.youtu.be') ||
		host === 'x.com' ||
		host.endsWith('.x.com') ||
		host === 'twitter.com' ||
		host.endsWith('.twitter.com') ||
		host === 'dai.ly' ||
		host.endsWith('.dai.ly') ||
		host === 'vimeo.com' ||
		host.endsWith('.vimeo.com') ||
		host === 'dailymotion.com' ||
		host.endsWith('.dailymotion.com') ||
		host === 'odysee.com' ||
		host.endsWith('.odysee.com') ||
		host === 'twitch.tv' ||
		host.endsWith('.twitch.tv') ||
		host === 'streamable.com' ||
		host.endsWith('.streamable.com')
	);
}

function attrOfTag(tag: string, attr: string): string | undefined {
	const attrRegex = new RegExp(`${attr}\\s*=\\s*(?:\"([^\"]+)\"|'([^']+)'|([^\\s>]+))`, 'i');
	const match = tag.match(attrRegex);
	return match?.[1] ?? match?.[2] ?? match?.[3] ?? undefined;
}

function hasVideoQuerySignal(parsed: URL): boolean {
	const queryFields = ['format', 'fm', 'f', 'mime', 'type'];
	for (const field of queryFields) {
		const value = parsed.searchParams.get(field);
		if (!value) continue;
		if (VIDEO_QUERY_VALUE_RE.test(value)) return true;
	}

	return false;
}

function isInternetArchiveVideoPage(parsed: URL): boolean {
	const host = parsed.hostname.toLowerCase();
	if (host !== 'archive.org' && host !== 'www.archive.org') return false;

	const segments = parsed.pathname.split('/').filter(Boolean);
	if (segments.length < 2) return false;

	const route = segments[0]?.toLowerCase();
	if (route !== 'details' && route !== 'embed') return false;

	return segments[1].trim().length > 0;
}

/**
 * Returns true only when the URL itself looks like a direct video asset.
 * This intentionally excludes generic page URLs such as /news/videos/... .
 */
export function isLikelyDirectVideoAssetUrl(url: string | null | undefined): boolean {
	const normalized = normalizeUrlCandidate(url);
	if (!normalized) return false;

	let parsed: URL;
	try {
		parsed = new URL(normalized);
	} catch {
		return false;
	}

	if (VIDEO_EXT_RE.test(parsed.pathname)) return true;
	if (hasVideoQuerySignal(parsed)) return true;

	return false;
}

/**
 * Returns true when a URL is likely a video resource or a known video page.
 */
export function isLikelyVideoUrl(url: string | null | undefined): boolean {
	const normalized = normalizeUrlCandidate(url);
	if (!normalized) return false;

	let parsed: URL;
	try {
		parsed = new URL(normalized);
	} catch {
		return false;
	}

	if (isLikelyDirectVideoAssetUrl(normalized)) return true;
	if (isKnownVideoHost(parsed.hostname)) return true;
	if (isInternetArchiveVideoPage(parsed)) return true;
	if (VIDEO_PATH_HINT_RE.test(parsed.pathname)) return true;

	if (parsed.searchParams.has('v') || parsed.searchParams.has('video')) {
		return true;
	}

	return false;
}

/**
 * Pick the first valid URL from explicit video candidates.
 */
export function pickFirstVideoUrl(...candidates: Array<string | null | undefined>): string | undefined {
	for (const candidate of candidates) {
		const normalized = normalizeUrlCandidate(candidate);
		if (normalized) return normalized;
	}
	return undefined;
}

/**
 * Extract the first video URL from HTML markup.
 */
export function extractFirstVideoUrlFromHtml(html: string | null | undefined): string | undefined {
	if (!html) return undefined;

	const srcRegex = /<(?:video|source|iframe)\b[^>]*\b(?:src|data-src)\s*=\s*(?:\"([^\"]+)\"|'([^']+)'|([^\s>]+))/gi;
	for (const match of html.matchAll(srcRegex)) {
		const src = match[1] ?? match[2] ?? match[3] ?? '';
		const normalized = normalizeUrlCandidate(src);
		if (!normalized) continue;
		if (isLikelyVideoUrl(normalized)) return normalized;
	}

	const sourceTagRegex = /<source\b[^>]*>/gi;
	for (const match of html.matchAll(sourceTagRegex)) {
		const tag = match[0];
		const src = attrOfTag(tag, 'src') ?? attrOfTag(tag, 'data-src');
		const normalized = normalizeUrlCandidate(src);
		if (!normalized) continue;
		const type = (attrOfTag(tag, 'type') ?? '').toLowerCase();
		if (type.startsWith('video/')) return normalized;
		if (isLikelyVideoUrl(normalized)) return normalized;
	}

	const hrefRegex = /<a\b[^>]*\bhref\s*=\s*(?:\"([^\"]+)\"|'([^']+)'|([^\s>]+))/gi;
	for (const match of html.matchAll(hrefRegex)) {
		const href = match[1] ?? match[2] ?? match[3] ?? '';
		const normalized = normalizeUrlCandidate(href);
		if (!normalized) continue;
		if (isLikelyVideoUrl(normalized)) return normalized;
	}

	return undefined;
}

/**
 * Extract the first URL that looks like a video from plain text.
 */
export function extractFirstVideoUrlFromText(text: string | null | undefined): string | undefined {
	if (!text) return undefined;

	for (const match of text.matchAll(URL_RE)) {
		const url = match[0];
		if (isLikelyVideoUrl(url)) {
			return normalizeUrlCandidate(url);
		}
	}

	return undefined;
}

/**
 * Extract video URLs from structured Nostr tags (`video`, `imeta`, etc).
 */
export function extractVideoUrlFromNostrTags(tags: string[][] | null | undefined): string | undefined {
	if (!tags || tags.length === 0) return undefined;

	for (const tag of tags) {
		if (!tag || tag.length < 2) continue;
		const kind = tag[0]?.toLowerCase() ?? '';

		if (kind === 'video' || kind === 'vid' || kind === 'movie' || kind === 'stream') {
			const direct = pickFirstVideoUrl(tag[1]);
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
				} else if (lower.startsWith('video ')) {
					urlCandidate = trimmed.slice(6).trim();
				} else if (lower.startsWith('m ')) {
					mimeType = trimmed.slice(2).trim().toLowerCase();
				}
			}

			if (urlCandidate) {
				if (mimeType?.startsWith('video/')) {
					const normalized = pickFirstVideoUrl(urlCandidate);
					if (normalized) return normalized;
				}
				if (isLikelyVideoUrl(urlCandidate)) {
					const normalized = pickFirstVideoUrl(urlCandidate);
					if (normalized) return normalized;
				}
			}
		}

		if (kind === 'url' || kind === 'u' || kind === 'r') {
			if (isLikelyVideoUrl(tag[1])) {
				const normalized = pickFirstVideoUrl(tag[1]);
				if (normalized) return normalized;
			}
		}
	}

	return undefined;
}
