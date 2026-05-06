import { describe, expect, it } from 'vitest';
import {
	extractFirstVideoUrlFromHtml,
	extractFirstVideoUrlFromText,
	extractVideoUrlFromNostrTags,
	isLikelyDirectVideoAssetUrl,
	isLikelyVideoUrl,
	pickFirstVideoUrl
} from './video-capture.js';

describe('video-capture', () => {
	it('detects known video URLs', () => {
		expect(isLikelyVideoUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe(true);
		expect(isLikelyVideoUrl('https://www.twitch.tv/videos/1987654321')).toBe(true);
		expect(isLikelyVideoUrl('https://clips.twitch.tv/IncredulousSpinelessGoatKreygasm')).toBe(true);
		expect(isLikelyVideoUrl('https://www.dailymotion.com/video/x84sh87')).toBe(true);
		expect(isLikelyVideoUrl('https://dai.ly/x84sh87')).toBe(true);
		expect(isLikelyVideoUrl('https://cdn.example.com/media/video.mp4')).toBe(true);
		expect(isLikelyVideoUrl('https://archive.org/details/bigbuckbunny_328')).toBe(true);
		expect(
			isLikelyVideoUrl('https://www.bbc.com/news/videos/cdxpn5r2nlgo?at_medium=RSS&at_campaign=rss')
		).toBe(true);
		expect(isLikelyVideoUrl('https://example.com/article')).toBe(false);
	});

	it('only treats direct assets as direct playable videos', () => {
		expect(isLikelyDirectVideoAssetUrl('https://cdn.example.com/media/video.mp4')).toBe(true);
		expect(isLikelyDirectVideoAssetUrl('https://archive.org/details/bigbuckbunny_328')).toBe(false);
		expect(
			isLikelyDirectVideoAssetUrl(
				'https://www.bbc.com/news/videos/cdxpn5r2nlgo?at_medium=RSS&at_campaign=rss'
			)
		).toBe(false);
	});

	it('extracts video URL from html iframe', () => {
		const html = '<div><iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ"></iframe></div>';
		expect(extractFirstVideoUrlFromHtml(html)).toBe('https://www.youtube.com/embed/dQw4w9WgXcQ');
	});

	it('extracts video URL from plain text', () => {
		const text = 'watch this https://cdn.example.com/episodes/s1e1.m3u8 now';
		expect(extractFirstVideoUrlFromText(text)).toBe('https://cdn.example.com/episodes/s1e1.m3u8');
	});

	it('extracts video URL from nostr tags', () => {
		const tags = [['imeta', 'url https://cdn.example.com/v/1.mp4', 'm video/mp4']];
		expect(extractVideoUrlFromNostrTags(tags)).toBe('https://cdn.example.com/v/1.mp4');
	});

	it('picks first valid explicit candidate', () => {
		expect(pickFirstVideoUrl(' https://cdn.example.com/v/1.mp4 ')).toBe('https://cdn.example.com/v/1.mp4');
	});
});
