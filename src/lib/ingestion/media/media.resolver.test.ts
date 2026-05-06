import { describe, expect, it } from 'vitest';
import { getThumbnail, hasMedia, parseEmbed } from './media.resolver.js';

describe('media.resolver', () => {
	it('detects media when URL is embeddable', () => {
		expect(hasMedia('https://www.youtube.com/watch?v=dQw4w9WgXcQ', null, null)).toBe(true);
	});

	it('detects media when imageUrl is present', () => {
		expect(hasMedia(null, 'https://cdn.example.com/image.jpg', null)).toBe(true);
	});

	it('detects media when videoUrl is present', () => {
		expect(hasMedia(null, null, 'https://cdn.example.com/video.mp4')).toBe(true);
	});

	it('returns false when no media data is present', () => {
		expect(hasMedia(null, null, null)).toBe(false);
	});

	it('prefers embed thumbnail over feed image', () => {
		const thumb = getThumbnail(
			'https://youtu.be/dQw4w9WgXcQ',
			'https://cdn.example.com/fallback.jpg',
			null
		);
		expect(thumb).toBe('https://i.ytimg.com/vi/dQw4w9WgXcQ/mqdefault.jpg');
	});

	it('returns imageUrl when URL is not embeddable', () => {
		const thumb = getThumbnail(
			'https://example.com/article',
			'https://cdn.example.com/fallback.jpg',
			null
		);
		expect(thumb).toBe('https://cdn.example.com/fallback.jpg');
	});

	it('returns null thumbnail for direct videos without poster', () => {
		const thumb = getThumbnail(null, null, 'https://cdn.example.com/fallback-video.mp4');
		expect(thumb).toBe(null);
	});

	it('parses youtube shorts as iframe embed', () => {
		const embed = parseEmbed('https://www.youtube.com/shorts/dQw4w9WgXcQ');
		expect(embed?.type).toBe('iframe');
		expect(embed?.provider).toBe('youtube');
	});

	it('parses twitch VOD URL as iframe embed', () => {
		const embed = parseEmbed('https://www.twitch.tv/videos/1987654321');
		expect(embed?.type).toBe('iframe');
		expect(embed?.provider).toBe('twitch');
		if (!embed || embed.type !== 'iframe') throw new Error('Expected iframe embed');
		expect(embed.embedUrl).toBe('https://player.twitch.tv/?video=v1987654321');
	});

	it('parses twitch clips URL as iframe embed', () => {
		const embed = parseEmbed('https://clips.twitch.tv/IncredulousSpinelessGoatKreygasm');
		expect(embed?.type).toBe('iframe');
		expect(embed?.provider).toBe('twitch');
		if (!embed || embed.type !== 'iframe') throw new Error('Expected iframe embed');
		expect(embed.embedUrl).toBe('https://clips.twitch.tv/embed?clip=IncredulousSpinelessGoatKreygasm');
	});

	it('parses twitch player URL as iframe embed', () => {
		const embed = parseEmbed('https://player.twitch.tv/?video=v1987654321&parent=example.com');
		expect(embed?.type).toBe('iframe');
		expect(embed?.provider).toBe('twitch');
		if (!embed || embed.type !== 'iframe') throw new Error('Expected iframe embed');
		expect(embed.embedUrl).toBe('https://player.twitch.tv/?video=v1987654321');
	});

	it('does not treat twitch directory URL as embeddable video', () => {
		expect(parseEmbed('https://www.twitch.tv/directory')).toBeNull();
	});

	it('parses dailymotion watch URL as iframe embed', () => {
		const embed = parseEmbed('https://www.dailymotion.com/video/x84sh87');
		expect(embed?.type).toBe('iframe');
		expect(embed?.provider).toBe('dailymotion');
		if (!embed || embed.type !== 'iframe') throw new Error('Expected iframe embed');
		expect(embed.embedUrl).toBe('https://www.dailymotion.com/embed/video/x84sh87');
		expect(embed.thumbnailUrl).toBe('https://www.dailymotion.com/thumbnail/video/x84sh87');
	});

	it('parses dailymotion short URL as iframe embed', () => {
		const embed = parseEmbed('https://dai.ly/x84sh87');
		expect(embed?.type).toBe('iframe');
		expect(embed?.provider).toBe('dailymotion');
		if (!embed || embed.type !== 'iframe') throw new Error('Expected iframe embed');
		expect(embed.embedUrl).toBe('https://www.dailymotion.com/embed/video/x84sh87');
	});

	it('parses dailymotion embed URL as iframe embed', () => {
		const embed = parseEmbed('https://www.dailymotion.com/embed/video/x84sh87?playlist=x7tgczm');
		expect(embed?.type).toBe('iframe');
		expect(embed?.provider).toBe('dailymotion');
		if (!embed || embed.type !== 'iframe') throw new Error('Expected iframe embed');
		expect(embed.embedUrl).toBe('https://www.dailymotion.com/embed/video/x84sh87');
	});

	it('does not treat dailymotion listing URL as embeddable video', () => {
		expect(parseEmbed('https://www.dailymotion.com/us')).toBeNull();
	});

	it('parses standard vimeo URL as iframe embed', () => {
		const embed = parseEmbed('https://vimeo.com/148751763');
		expect(embed?.type).toBe('iframe');
		expect(embed?.provider).toBe('vimeo');
		if (!embed || embed.type !== 'iframe') throw new Error('Expected iframe embed');
		expect(embed.embedUrl).toBe('https://player.vimeo.com/video/148751763');
	});

	it('parses vimeo channel URL as iframe embed', () => {
		const embed = parseEmbed('https://vimeo.com/channels/staffpicks/76979871');
		expect(embed?.type).toBe('iframe');
		expect(embed?.provider).toBe('vimeo');
		if (!embed || embed.type !== 'iframe') throw new Error('Expected iframe embed');
		expect(embed.embedUrl).toBe('https://player.vimeo.com/video/76979871');
	});

	it('parses vimeo player URL as iframe embed', () => {
		const embed = parseEmbed('https://player.vimeo.com/video/357274789?h=abcd1234');
		expect(embed?.type).toBe('iframe');
		expect(embed?.provider).toBe('vimeo');
		if (!embed || embed.type !== 'iframe') throw new Error('Expected iframe embed');
		expect(embed.embedUrl).toBe('https://player.vimeo.com/video/357274789');
	});

	it('parses rumble watch URL as iframe embed', () => {
		const embed = parseEmbed('https://rumble.com/v5m8w0x-wildlife-walkthrough.html');
		expect(embed?.type).toBe('iframe');
		expect(embed?.provider).toBe('rumble');
		if (!embed || embed.type !== 'iframe') throw new Error('Expected iframe embed');
		expect(embed.embedUrl).toBe('https://rumble.com/embed/v5m8w0x');
	});

	it('parses rumble embed URL as iframe embed', () => {
		const embed = parseEmbed('https://rumble.com/embed/v5m8w0x/?pub=4');
		expect(embed?.type).toBe('iframe');
		expect(embed?.provider).toBe('rumble');
		if (!embed || embed.type !== 'iframe') throw new Error('Expected iframe embed');
		expect(embed.embedUrl).toBe('https://rumble.com/embed/v5m8w0x');
	});

	it('does not treat rumble channel URL as embeddable video', () => {
		expect(parseEmbed('https://rumble.com/c/LongFormTalks')).toBeNull();
	});

	it('parses internet archive details URL as iframe embed', () => {
		const embed = parseEmbed('https://archive.org/details/bigbuckbunny_328');
		expect(embed?.type).toBe('iframe');
		expect(embed?.provider).toBe('internet-archive');
		if (!embed || embed.type !== 'iframe') throw new Error('Expected iframe embed');
		expect(embed.embedUrl).toBe('https://archive.org/embed/bigbuckbunny_328');
	});

	it('parses internet archive embed URL as iframe embed', () => {
		const embed = parseEmbed('https://archive.org/embed/bigbuckbunny_328?autoplay=1');
		expect(embed?.type).toBe('iframe');
		expect(embed?.provider).toBe('internet-archive');
		if (!embed || embed.type !== 'iframe') throw new Error('Expected iframe embed');
		expect(embed.embedUrl).toBe('https://archive.org/embed/bigbuckbunny_328');
	});

	it('does not treat internet archive listing URL as embeddable video', () => {
		expect(parseEmbed('https://archive.org/details')).toBeNull();
	});

	it('parses direct video URL as video embed', () => {
		const embed = parseEmbed('https://videos.example.com/highlights.webm');
		expect(embed?.type).toBe('video');
		expect(embed?.provider).toBe('direct');
	});

	it('does not treat article pages under /videos as direct video assets', () => {
		const bbcPageUrl = 'https://www.bbc.com/news/videos/cdxpn5r2nlgo?at_medium=RSS&at_campaign=rss';
		expect(parseEmbed(bbcPageUrl)).toBeNull();

		const thumb = getThumbnail(
			bbcPageUrl,
			'https://ichef.bbci.co.uk/ace/standard/240/cpsprodpb/example.jpg',
			null
		);
		expect(thumb).toBe('https://ichef.bbci.co.uk/ace/standard/240/cpsprodpb/example.jpg');
	});
});