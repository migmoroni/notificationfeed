import { describe, expect, it } from 'vitest';
import { extractFirstImageUrlFromText, isLikelyImageUrl } from './image-capture.js';

describe('image-capture', () => {
	it('detects common image URLs', () => {
		expect(isLikelyImageUrl('https://cdn.example.com/photos/pic.webp')).toBe(true);
		expect(isLikelyImageUrl('https://cdn.example.com/img/cover.jpg')).toBe(true);
	});

	it('does not classify video URLs as images even under /media paths', () => {
		expect(isLikelyImageUrl('https://cdn.example.com/media/post-v1.mp4')).toBe(false);
		expect(isLikelyImageUrl('https://cdn.example.com/media/post-v1.m3u8')).toBe(false);
	});

	it('extracts first image URL from plain text and skips video URLs', () => {
		const text =
			'watch https://cdn.example.com/media/post-v1.mp4 then see https://cdn.example.com/photos/post-v1.webp';
		expect(extractFirstImageUrlFromText(text)).toBe('https://cdn.example.com/photos/post-v1.webp');
	});
});
