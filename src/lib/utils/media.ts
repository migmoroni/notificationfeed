export type EmbedInfo =
	| { type: 'iframe'; provider: string; embedUrl: string; aspectClass: string; thumbnailUrl?: string; videoId?: string }
	| null;

/**
 * Extensible media parser. 
 * Examines URLs to detect playable embeds so the UI isn't hardcoded.
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

	// Vimeo, Spotify, etc can be added here...

	return null;
}

/**
 * Helper to determine if a post has media that will visually render.
 */
export function hasMedia(url: string | undefined | null, imageUrl: string | undefined | null): boolean {
	return parseEmbed(url) !== null || !!imageUrl;
}

/**
 * Helper to extract a fallback thumbnail image URL for lists and grid cards.
 */
export function getThumbnail(url: string | undefined | null, imageUrl: string | undefined | null): string | null | undefined {
	const embed = parseEmbed(url);
	if (embed?.thumbnailUrl) return embed.thumbnailUrl;
	return imageUrl;
}
