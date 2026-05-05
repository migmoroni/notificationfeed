import { describe, expect, it } from 'vitest';
import { getImageQualityCandidates, rememberWorkingImageCandidate } from './media.js';

describe('getImageQualityCandidates', () => {
	it('upgrades a numeric dimension segment in image path', () => {
		const source = 'https://cdn.portal.com/media/standard/240/world/photo.jpg';
		const candidates = getImageQualityCandidates(source);

		expect(candidates[0]).toBe('https://cdn.portal.com/media/standard/2048/world/photo.jpg');
		expect(candidates[candidates.length - 1]).toBe(source);
	});

	it('upgrades a width x height segment preserving ratio', () => {
		const source = 'https://images.portal.com/thumbs/320x180/report.jpg';
		const candidates = getImageQualityCandidates(source);

		expect(candidates[0]).toBe('https://images.portal.com/thumbs/2048x1152/report.jpg');
		expect(candidates[candidates.length - 1]).toBe(source);
	});

	it('tries higher query width and quality, then falls back to original', () => {
		const source = 'https://example.com/image.jpg?w=320&h=180&q=60';
		const candidates = getImageQualityCandidates(source);

		expect(candidates[0]).toBe('https://example.com/image.jpg?w=2048&h=1152&q=90');
		expect(candidates[1]).toBe('https://example.com/image.jpg?w=1600&h=900&q=90');
		expect(candidates[candidates.length - 1]).toBe(source);
	});

	it('returns only original url when no upgrade rule applies', () => {
		const source = 'https://example.com/static/photo.png';
		const candidates = getImageQualityCandidates(source);

		expect(candidates).toEqual([source]);
	});

	it('prioritizes locally remembered successful candidate', () => {
		const source = 'https://example.com/image.jpg?w=320';
		const remembered = 'https://example.com/image.jpg?w=1600';

		rememberWorkingImageCandidate(source, remembered);
		const candidates = getImageQualityCandidates(source);

		expect(candidates[0]).toBe(remembered);
		expect(candidates[candidates.length - 1]).toBe(source);
	});
});
