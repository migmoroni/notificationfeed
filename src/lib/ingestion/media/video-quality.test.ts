import { describe, expect, it } from 'vitest';
import { getVideoQualityCandidates, resolveIngestionVideoUrl } from './video-quality.js';

describe('video-quality', () => {
	it('normalizes youtube URL to canonical watch URL first', () => {
		const source = 'https://youtu.be/dQw4w9WgXcQ';
		const candidates = getVideoQualityCandidates(source);
		expect(candidates[0]).toBe('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
		expect(candidates).toContain(source);
	});

	it('keeps direct video URL unchanged', () => {
		const source = 'https://cdn.example.com/media/clip.mp4';
		expect(resolveIngestionVideoUrl(source)).toBe(source);
	});

	it('returns undefined for empty input', () => {
		expect(resolveIngestionVideoUrl(null)).toBeUndefined();
	});
});
