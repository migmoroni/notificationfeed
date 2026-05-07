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

	it('detects media when audioUrl is present', () => {
		expect(hasMedia(null, null, null, 'https://cdn.example.com/audio.mp3')).toBe(true);
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

	it('falls back to imageUrl for embeddable providers without native thumbnail', () => {
		const thumb = getThumbnail(
			'https://vimeo.com/148751763',
			'https://cdn.example.com/fallback-vimeo.jpg',
			null
		);
		expect(thumb).toBe('https://cdn.example.com/fallback-vimeo.jpg');
	});

	it('falls back to imageUrl when videoUrl points to provider without native thumbnail', () => {
		const thumb = getThumbnail(
			'https://example.com/article',
			'https://cdn.example.com/fallback-x.jpg',
			'https://x.com/SpaceX/status/1918483180486459576?s=20'
		);
		expect(thumb).toBe('https://cdn.example.com/fallback-x.jpg');
	});

	it('returns null thumbnail for direct videos without poster', () => {
		const thumb = getThumbnail(null, null, 'https://cdn.example.com/fallback-video.mp4');
		expect(thumb).toBe(null);
	});

	it('falls back to imageUrl for internet archive URLs', () => {
		const thumb = getThumbnail(
			'https://archive.org/details/bigbuckbunny_328',
			'https://cdn.example.com/fallback-archive.jpg',
			null
		);
		expect(thumb).toBe('https://cdn.example.com/fallback-archive.jpg');
	});

	it('parses youtube shorts as iframe embed', () => {
		const embed = parseEmbed('https://www.youtube.com/shorts/dQw4w9WgXcQ');
		expect(embed?.type).toBe('iframe');
		expect(embed?.provider).toBe('youtube');
	});

	it('parses x.com status URL as iframe embed', () => {
		const embed = parseEmbed('https://x.com/SpaceX/status/1918483180486459576?s=20');
		expect(embed?.type).toBe('iframe');
		expect(embed?.provider).toBe('x');
		if (!embed || embed.type !== 'iframe') throw new Error('Expected iframe embed');
		expect(embed.embedUrl).toBe(
			'https://platform.twitter.com/embed/Tweet.html?id=1918483180486459576&dnt=true'
		);
	});

	it('parses twitter.com status URL as iframe embed', () => {
		const embed = parseEmbed('https://twitter.com/jack/status/20');
		expect(embed?.type).toBe('iframe');
		expect(embed?.provider).toBe('x');
		if (!embed || embed.type !== 'iframe') throw new Error('Expected iframe embed');
		expect(embed.embedUrl).toBe('https://platform.twitter.com/embed/Tweet.html?id=20&dnt=true');
	});

	it('parses twitter i/web/status URL as iframe embed', () => {
		const embed = parseEmbed('https://twitter.com/i/web/status/1918483180486459576');
		expect(embed?.type).toBe('iframe');
		expect(embed?.provider).toBe('x');
		if (!embed || embed.type !== 'iframe') throw new Error('Expected iframe embed');
		expect(embed.embedUrl).toBe(
			'https://platform.twitter.com/embed/Tweet.html?id=1918483180486459576&dnt=true'
		);
	});

	it('does not treat x home URL as embeddable post', () => {
		expect(parseEmbed('https://x.com/home')).toBeNull();
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
		if (!embed || embed.type !== 'iframe' || embed.provider !== 'dailymotion' || !('thumbnailUrl' in embed)) {
			throw new Error('Expected dailymotion iframe embed');
		}
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

	it('preserves dailymotion quality and height hints into embed URL', () => {
		const embed = parseEmbed('https://www.dailymotion.com/video/x84sh87?quality=720&height=720');
		expect(embed?.type).toBe('iframe');
		expect(embed?.provider).toBe('dailymotion');
		if (!embed || embed.type !== 'iframe') throw new Error('Expected iframe embed');
		expect(embed.embedUrl).toBe('https://www.dailymotion.com/embed/video/x84sh87?height=720&quality=720');
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

	it('preserves vimeo quality and height hints into embed URL', () => {
		const embed = parseEmbed('https://vimeo.com/148751763?quality=720p&height=720');
		expect(embed?.type).toBe('iframe');
		expect(embed?.provider).toBe('vimeo');
		if (!embed || embed.type !== 'iframe') throw new Error('Expected iframe embed');
		expect(embed.embedUrl).toBe('https://player.vimeo.com/video/148751763?height=720&quality=720p');
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

	it('does not treat internet archive details URL as embeddable video', () => {
		expect(parseEmbed('https://archive.org/details/bigbuckbunny_328')).toBeNull();
	});

	it('does not treat internet archive embed URL as embeddable video', () => {
		expect(parseEmbed('https://archive.org/embed/bigbuckbunny_328?autoplay=1')).toBeNull();
	});

	it('does not treat internet archive listing URL as embeddable video', () => {
		expect(parseEmbed('https://archive.org/details')).toBeNull();
	});

	it('parses odysee video URL as iframe embed', () => {
		const embed = parseEmbed('https://odysee.com/@SomeChannel:4/my-video:7');
		expect(embed?.type).toBe('iframe');
		expect(embed?.provider).toBe('odysee');
		if (!embed || embed.type !== 'iframe') throw new Error('Expected iframe embed');
		expect(embed.embedUrl).toBe('https://odysee.com/$/embed/@SomeChannel:4/my-video:7');
	});

	it('parses odysee embed URL as iframe embed', () => {
		const embed = parseEmbed('https://odysee.com/$/embed/@SomeChannel:4/my-video:7?r=abc123');
		expect(embed?.type).toBe('iframe');
		expect(embed?.provider).toBe('odysee');
		if (!embed || embed.type !== 'iframe') throw new Error('Expected iframe embed');
		expect(embed.embedUrl).toBe('https://odysee.com/$/embed/@SomeChannel:4/my-video:7');
	});

	it('does not treat odysee channel URL as embeddable video', () => {
		expect(parseEmbed('https://odysee.com/@SomeChannel:4')).toBeNull();
	});

	it('parses peertube watch URL as iframe embed', () => {
		const embed = parseEmbed('https://peertube.tv/videos/watch/9c9de5e8-0a1e-484a-b099-e80766180a6d');
		expect(embed?.type).toBe('iframe');
		expect(embed?.provider).toBe('peertube');
		if (!embed || embed.type !== 'iframe') throw new Error('Expected iframe embed');
		expect(embed.embedUrl).toBe('https://peertube.tv/videos/embed/9c9de5e8-0a1e-484a-b099-e80766180a6d');
	});

	it('parses peertube embed URL as iframe embed', () => {
		const embed = parseEmbed('https://peertube.tv/videos/embed/9c9de5e8-0a1e-484a-b099-e80766180a6d?autoplay=1');
		expect(embed?.type).toBe('iframe');
		expect(embed?.provider).toBe('peertube');
		if (!embed || embed.type !== 'iframe') throw new Error('Expected iframe embed');
		expect(embed.embedUrl).toBe('https://peertube.tv/videos/embed/9c9de5e8-0a1e-484a-b099-e80766180a6d');
	});

	it('parses peertube short URL as iframe embed', () => {
		const embed = parseEmbed('https://videos.example.org/w/AbCdEf12');
		expect(embed?.type).toBe('iframe');
		expect(embed?.provider).toBe('peertube');
		if (!embed || embed.type !== 'iframe') throw new Error('Expected iframe embed');
		expect(embed.embedUrl).toBe('https://videos.example.org/videos/embed/AbCdEf12');
	});

	it('does not treat peertube browse URL as embeddable video', () => {
		expect(parseEmbed('https://peertube.tv/videos/browse')).toBeNull();
	});

	it('parses kick channel URL as iframe embed', () => {
		const embed = parseEmbed('https://kick.com/trainwreckstv');
		expect(embed?.type).toBe('iframe');
		expect(embed?.provider).toBe('kick');
		if (!embed || embed.type !== 'iframe') throw new Error('Expected iframe embed');
		expect(embed.embedUrl).toBe('https://player.kick.com/trainwreckstv');
	});

	it('parses kick player URL as iframe embed', () => {
		const embed = parseEmbed('https://player.kick.com/trainwreckstv?autoplay=true&muted=true');
		expect(embed?.type).toBe('iframe');
		expect(embed?.provider).toBe('kick');
		if (!embed || embed.type !== 'iframe') throw new Error('Expected iframe embed');
		expect(embed.embedUrl).toBe('https://player.kick.com/trainwreckstv');
	});

	it('does not treat kick categories URL as embeddable stream', () => {
		expect(parseEmbed('https://kick.com/categories')).toBeNull();
	});

	it('parses spotify track URL as iframe embed', () => {
		const embed = parseEmbed('https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC');
		expect(embed?.type).toBe('iframe');
		expect(embed?.provider).toBe('spotify');
		if (!embed || embed.type !== 'iframe') throw new Error('Expected iframe embed');
		expect(embed.embedUrl).toBe('https://open.spotify.com/embed/track/4uLU6hMCjMI75M1A2tKUQC');
	});

	it('parses soundcloud track URL as iframe embed', () => {
		const embed = parseEmbed('https://soundcloud.com/forss/flickermood');
		expect(embed?.type).toBe('iframe');
		expect(embed?.provider).toBe('soundcloud');
		if (!embed || embed.type !== 'iframe') throw new Error('Expected iframe embed');
		expect(embed.embedUrl).toBe(
			'https://w.soundcloud.com/player/?url=https%3A%2F%2Fsoundcloud.com%2Fforss%2Fflickermood'
		);
	});

	it('parses direct audio URL as audio embed', () => {
		const embed = parseEmbed('https://cdn.example.com/audio/episode-1.mp3');
		expect(embed?.type).toBe('audio');
		expect(embed?.provider).toBe('direct');
	});

	it('does not treat spotify root URL as embeddable audio', () => {
		expect(parseEmbed('https://open.spotify.com/')).toBeNull();
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