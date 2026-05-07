import type { IngestionVideoInitialHeight } from '$lib/domain/ingestion/ingestion-settings.js';
import { parseEmbed } from './video-embed.js';

function pushUnique(target: string[], value: string | null | undefined): void {
	if (!value) return;
	if (!target.includes(value)) target.push(value);
}

const VIDEO_HEIGHT_PARAMS = ['h', 'height', 'maxheight', 'res', 'resolution'];

export interface VideoQualityCandidateOptions {
	initialHeight?: IngestionVideoInitialHeight;
}

export interface ResolveIngestionVideoOptions {
	initialHeight?: IngestionVideoInitialHeight;
}

function toYoutubeVq(height: IngestionVideoInitialHeight): string | null {
	if (height == null) return null;
	if (height >= 1080) return 'highres';
	if (height >= 720) return 'hd720';
	if (height >= 480) return 'large';
	if (height >= 360) return 'medium';
	return 'small';
}

function toVimeoQuality(height: IngestionVideoInitialHeight): string | null {
	if (height == null) return null;
	return `${height}p`;
}

function toDailymotionQuality(height: IngestionVideoInitialHeight): string | null {
	if (height == null) return null;
	return String(height);
}

function setNumericParams(params: URLSearchParams, names: string[], value: number): boolean {
	let changed = false;
	for (const name of names) {
		const current = params.get(name);
		if (!current) continue;
		const parsed = Number.parseInt(current, 10);
		if (Number.isFinite(parsed) && parsed === value) continue;
		params.set(name, String(value));
		changed = true;
	}
	return changed;
}

function applyVideoInitialHeightToQuery(url: string, initialHeight: IngestionVideoInitialHeight): string | undefined {
	if (initialHeight == null) return undefined;

	let parsed: URL;
	try {
		parsed = new URL(url);
	} catch {
		return undefined;
	}

	if (!setNumericParams(parsed.searchParams, VIDEO_HEIGHT_PARAMS, initialHeight)) {
		return undefined;
	}

	return parsed.toString();
}

/**
 * Build a deterministic candidate chain for ingestion-time video URL storage.
 */
export function getVideoQualityCandidates(
	videoUrl: string | undefined | null,
	options: VideoQualityCandidateOptions = {}
): string[] {
	const source = videoUrl?.trim();
	if (!source) return [];

	const candidates: string[] = [];
	const initialHeight = options.initialHeight;
	const embed = parseEmbed(source);
	if (embed?.provider === 'youtube' && embed.videoId) {
		const canonical = new URL('https://www.youtube.com/watch');
		canonical.searchParams.set('v', embed.videoId);

		if (initialHeight !== undefined) {
			const vq = toYoutubeVq(initialHeight);
			if (vq) canonical.searchParams.set('vq', vq);
			if (initialHeight != null) canonical.searchParams.set('height', String(initialHeight));
		}

		pushUnique(candidates, canonical.toString());

		if (initialHeight !== undefined) {
			pushUnique(candidates, `https://www.youtube.com/watch?v=${embed.videoId}`);
		}
	} else if (embed?.provider === 'vimeo' && embed.videoId) {
		const canonical = new URL(`https://vimeo.com/${embed.videoId}`);

		if (initialHeight !== undefined) {
			const quality = toVimeoQuality(initialHeight);
			if (quality) canonical.searchParams.set('quality', quality);
			if (initialHeight != null) canonical.searchParams.set('height', String(initialHeight));
		}

		pushUnique(candidates, canonical.toString());

		if (initialHeight !== undefined) {
			pushUnique(candidates, `https://vimeo.com/${embed.videoId}`);
		}
	} else if (embed?.provider === 'dailymotion' && embed.videoId) {
		const canonical = new URL(`https://www.dailymotion.com/video/${embed.videoId}`);

		if (initialHeight !== undefined) {
			const quality = toDailymotionQuality(initialHeight);
			if (quality) canonical.searchParams.set('quality', quality);
			if (initialHeight != null) canonical.searchParams.set('height', String(initialHeight));
		}

		pushUnique(candidates, canonical.toString());

		if (initialHeight !== undefined) {
			pushUnique(candidates, `https://www.dailymotion.com/video/${embed.videoId}`);
		}
	}

	if (initialHeight !== undefined) {
		pushUnique(candidates, applyVideoInitialHeightToQuery(source, initialHeight));
	}

	pushUnique(candidates, source);
	return candidates;
}

/**
 * Resolve the single video URL to persist during ingestion.
 */
export function resolveIngestionVideoUrl(
	videoUrl: string | undefined | null,
	options: ResolveIngestionVideoOptions = {}
): string | undefined {
	const initialHeight = options.initialHeight;

	const candidates = getVideoQualityCandidates(videoUrl, { initialHeight });
	return candidates[0];
}
