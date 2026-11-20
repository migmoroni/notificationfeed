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

function buildYouTubeEmbedUrl(sourceUrl: string, videoId: string): string {
	const embed = new URL(`https://www.youtube.com/embed/${videoId}`);

	try {
		const source = new URL(sourceUrl);
		const vq = source.searchParams.get('vq') ?? source.searchParams.get('quality');
		if (vq) embed.searchParams.set('vq', vq);

		const height =
			source.searchParams.get('height') ??
			source.searchParams.get('h') ??
			source.searchParams.get('resolution') ??
			source.searchParams.get('res');
		if (height && /^\d{2,4}$/.test(height)) {
			embed.searchParams.set('height', height);
		}
	} catch {
		// Ignore malformed source URL and keep canonical embed URL.
	}

	return embed.toString();
}

function buildVimeoEmbedUrl(sourceUrl: string, videoId: string): string {
	const embed = new URL(`https://player.vimeo.com/video/${videoId}`);

	try {
		const source = new URL(sourceUrl);
		let quality = source.searchParams.get('quality') ?? source.searchParams.get('q');

		const height =
			source.searchParams.get('height') ??
			source.searchParams.get('h') ??
			source.searchParams.get('resolution') ??
			source.searchParams.get('res');
		if (height && /^\d{2,4}$/.test(height)) {
			embed.searchParams.set('height', height);
			if (!quality) quality = `${height}p`;
		}

		if (quality) {
			const normalized = /^\d{2,4}$/.test(quality) ? `${quality}p` : quality;
			if (/^\d{2,4}p$/i.test(normalized)) {
				embed.searchParams.set('quality', normalized.toLowerCase());
			}
		}
	} catch {
		// Ignore malformed source URL and keep canonical embed URL.
	}

	return embed.toString();
}

function buildDailymotionEmbedUrl(sourceUrl: string, videoId: string): string {
	const embed = new URL(`https://www.dailymotion.com/embed/video/${videoId}`);

	try {
		const source = new URL(sourceUrl);
		let quality =
			source.searchParams.get('quality') ??
			source.searchParams.get('q') ??
			source.searchParams.get('vq');

		const height =
			source.searchParams.get('height') ??
			source.searchParams.get('h') ??
			source.searchParams.get('resolution') ??
			source.searchParams.get('res');
		if (height && /^\d{2,4}$/.test(height)) {
			embed.searchParams.set('height', height);
			if (!quality) quality = height;
		}

		if (quality) {
			const normalized = /^\d{2,4}p$/i.test(quality) ? quality.slice(0, -1) : quality;
			if (/^\d{2,4}$/.test(normalized)) {
				embed.searchParams.set('quality', normalized);
			}
		}
	} catch {
		// Ignore malformed source URL and keep canonical embed URL.
	}

	return embed.toString();
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

function normalizePeerTubeVideoId(raw: string | undefined): string | null {
	if (!raw) return null;

	const decoded = decodeUrlSegment(raw).trim();
	if (!decoded) return null;
	if (decoded.includes('/') || decoded.includes('?') || decoded.includes('#')) return null;

	const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(decoded);
	const isShortId = /^[A-Za-z0-9_-]{8,}$/.test(decoded);

	return isUuid || isShortId ? decoded : null;
}

function parsePeerTubeTarget(url: string): { origin: string; videoId: string } | null {
	let parsed: URL;
	try {
		parsed = new URL(url);
	} catch {
		return null;
	}

	const segments = parsed.pathname.split('/').filter(Boolean);
	if (segments.length < 2) return null;

	const first = segments[0].toLowerCase();
	if (first === 'videos') {
		const second = segments[1]?.toLowerCase();
		if ((second === 'watch' || second === 'embed') && segments[2]) {
			const videoId = normalizePeerTubeVideoId(segments[2]);
			if (videoId) {
				return {
					origin: `${parsed.protocol}//${parsed.host}`,
					videoId,
				};
			}
		}
	}

	if (first === 'w' && segments[1]) {
		const videoId = normalizePeerTubeVideoId(segments[1]);
		if (videoId) {
			return {
				origin: `${parsed.protocol}//${parsed.host}`,
				videoId,
			};
		}
	}

	return null;
}

const KICK_RESERVED_ROUTES = new Set([
	'about',
	'browse',
	'categories',
	'community-guidelines',
	'contacts',
	'dashboard',
	'discover',
	'following',
	'help',
	'home',
	'login',
	'privacy',
	'register',
	'search',
	'settings',
	'signup',
	'subscriptions',
	'support',
	'terms',
]);

function parseKickChannel(url: string): string | null {
	let parsed: URL;
	try {
		parsed = new URL(url);
	} catch {
		return null;
	}

	const host = parsed.hostname.toLowerCase();
	const isPlayerHost = host === 'player.kick.com' || host.endsWith('.player.kick.com');
	const isSiteHost = host === 'kick.com' || host === 'www.kick.com' || host === 'm.kick.com';
	if (!isPlayerHost && !isSiteHost) return null;

	const segments = parsed.pathname.split('/').filter(Boolean);
	if (segments.length === 0) return null;

	let rawChannel: string | undefined;
	if (isPlayerHost) {
		rawChannel = segments[0];
	} else {
		if (segments.length !== 1) return null;
		rawChannel = segments[0];
	}

	const decoded = decodeUrlSegment(rawChannel).trim();
	if (!decoded) return null;

	const normalized = decoded.toLowerCase();
	if (KICK_RESERVED_ROUTES.has(normalized)) return null;
	if (!/^[A-Za-z0-9_]{3,}$/i.test(decoded)) return null;

	return decoded;
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
			embedUrl: buildYouTubeEmbedUrl(url, id),
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
			embedUrl: buildDailymotionEmbedUrl(url, dailymotionId),
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
			embedUrl: buildVimeoEmbedUrl(url, vimeoId),
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

	const peerTubeTarget = parsePeerTubeTarget(url);
	if (peerTubeTarget) {
		return {
			type: 'iframe',
			provider: 'peertube',
			videoId: peerTubeTarget.videoId,
			embedUrl: `${peerTubeTarget.origin}/videos/embed/${encodeURIComponent(peerTubeTarget.videoId)}`,
			aspectClass: 'aspect-video'
		};
	}

	const kickChannel = parseKickChannel(url);
	if (kickChannel) {
		return {
			type: 'iframe',
			provider: 'kick',
			videoId: kickChannel,
			embedUrl: `https://player.kick.com/${encodeURIComponent(kickChannel)}`,
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