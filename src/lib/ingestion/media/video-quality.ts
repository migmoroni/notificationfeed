import { parseEmbed } from './video-embed.js';

function pushUnique(target: string[], value: string | null | undefined): void {
	if (!value) return;
	if (!target.includes(value)) target.push(value);
}

/**
 * Build a deterministic candidate chain for ingestion-time video URL storage.
 */
export function getVideoQualityCandidates(videoUrl: string | undefined | null): string[] {
	const source = videoUrl?.trim();
	if (!source) return [];

	const candidates: string[] = [];
	const embed = parseEmbed(source);
	if (embed?.provider === 'youtube' && embed.videoId) {
		pushUnique(candidates, `https://www.youtube.com/watch?v=${embed.videoId}`);
	}

	pushUnique(candidates, source);
	return candidates;
}

/**
 * Resolve the single video URL to persist during ingestion.
 */
export function resolveIngestionVideoUrl(videoUrl: string | undefined | null): string | undefined {
	const candidates = getVideoQualityCandidates(videoUrl);
	return candidates[0];
}
