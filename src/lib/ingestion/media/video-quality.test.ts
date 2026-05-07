import { describe, expect, it } from 'vitest';
import { getVideoQualityCandidates, resolveIngestionVideoUrl } from './video-quality.js';
import { createIngestionSettings } from '$lib/domain/ingestion/ingestion-settings.js';
import { resolveMediaIngestionRuntimeDefinitions } from './runtime-context.js';

describe('video-quality', () => {
	it('normalizes youtube URL to canonical watch URL first', () => {
		const source = 'https://youtu.be/dQw4w9WgXcQ';
		const candidates = getVideoQualityCandidates(source);
		expect(candidates[0]).toBe('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
		expect(candidates).toContain(source);
	});

	it('applies initial video resolution hint for youtube when requested', () => {
		const source = 'https://youtu.be/dQw4w9WgXcQ';
		const resolved = resolveIngestionVideoUrl(source, { initialHeight: 720 });
		expect(resolved).toBe('https://www.youtube.com/watch?v=dQw4w9WgXcQ&vq=hd720&height=720');
	});

	it('applies initial video resolution hint for vimeo when requested', () => {
		const source = 'https://vimeo.com/148751763';
		const resolved = resolveIngestionVideoUrl(source, { initialHeight: 720 });
		expect(resolved).toBe('https://vimeo.com/148751763?quality=720p&height=720');
	});

	it('applies initial video resolution hint for dailymotion when requested', () => {
		const source = 'https://www.dailymotion.com/video/x84sh87';
		const resolved = resolveIngestionVideoUrl(source, { initialHeight: 720 });
		expect(resolved).toBe('https://www.dailymotion.com/video/x84sh87?quality=720&height=720');
	});

	it('keeps direct video URL unchanged', () => {
		const source = 'https://cdn.example.com/media/clip.mp4';
		expect(resolveIngestionVideoUrl(source)).toBe(source);
	});

	it('uses mediaIngestion profile to resolve runtime initial video resolution', () => {
		const source = 'https://youtu.be/dQw4w9WgXcQ';
		const settings = createIngestionSettings();
		settings.mediaIngestion.general.videoInitialHeight = 1080;
		settings.mediaIngestion.byNetwork.mobile.videoInitialHeight = 720;
		settings.mediaIngestion.byPower.battery.videoInitialHeight = 480;
		const definitions = resolveMediaIngestionRuntimeDefinitions({
			settings,
			runtimeContext: {
				network: 'mobile',
				power: 'battery'
			}
		});

		const resolved = resolveIngestionVideoUrl(source, { initialHeight: definitions.videoInitialHeight });

		expect(resolved).toBe('https://www.youtube.com/watch?v=dQw4w9WgXcQ&vq=large&height=480');
	});

	it('uses lowBattery profile when runtime power mode is lowBattery', () => {
		const source = 'https://youtu.be/dQw4w9WgXcQ';
		const settings = createIngestionSettings();
		settings.mediaIngestion.general.videoInitialHeight = 1080;
		settings.mediaIngestion.byPower.lowBattery.videoInitialHeight = 360;
		const definitions = resolveMediaIngestionRuntimeDefinitions({
			settings,
			runtimeContext: {
				network: 'wifi',
				power: 'lowBattery'
			}
		});

		const resolved = resolveIngestionVideoUrl(source, { initialHeight: definitions.videoInitialHeight });

		expect(resolved).toBe('https://www.youtube.com/watch?v=dQw4w9WgXcQ&vq=medium&height=360');
	});

	it('returns undefined for empty input', () => {
		expect(resolveIngestionVideoUrl(null)).toBeUndefined();
	});
});
