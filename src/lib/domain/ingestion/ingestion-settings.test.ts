import { describe, expect, it } from 'vitest';
import { createIngestionSettings, normalizeIngestionSettings } from './ingestion-settings.js';

describe('ingestion-settings', () => {
	it('applies General media cap for image and initial video profiles', () => {
		const settings = createIngestionSettings();
		settings.mediaIngestion.general.imageMaxWidth = 1024;
		settings.mediaIngestion.general.videoInitialHeight = 720;

		settings.mediaIngestion.byNetwork.wifi.imageMaxWidth = 2048;
		settings.mediaIngestion.byNetwork.wifi.videoInitialHeight = 1080;
		settings.mediaIngestion.byNetwork.mobile.imageMaxWidth = 800;
		settings.mediaIngestion.byNetwork.mobile.videoInitialHeight = 480;
		settings.mediaIngestion.byPower.charging.imageMaxWidth = 1600;
		settings.mediaIngestion.byPower.charging.videoInitialHeight = 1080;
		settings.mediaIngestion.byPower.lowBattery.imageMaxWidth = 1280;
		settings.mediaIngestion.byPower.lowBattery.videoInitialHeight = 1080;

		const normalized = normalizeIngestionSettings(settings);

		expect(normalized.mediaIngestion.byNetwork.wifi.imageMaxWidth).toBe(1024);
		expect(normalized.mediaIngestion.byNetwork.wifi.videoInitialHeight).toBe(720);
		expect(normalized.mediaIngestion.byNetwork.mobile.imageMaxWidth).toBe(800);
		expect(normalized.mediaIngestion.byNetwork.mobile.videoInitialHeight).toBe(480);
		expect(normalized.mediaIngestion.byPower.charging.imageMaxWidth).toBe(1024);
		expect(normalized.mediaIngestion.byPower.charging.videoInitialHeight).toBe(720);
		expect(normalized.mediaIngestion.byPower.lowBattery.imageMaxWidth).toBe(1024);
		expect(normalized.mediaIngestion.byPower.lowBattery.videoInitialHeight).toBe(720);
	});

	it('forces all profiles to null when General media profile is null', () => {
		const settings = createIngestionSettings();
		settings.mediaIngestion.general.imageMaxWidth = null;
		settings.mediaIngestion.general.videoInitialHeight = null;
		settings.mediaIngestion.byNetwork.wifi.imageMaxWidth = 2048;
		settings.mediaIngestion.byNetwork.wifi.videoInitialHeight = 1080;
		settings.mediaIngestion.byPower.battery.imageMaxWidth = 640;
		settings.mediaIngestion.byPower.battery.videoInitialHeight = 360;
		settings.mediaIngestion.byPower.lowBattery.imageMaxWidth = 800;
		settings.mediaIngestion.byPower.lowBattery.videoInitialHeight = 480;

		const normalized = normalizeIngestionSettings(settings);

		expect(normalized.mediaIngestion.byNetwork.wifi.imageMaxWidth).toBeNull();
		expect(normalized.mediaIngestion.byNetwork.wifi.videoInitialHeight).toBeNull();
		expect(normalized.mediaIngestion.byPower.battery.imageMaxWidth).toBeNull();
		expect(normalized.mediaIngestion.byPower.battery.videoInitialHeight).toBeNull();
		expect(normalized.mediaIngestion.byPower.lowBattery.imageMaxWidth).toBeNull();
		expect(normalized.mediaIngestion.byPower.lowBattery.videoInitialHeight).toBeNull();
	});
});
