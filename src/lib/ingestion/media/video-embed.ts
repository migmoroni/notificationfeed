import { isLikelyDirectVideoAssetUrl } from './video-capture.js';

export type EmbedInfo =
	| { type: 'iframe'; provider: string; embedUrl: string; aspectClass: string; thumbnailUrl?: string; videoId?: string }
	| { type: 'video'; provider: 'direct'; videoUrl: string; aspectClass: string }
	| null;

function parseVimeoId(url: string): string | null {
	const patterns = [
		/vimeo\.com\/(?:video\/)?(\d+)/i,
		/vimeo\.com\/channels\/[^/]+\/(\d+)/i,
		/vimeo\.com\/groups\/[^/]+\/videos\/(\d+)/i,
		/vimeo\.com\/album\/\d+\/video\/(\d+)/i,
		/player\.vimeo\.com\/video\/(\d+)/i
	];

	for (const pattern of patterns) {
		const match = url.match(pattern);
		if (match) return match[1];
	}

	return null;
}

function normalizeTwitchVideoId(raw: string | undefined): string | null {
	if (!raw) return null;
	const candidate = raw.trim().toLowerCase().replace(/^v/, '');
	if (!candidate) return null;
	return /^\d+$/.test(candidate) ? candidate : null;
}

function normalizeXStatusId(raw: string | undefined): string | null {
	if (!raw) return null;
	const candidate = raw.trim();
	if (!candidate) return null;
	return /^\d+$/.test(candidate) ? candidate : null;
}

function parseXStatusId(url: string): string | null {
	let parsed: URL;
	try {
		parsed = new URL(url);
	} catch {
		return null;
	}

	const host = parsed.hostname.toLowerCase();
	const isXHost = host === 'x.com' || host === 'www.x.com' || host === 'mobile.x.com' || host.endsWith('.x.com');
	const isTwitterHost =
		host === 'twitter.com' ||
		host === 'www.twitter.com' ||
		host === 'mobile.twitter.com' ||
		host.endsWith('.twitter.com');

	if (!isXHost && !isTwitterHost) return null;

	const segments = parsed.pathname.split('/').filter(Boolean);
	if (segments.length < 2) return null;

	const lowerSegments = segments.map((segment) => segment.toLowerCase());
	const statusIndex = lowerSegments.indexOf('status');
	if (statusIndex >= 0) {
		return normalizeXStatusId(segments[statusIndex + 1]);
	}

	if (
		lowerSegments[0] === 'i' &&
		lowerSegments[1] === 'web' &&
		lowerSegments[2] === 'status'
	) {
		return normalizeXStatusId(segments[3]);
	}

	return null;
}

function normalizeTwitchClipId(raw: string | undefined): string | null {
	if (!raw) return null;
	const candidate = raw.trim();
	if (!candidate) return null;
	return /^[A-Za-z0-9_-]+$/.test(candidate) ? candidate : null;
}

type TwitchTarget =
	| { kind: 'video'; id: string }
	| { kind: 'clip'; id: string }
	| null;

function parseTwitchTarget(url: string): TwitchTarget {
	let parsed: URL;
	try {
		parsed = new URL(url);
	} catch {
		return null;
	}

	const host = parsed.hostname.toLowerCase();
	const segments = parsed.pathname.split('/').filter(Boolean);

	if (host === 'player.twitch.tv' || host.endsWith('.player.twitch.tv')) {
		const videoId = normalizeTwitchVideoId(parsed.searchParams.get('video') ?? undefined);
		if (videoId) return { kind: 'video', id: videoId };

		const clipId = normalizeTwitchClipId(parsed.searchParams.get('clip') ?? undefined);
		if (clipId) return { kind: 'clip', id: clipId };

		return null;
	}

	if (host === 'clips.twitch.tv' || host.endsWith('.clips.twitch.tv')) {
		if (segments[0]?.toLowerCase() === 'embed') {
			const clipId = normalizeTwitchClipId(parsed.searchParams.get('clip') ?? undefined);
			return clipId ? { kind: 'clip', id: clipId } : null;
		}

		const clipId = normalizeTwitchClipId(segments[0]);
		return clipId ? { kind: 'clip', id: clipId } : null;
	}

	if (host !== 'twitch.tv' && host !== 'www.twitch.tv' && host !== 'm.twitch.tv' && !host.endsWith('.twitch.tv')) {
		return null;
	}

	if (segments[0]?.toLowerCase() === 'videos') {
		const videoId = normalizeTwitchVideoId(segments[1]);
		return videoId ? { kind: 'video', id: videoId } : null;
	}

	if (segments.length >= 3 && segments[1]?.toLowerCase() === 'clip') {
		const clipId = normalizeTwitchClipId(segments[2]);
		return clipId ? { kind: 'clip', id: clipId } : null;
	}

	return null;
}

