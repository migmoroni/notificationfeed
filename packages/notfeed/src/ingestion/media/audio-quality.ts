import { parseAudioEmbed } from './audio-embed.js';

function pushUnique(target: string[], value: string | null | undefined): void {
	if (!value) return;
	if (!target.includes(value)) target.push(value);
}

function spotifyCanonicalUrlFromId(audioId: string | undefined): string | undefined {
	if (!audioId) return undefined;
	const parts = audioId.split(':');
	if (parts.length !== 2) return undefined;
	const kind = parts[0];
	const id = parts[1];
	if (!kind || !id) return undefined;
	return `https://open.spotify.com/${kind}/${id}`;
}

function soundCloudCanonicalUrlFromEmbed(embedUrl: string): string | undefined {
	let parsed: URL;
	try {
		parsed = new URL(embedUrl);
	} catch {
		return undefined;
	}

	const nested = parsed.searchParams.get('url');
	if (!nested) return undefined;

	try {
		return new URL(nested).toString();
	} catch {
		return nested;
	}
}

/**
 * Build a deterministic candidate chain for ingestion-time audio URL storage.
 */
export function getAudioQualityCandidates(audioUrl: string | undefined | null): string[] {
	const source = audioUrl?.trim();
	if (!source) return [];

	const candidates: string[] = [];
	const embed = parseAudioEmbed(source);

	if (embed?.provider === 'spotify' && embed.type === 'iframe') {
		pushUnique(candidates, spotifyCanonicalUrlFromId(embed.audioId));
	}

	if (embed?.provider === 'soundcloud' && embed.type === 'iframe') {
		pushUnique(candidates, soundCloudCanonicalUrlFromEmbed(embed.embedUrl));
	}

	pushUnique(candidates, source);
	return candidates;
}

/**
 * Resolve the single audio URL to persist during ingestion.
 */
export function resolveIngestionAudioUrl(audioUrl: string | undefined | null): string | undefined {
	const candidates = getAudioQualityCandidates(audioUrl);
	return candidates[0];
}
