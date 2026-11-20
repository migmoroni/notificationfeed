import { describe, expect, it } from 'vitest';
import { getAudioQualityCandidates, resolveIngestionAudioUrl } from './audio-quality.js';

describe('audio-quality', () => {
	it('normalizes spotify URL to canonical open.spotify URL first', () => {
		const source = 'https://open.spotify.com/embed/track/4uLU6hMCjMI75M1A2tKUQC';
		const candidates = getAudioQualityCandidates(source);
		expect(candidates[0]).toBe('https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC');
		expect(candidates).toContain(source);
	});

	it('normalizes soundcloud player URL to underlying soundcloud URL first', () => {
		const source = 'https://w.soundcloud.com/player/?url=https%3A%2F%2Fsoundcloud.com%2Fforss%2Fflickermood';
		const candidates = getAudioQualityCandidates(source);
		expect(candidates[0]).toBe('https://soundcloud.com/forss/flickermood');
		expect(candidates).toContain(source);
	});

	it('keeps direct audio URL unchanged', () => {
		const source = 'https://cdn.example.com/media/podcast.mp3';
		expect(resolveIngestionAudioUrl(source)).toBe(source);
	});

	it('returns undefined for empty input', () => {
		expect(resolveIngestionAudioUrl(null)).toBeUndefined();
	});
});
