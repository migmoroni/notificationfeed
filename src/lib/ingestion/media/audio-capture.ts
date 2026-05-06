const URL_RE = /\b(?:https?:\/\/|ipfs:\/\/|ipns:\/\/)[^\s<>"'\])]+/gi;
const AUDIO_EXT_RE = /\.(?:mp3|m4a|aac|flac|wav|oga|ogg|opus|weba)$/i;
const AUDIO_QUERY_VALUE_RE = /(?:^|\b)(?:audio\/|mp3|m4a|aac|flac|wav|ogg|oga|opus|weba)(?:$|\b)/i;
const AUDIO_PATH_HINT_RE = /\/(?:audio|podcast|podcasts|episode|episodes|track|tracks|song|songs|music|listen|playlist|playlists)\b/i;
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

function isKnownAudioHost(hostname: string): boolean {
	const host = hostname.toLowerCase();
	return (
		host === 'spotify.com' ||
		host.endsWith('.spotify.com') ||
		host === 'soundcloud.com' ||
		host.endsWith('.soundcloud.com') ||
		host === 'on.soundcloud.com' ||
		host.endsWith('.on.soundcloud.com')
	);
}

function attrOfTag(tag: string, attr: string): string | undefined {
	const attrRegex = new RegExp(`${attr}\\s*=\\s*(?:\"([^\"]+)\"|'([^']+)'|([^\\s>]+))`, 'i');
	const match = tag.match(attrRegex);
	return match?.[1] ?? match?.[2] ?? match?.[3] ?? undefined;
}

function hasAudioQuerySignal(parsed: URL): boolean {
	const queryFields = ['format', 'fm', 'f', 'mime', 'type'];
	for (const field of queryFields) {
		const value = parsed.searchParams.get(field);
		if (!value) continue;
		if (AUDIO_QUERY_VALUE_RE.test(value)) return true;
	}

	return false;
}

/**
 * Returns true only when the URL itself looks like a direct audio asset.
 */
export function isLikelyDirectAudioAssetUrl(url: string | null | undefined): boolean {
	const normalized = normalizeUrlCandidate(url);
	if (!normalized) return false;

	let parsed: URL;
	try {
		parsed = new URL(normalized);
	} catch {
		return false;
	}

	if (AUDIO_EXT_RE.test(parsed.pathname)) return true;
	if (hasAudioQuerySignal(parsed)) return true;

	return false;
}

/**
 * Returns true when a URL is likely an audio resource or a known audio page.
 */
export function isLikelyAudioUrl(url: string | null | undefined): boolean {
	const normalized = normalizeUrlCandidate(url);
	if (!normalized) return false;

	let parsed: URL;
	try {
		parsed = new URL(normalized);
	} catch {
		return false;
	}

	if (isLikelyDirectAudioAssetUrl(normalized)) return true;
	if (isKnownAudioHost(parsed.hostname)) return true;
	if (AUDIO_PATH_HINT_RE.test(parsed.pathname)) return true;

	if (
		parsed.searchParams.has('audio') ||
		parsed.searchParams.has('track') ||
		parsed.searchParams.has('episode')
	) {
		return true;
	}

	return false;
}

/**
 * Pick the first valid URL from explicit audio candidates.
 */
export function pickFirstAudioUrl(...candidates: Array<string | null | undefined>): string | undefined {
	for (const candidate of candidates) {
		const normalized = normalizeUrlCandidate(candidate);
		if (normalized) return normalized;
	}
	return undefined;
}

/**
 * Extract the first audio URL from HTML markup.
 */
export function extractFirstAudioUrlFromHtml(html: string | null | undefined): string | undefined {
	if (!html) return undefined;

	const srcRegex = /<(?:audio|source|iframe)\b[^>]*\b(?:src|data-src)\s*=\s*(?:\"([^\"]+)\"|'([^']+)'|([^\s>]+))/gi;
	for (const match of html.matchAll(srcRegex)) {
		const src = match[1] ?? match[2] ?? match[3] ?? '';
		const normalized = normalizeUrlCandidate(src);
		if (!normalized) continue;
		if (isLikelyAudioUrl(normalized)) return normalized;
	}

	const sourceTagRegex = /<source\b[^>]*>/gi;
	for (const match of html.matchAll(sourceTagRegex)) {
		const tag = match[0];
		const src = attrOfTag(tag, 'src') ?? attrOfTag(tag, 'data-src');
		const normalized = normalizeUrlCandidate(src);
		if (!normalized) continue;
		const type = (attrOfTag(tag, 'type') ?? '').toLowerCase();
		if (type.startsWith('audio/')) return normalized;
		if (isLikelyAudioUrl(normalized)) return normalized;
	}

	const hrefRegex = /<a\b[^>]*\bhref\s*=\s*(?:\"([^\"]+)\"|'([^']+)'|([^\s>]+))/gi;
	for (const match of html.matchAll(hrefRegex)) {
		const href = match[1] ?? match[2] ?? match[3] ?? '';
		const normalized = normalizeUrlCandidate(href);
		if (!normalized) continue;
		if (isLikelyAudioUrl(normalized)) return normalized;
	}

	return undefined;
}

/**
 * Extract the first URL that looks like audio from plain text.
 */
export function extractFirstAudioUrlFromText(text: string | null | undefined): string | undefined {
	if (!text) return undefined;

	for (const match of text.matchAll(URL_RE)) {
		const url = match[0];
		if (isLikelyAudioUrl(url)) {
			return normalizeUrlCandidate(url);
		}
	}

	return undefined;
}

/**
 * Extract audio URLs from structured Nostr tags (`audio`, `imeta`, etc).
 */
export function extractAudioUrlFromNostrTags(tags: string[][] | null | undefined): string | undefined {
	if (!tags || tags.length === 0) return undefined;

	for (const tag of tags) {
		if (!tag || tag.length < 2) continue;
		const kind = tag[0]?.toLowerCase() ?? '';

		if (kind === 'audio' || kind === 'song' || kind === 'music' || kind === 'podcast' || kind === 'track') {
			const direct = pickFirstAudioUrl(tag[1]);
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
				} else if (lower.startsWith('audio ')) {
					urlCandidate = trimmed.slice(6).trim();
				} else if (lower.startsWith('m ')) {
					mimeType = trimmed.slice(2).trim().toLowerCase();
				}
			}

			if (urlCandidate) {
				if (mimeType?.startsWith('audio/')) {
					const normalized = pickFirstAudioUrl(urlCandidate);
					if (normalized) return normalized;
				}
				if (isLikelyAudioUrl(urlCandidate)) {
					const normalized = pickFirstAudioUrl(urlCandidate);
					if (normalized) return normalized;
				}
			}
		}

		if (kind === 'url' || kind === 'u' || kind === 'r') {
			if (isLikelyAudioUrl(tag[1])) {
				const normalized = pickFirstAudioUrl(tag[1]);
				if (normalized) return normalized;
			}
		}
	}

	return undefined;
}
