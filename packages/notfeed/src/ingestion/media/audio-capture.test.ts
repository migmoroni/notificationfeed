import { describe, expect, it } from 'vitest';
import {
	extractAudioUrlFromNostrTags,
	extractFirstAudioUrlFromHtml,
	extractFirstAudioUrlFromText,
	isLikelyAudioUrl,
	isLikelyDirectAudioAssetUrl,
	pickFirstAudioUrl
} from './audio-capture.js';

describe('audio-capture', () => {
	it('detects known audio URLs', () => {
		expect(isLikelyAudioUrl('https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC')).toBe(true);
		expect(isLikelyAudioUrl('https://soundcloud.com/forss/flickermood')).toBe(true);
		expect(isLikelyAudioUrl('https://on.soundcloud.com/abc123')).toBe(true);
		expect(isLikelyAudioUrl('https://cdn.example.com/podcast/episode-1.mp3')).toBe(true);
		expect(isLikelyAudioUrl('https://example.com/article')).toBe(false);
	});

	it('only treats direct assets as direct playable audio', () => {
		expect(isLikelyDirectAudioAssetUrl('https://cdn.example.com/podcast/episode-1.mp3')).toBe(true);
		expect(isLikelyDirectAudioAssetUrl('https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC')).toBe(false);
	});

	it('extracts audio URL from html iframe', () => {
		const html = '<div><iframe src="https://open.spotify.com/embed/track/4uLU6hMCjMI75M1A2tKUQC"></iframe></div>';
		expect(extractFirstAudioUrlFromHtml(html)).toBe('https://open.spotify.com/embed/track/4uLU6hMCjMI75M1A2tKUQC');
	});

	it('extracts audio URL from plain text', () => {
		const text = 'listen https://cdn.example.com/episodes/s1e1.m4a now';
		expect(extractFirstAudioUrlFromText(text)).toBe('https://cdn.example.com/episodes/s1e1.m4a');
	});

	it('extracts audio URL from nostr tags', () => {
		const tags = [['imeta', 'url https://cdn.example.com/a/1.mp3', 'm audio/mpeg']];
		expect(extractAudioUrlFromNostrTags(tags)).toBe('https://cdn.example.com/a/1.mp3');
	});

	it('picks first valid explicit candidate', () => {
		expect(pickFirstAudioUrl(' https://cdn.example.com/a/1.mp3 ')).toBe('https://cdn.example.com/a/1.mp3');
	});
});
