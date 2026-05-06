import {
	parseEmbed as parseVideoEmbed,
	type EmbedInfo as VideoEmbedInfo
} from './video-embed.js';
import { parseAudioEmbed, type AudioEmbedInfo } from './audio-embed.js';

export type EmbedInfo = VideoEmbedInfo | AudioEmbedInfo;

function parsePreferredEmbed(
	url: string | undefined | null,
	videoUrl?: string | undefined | null,
	audioUrl?: string | undefined | null
): EmbedInfo {
	const videoCandidate = videoUrl ?? url;
	const videoEmbed = parseVideoEmbed(videoCandidate);
	if (videoEmbed) return videoEmbed;

	const audioCandidate = audioUrl ?? url;
	return parseAudioEmbed(audioCandidate);
}

function parseForThumbnail(url: string | undefined | null, videoUrl?: string | undefined | null): VideoEmbedInfo {
	const candidate = videoUrl ?? url;
	return parseVideoEmbed(candidate);
}

/**
 * Helper to determine if a post has media that will visually render.
 */
export function hasMedia(
	url: string | undefined | null,
	imageUrl: string | undefined | null,
	videoUrl?: string | undefined | null,
	audioUrl?: string | undefined | null
): boolean {
	return parsePreferredEmbed(url, videoUrl, audioUrl) !== null || !!imageUrl;
}

/**
 * Helper to extract a fallback thumbnail image URL for lists and grid cards.
 */
export function getThumbnail(
	url: string | undefined | null,
	imageUrl: string | undefined | null,
	videoUrl?: string | undefined | null,
	audioUrl?: string | undefined | null
): string | null | undefined {
	void audioUrl;
	const embed = parseForThumbnail(url, videoUrl);
	if (embed?.type === 'iframe' && embed.thumbnailUrl) return embed.thumbnailUrl;
	return imageUrl;
}

export function parseEmbed(url: string | undefined | null): EmbedInfo {
	return parseVideoEmbed(url) ?? parseAudioEmbed(url);
}

export {
	parseVideoEmbed,
	parseAudioEmbed,
	type VideoEmbedInfo,
	type AudioEmbedInfo
};