function normalizeDailymotionId(raw: string | undefined): string | null {
	if (!raw) return null;
	const candidate = raw.split('_')[0]?.trim().toLowerCase();
	if (!candidate) return null;
	return /^x[0-9a-z]+$/i.test(candidate) ? candidate : null;
}

function parseDailymotionId(url: string): string | null {
	let parsed: URL;
	try {
		parsed = new URL(url);
	} catch {
		return null;
	}

	const host = parsed.hostname.toLowerCase();
	const segments = parsed.pathname.split('/').filter(Boolean);
	if (segments.length === 0) return null;

	if (host === 'dai.ly' || host === 'www.dai.ly' || host.endsWith('.dai.ly')) {
		return normalizeDailymotionId(segments[0]);
	}

	if (host !== 'dailymotion.com' && host !== 'www.dailymotion.com' && !host.endsWith('.dailymotion.com')) {
		return null;
	}

	if (segments[0].toLowerCase() === 'video') {
		return normalizeDailymotionId(segments[1]);
	}

	if (
		segments[0].toLowerCase() === 'embed' &&
		segments[1]?.toLowerCase() === 'video'
	) {
		return normalizeDailymotionId(segments[2]);
	}

	return null;
}

function parseRumbleId(url: string): string | null {
	let parsed: URL;
	try {
		parsed = new URL(url);
	} catch {
		return null;
	}

	const host = parsed.hostname.toLowerCase();
	if (host !== 'rumble.com' && host !== 'www.rumble.com') return null;

	const segments = parsed.pathname.split('/').filter(Boolean);
	if (segments.length === 0) return null;

	if (segments[0].toLowerCase() === 'embed' && segments[1]) {
		const embedId = segments[1].replace(/[^a-z0-9]/gi, '').toLowerCase();
		return /^v[0-9a-z]+$/i.test(embedId) ? embedId : null;
	}

	const first = segments[0].replace(/\.html?$/i, '');
	const watchId = first.split('-')[0]?.toLowerCase() ?? '';
	return /^v[0-9a-z]+$/i.test(watchId) ? watchId : null;
}

function parseInternetArchiveIdentifier(url: string): string | null {
	let parsed: URL;
	try {
		parsed = new URL(url);
	} catch {
		return null;
	}

	const host = parsed.hostname.toLowerCase();
	if (host !== 'archive.org' && host !== 'www.archive.org') return null;

	const segments = parsed.pathname.split('/').filter(Boolean);
	if (segments.length < 2) return null;

	const route = segments[0].toLowerCase();
	if (route !== 'details' && route !== 'embed') return null;

	const rawIdentifier = segments[1]?.trim();
	if (!rawIdentifier) return null;

	let decodedIdentifier: string;
	try {
		decodedIdentifier = decodeURIComponent(rawIdentifier);
	} catch {
		decodedIdentifier = rawIdentifier;
	}

	const identifier = decodedIdentifier.trim();
	if (!identifier) return null;
	if (identifier.includes('/') || identifier.includes('?') || identifier.includes('#')) return null;

	return identifier;
}

function decodeUrlSegment(segment: string): string {
	try {
		return decodeURIComponent(segment);
	} catch {
		return segment;
	}
}

function encodeOdyseeSegment(segment: string): string {
	return encodeURIComponent(segment)
		.replace(/%3A/gi, ':')
		.replace(/%40/gi, '@');
}

