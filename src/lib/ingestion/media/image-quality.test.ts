import { describe, expect, it } from 'vitest';
import { getImageQualityCandidates, resolveIngestionImageUrl } from './image-quality.js';
import { createIngestionSettings } from '$lib/domain/ingestion/ingestion-settings.js';
import { resolveMediaIngestionRuntimeDefinitions } from './runtime-context.js';

describe('image-quality', () => {
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

	it('resolves ingestion image to best candidate', () => {
		const source = 'https://example.com/image.jpg?w=320&h=180&q=60';
		expect(resolveIngestionImageUrl(source)).toBe('https://example.com/image.jpg?w=2048&h=1152&q=90');
	});

	it('respects max width caps when generating candidates', () => {
		const source = 'https://cdn.portal.com/media/standard/240/world/photo.jpg';
		const candidates = getImageQualityCandidates(source, { maxWidth: 1024 });

		expect(candidates[0]).toBe('https://cdn.portal.com/media/standard/1024/world/photo.jpg');
		expect(candidates).not.toContain('https://cdn.portal.com/media/standard/2048/world/photo.jpg');
		expect(candidates[candidates.length - 1]).toBe(source);
	});

	it('disables ingestion image when resolved max width is null', () => {
		const source = 'https://example.com/image.jpg?w=320&h=180&q=60';
		const settings = createIngestionSettings();
		settings.mediaIngestion.byNetwork.mobile.imageMaxWidth = null;
		const definitions = resolveMediaIngestionRuntimeDefinitions({
			settings,
			runtimeContext: {
				network: 'mobile',
				power: 'charging'
			}
		});

		const resolved = resolveIngestionImageUrl(source, { maxWidth: definitions.imageMaxWidth });

		expect(resolved).toBeUndefined();
	});

	it('applies the stricter limit between network and power contexts', () => {
		const source = 'https://example.com/image.jpg?w=320&h=180&q=60';
		const settings = createIngestionSettings();
		settings.mediaIngestion.byNetwork.mobile.imageMaxWidth = 1024;
		settings.mediaIngestion.byPower.battery.imageMaxWidth = 640;
		const definitions = resolveMediaIngestionRuntimeDefinitions({
			settings,
			runtimeContext: {
				network: 'mobile',
				power: 'battery'
			}
		});

		const resolved = resolveIngestionImageUrl(source, { maxWidth: definitions.imageMaxWidth });

		expect(resolved).toBe('https://example.com/image.jpg?w=640&h=360&q=90');
	});

	it('uses lowBattery profile when runtime power mode is lowBattery', () => {
		const source = 'https://example.com/image.jpg?w=320&h=180&q=60';
		const settings = createIngestionSettings();
		settings.mediaIngestion.byNetwork.wifi.imageMaxWidth = 2048;
		settings.mediaIngestion.byPower.lowBattery.imageMaxWidth = 800;
		const definitions = resolveMediaIngestionRuntimeDefinitions({
			settings,
			runtimeContext: {
				network: 'wifi',
				power: 'lowBattery'
			}
		});

		const resolved = resolveIngestionImageUrl(source, { maxWidth: definitions.imageMaxWidth });

		expect(resolved).toBe('https://example.com/image.jpg?w=800&h=450&q=90');
	});
});
