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