function parseOdyseeClaimPath(url: string): string | null {
	let parsed: URL;
	try {
		parsed = new URL(url);
	} catch {
		return null;
	}

	const host = parsed.hostname.toLowerCase();
	if (host !== 'odysee.com' && host !== 'www.odysee.com' && !host.endsWith('.odysee.com')) {
		return null;
	}

	const segments = parsed.pathname.split('/').filter(Boolean);
	if (segments.length === 0) return null;

	let claimSegments = segments;
	if (segments[0] === '$') {
		if (segments[1]?.toLowerCase() !== 'embed') return null;
		claimSegments = segments.slice(2);
	}

	if (claimSegments.length === 0) return null;

	const normalizedSegments = claimSegments
		.map((segment) => decodeUrlSegment(segment).trim())
		.filter(Boolean);
	if (normalizedSegments.length === 0) return null;

	const lastSegment = normalizedSegments[normalizedSegments.length - 1];
	if (!/^[^/?#\s]+:[^/?#\s]+$/.test(lastSegment)) return null;

	const firstSegment = normalizedSegments[0];
	if (firstSegment.startsWith('@') && normalizedSegments.length < 2) return null;

	for (const segment of normalizedSegments) {
		if (segment.includes('/') || segment.includes('?') || segment.includes('#')) return null;
	}

	return normalizedSegments.map((segment) => encodeOdyseeSegment(segment)).join('/');
}

/**
 * Parses known media URLs into embeddable video metadata.
 */
export function parseEmbed(url: string | undefined | null): EmbedInfo {
	if (!url) return null;

	// YouTube (covers shorts, youtu.be, standard watch links)
	const ytMatch = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?|shorts)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i);
	if (ytMatch) {
		const isShort = url.toLowerCase().includes('/shorts/');
		const id = ytMatch[1];
		return {
			type: 'iframe',
			provider: 'youtube',
			videoId: id,
			embedUrl: `https://www.youtube.com/embed/${id}`,
			aspectClass: isShort ? 'aspect-[9/16] max-h-[600px] mx-auto' : 'aspect-video',
			thumbnailUrl: `https://i.ytimg.com/vi/${id}/mqdefault.jpg`
		};
	}

	const xStatusId = parseXStatusId(url);
	if (xStatusId) {
		return {
			type: 'iframe',
			provider: 'x',
			videoId: xStatusId,
			embedUrl: `https://platform.twitter.com/embed/Tweet.html?id=${xStatusId}&dnt=true`,
			aspectClass: 'aspect-[4/3]'
		};
	}

	const twitchTarget = parseTwitchTarget(url);
	if (twitchTarget) {
		if (twitchTarget.kind === 'video') {
			return {
				type: 'iframe',
				provider: 'twitch',
				videoId: twitchTarget.id,
				embedUrl: `https://player.twitch.tv/?video=v${twitchTarget.id}`,
				aspectClass: 'aspect-video'
			};
		}

		return {
			type: 'iframe',
			provider: 'twitch',
			videoId: twitchTarget.id,
			embedUrl: `https://clips.twitch.tv/embed?clip=${encodeURIComponent(twitchTarget.id)}`,
			aspectClass: 'aspect-video'
		};
	}

	const dailymotionId = parseDailymotionId(url);
	if (dailymotionId) {
		return {
			type: 'iframe',
			provider: 'dailymotion',
			videoId: dailymotionId,
			embedUrl: `https://www.dailymotion.com/embed/video/${dailymotionId}`,
			thumbnailUrl: `https://www.dailymotion.com/thumbnail/video/${dailymotionId}`,
			aspectClass: 'aspect-video'
		};
	}

	const vimeoId = parseVimeoId(url);
	if (vimeoId) {
		return {
			type: 'iframe',
			provider: 'vimeo',
			videoId: vimeoId,
			embedUrl: `https://player.vimeo.com/video/${vimeoId}`,
			aspectClass: 'aspect-video'
		};
	}

	const rumbleId = parseRumbleId(url);
	if (rumbleId) {
		return {
			type: 'iframe',
			provider: 'rumble',
			videoId: rumbleId,
			embedUrl: `https://rumble.com/embed/${rumbleId}`,
			aspectClass: 'aspect-video'
		};
	}

	const internetArchiveId = parseInternetArchiveIdentifier(url);
	if (internetArchiveId) {
		return {
			type: 'iframe',
			provider: 'internet-archive',
			videoId: internetArchiveId,
			embedUrl: `https://archive.org/embed/${encodeURIComponent(internetArchiveId)}`,
			aspectClass: 'aspect-video'
		};
	}

	const odyseeClaimPath = parseOdyseeClaimPath(url);
	if (odyseeClaimPath) {
		return {
			type: 'iframe',
			provider: 'odysee',
			videoId: odyseeClaimPath,
			embedUrl: `https://odysee.com/$/embed/${odyseeClaimPath}`,
			aspectClass: 'aspect-video'
		};
	}

	if (isLikelyDirectVideoAssetUrl(url)) {
		return {
			type: 'video',
			provider: 'direct',
			videoUrl: url,
			aspectClass: 'aspect-video'
		};
	}

	// Spotify, etc can be added here.
	return null;
}