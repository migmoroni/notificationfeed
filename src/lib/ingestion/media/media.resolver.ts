import { parseEmbed, type EmbedInfo } from './video-embed.js';

/**
 * Helper to determine if a post has media that will visually render.
 */
export function hasMedia(
	url: string | undefined | null,
	imageUrl: string | undefined | null,
	videoUrl?: string | undefined | null
): boolean {
	const mediaUrl = videoUrl ?? url;
	return parseEmbed(mediaUrl) !== null || !!imageUrl;
}

/**
 * Helper to extract a fallback thumbnail image URL for lists and grid cards.
 */
export function getThumbnail(
	url: string | undefined | null,
	imageUrl: string | undefined | null,
	videoUrl?: string | undefined | null
): string | null | undefined {
	const mediaUrl = videoUrl ?? url;
	const embed = parseEmbed(mediaUrl);
	if (embed?.type === 'iframe' && embed.thumbnailUrl) return embed.thumbnailUrl;
	return imageUrl;
}

export {
	parseEmbed,
	type EmbedInfo
};