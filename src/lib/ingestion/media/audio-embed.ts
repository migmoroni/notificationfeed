import { isLikelyDirectAudioAssetUrl } from './audio-capture.js';

export type AudioEmbedInfo =
	| { type: 'iframe'; provider: string; embedUrl: string; aspectClass: string; audioId?: string }
	| { type: 'audio'; provider: 'direct'; audioUrl: string }
	| null;

type SpotifyKind = 'track' | 'album' | 'playlist' | 'episode' | 'show';

const SPOTIFY_KINDS = new Set<SpotifyKind>(['track', 'album', 'playlist', 'episode', 'show']);
const SOUNDCLOUD_RESERVED_ROUTES = new Set([
	'discover',
	'search',
	'stream',
	'you',
	'upload',
	'charts',
	'pages',
	'jobs',
	'stories',
	'terms-of-use',
]);

function parseSpotifyTarget(url: string): { kind: SpotifyKind; id: string } | null {
	let parsed: URL;
	try {
		parsed = new URL(url);
	} catch {
		return null;
	}

	const host = parsed.hostname.toLowerCase();
	if (host !== 'open.spotify.com' && host !== 'play.spotify.com') return null;

	const segments = parsed.pathname.split('/').filter(Boolean);
	if (segments.length < 2) return null;

	let offset = 0;
	if (segments[offset]?.toLowerCase().startsWith('intl-')) offset += 1;
	if (segments[offset]?.toLowerCase() === 'embed') offset += 1;

	const kindCandidate = segments[offset]?.toLowerCase() as SpotifyKind | undefined;
	const idCandidate = segments[offset + 1];
	if (!kindCandidate || !idCandidate) return null;
	if (!SPOTIFY_KINDS.has(kindCandidate)) return null;
	if (!/^[A-Za-z0-9]{6,64}$/.test(idCandidate)) return null;

	return { kind: kindCandidate, id: idCandidate };
}

function trimTrailingSlash(pathname: string): string {
	if (pathname.length > 1 && pathname.endsWith('/')) {
		return pathname.slice(0, -1);
	}
	return pathname;
}

function parseSoundCloudAudioUrl(url: string): string | null {
	let parsed: URL;
	try {
		parsed = new URL(url);
	} catch {
		return null;
	}

	const host = parsed.hostname.toLowerCase();
	const segments = parsed.pathname.split('/').filter(Boolean);

	if (host === 'w.soundcloud.com' || host.endsWith('.w.soundcloud.com')) {
		if (segments[0]?.toLowerCase() !== 'player') return null;
		const nested = parsed.searchParams.get('url')?.trim();
		if (!nested) return null;
		return parseSoundCloudAudioUrl(nested);
	}

	if (host === 'soundcloud.com' || host === 'www.soundcloud.com' || host === 'm.soundcloud.com' || host.endsWith('.soundcloud.com')) {
		if (segments.length < 2) return null;
		const first = segments[0].toLowerCase();
		if (SOUNDCLOUD_RESERVED_ROUTES.has(first)) return null;
		return `${parsed.protocol}//${parsed.host}${trimTrailingSlash(parsed.pathname)}`;
	}

	if (host === 'on.soundcloud.com' || host.endsWith('.on.soundcloud.com')) {
		if (segments.length < 1) return null;
		return `${parsed.protocol}//${parsed.host}/${segments[0]}`;
	}

	return null;
}

/**
 * Parses known audio URLs into embeddable audio metadata.
 */
export function parseAudioEmbed(url: string | undefined | null): AudioEmbedInfo {
	const source = url?.trim();
	if (!source) return null;

	const spotifyTarget = parseSpotifyTarget(source);
	if (spotifyTarget) {
		return {
			type: 'iframe',
			provider: 'spotify',
			audioId: `${spotifyTarget.kind}:${spotifyTarget.id}`,
			embedUrl: `https://open.spotify.com/embed/${spotifyTarget.kind}/${spotifyTarget.id}`,
			aspectClass: 'aspect-[16/6]'
		};
	}

	const soundCloudAudioUrl = parseSoundCloudAudioUrl(source);
	if (soundCloudAudioUrl) {
		return {
			type: 'iframe',
			provider: 'soundcloud',
			audioId: soundCloudAudioUrl,
			embedUrl: `https://w.soundcloud.com/player/?url=${encodeURIComponent(soundCloudAudioUrl)}`,
			aspectClass: 'aspect-[16/5]'
		};
	}

	if (isLikelyDirectAudioAssetUrl(source)) {
		return {
			type: 'audio',
			provider: 'direct',
			audioUrl: source
		};
	}

	return null;
}
