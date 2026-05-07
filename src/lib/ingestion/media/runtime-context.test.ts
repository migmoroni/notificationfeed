import { describe, expect, it } from 'vitest';
import { createIngestionSettings } from '$lib/domain/ingestion/ingestion-settings.js';
import { resolveMediaIngestionRuntimeDefinitions } from './runtime-context.js';

type NavigatorWithConnection = Navigator & {
	connection?: {
		type?: string;
		effectiveType?: string;
		saveData?: boolean;
	};
};

function withNavigatorConnection<T>(
	connection: NavigatorWithConnection['connection'],
	run: () => T
): T {
	if (typeof navigator === 'undefined') return run();

	const nav = navigator as NavigatorWithConnection;
	const original = nav.connection;
	Object.defineProperty(nav, 'connection', {
		value: connection,
		configurable: true
	});

	try {
		return run();
	} finally {
		Object.defineProperty(nav, 'connection', {
			value: original,
			configurable: true
		});
	}
}

describe('runtime-context', () => {
	it('resolves the strictest media definitions between general, network and power', () => {
		const settings = createIngestionSettings();
		settings.mediaIngestion.general.imageMaxWidth = 2048;
		settings.mediaIngestion.general.videoInitialHeight = 1080;
		settings.mediaIngestion.byNetwork.mobile.imageMaxWidth = 1024;
		settings.mediaIngestion.byNetwork.mobile.videoInitialHeight = 720;
		settings.mediaIngestion.byPower.battery.imageMaxWidth = 640;
		settings.mediaIngestion.byPower.battery.videoInitialHeight = 480;

		const definitions = resolveMediaIngestionRuntimeDefinitions({
			settings,
			runtimeContext: {
				network: 'mobile',
				power: 'battery'
			}
		});

		expect(definitions.imageMaxWidth).toBe(640);
		expect(definitions.videoInitialHeight).toBe(480);
	});

	it('returns null definitions when any active profile disables ingestion', () => {
		const settings = createIngestionSettings();
		settings.mediaIngestion.byPower.lowBattery.imageMaxWidth = null;
		settings.mediaIngestion.byPower.lowBattery.videoInitialHeight = null;

		const definitions = resolveMediaIngestionRuntimeDefinitions({
			settings,
			runtimeContext: {
				network: 'wifi',
				power: 'lowBattery'
			}
		});

		expect(definitions.imageMaxWidth).toBeNull();
		expect(definitions.videoInitialHeight).toBeNull();
	});

	it('uses general profile when runtime context is default/default', () => {
		const settings = createIngestionSettings();
		settings.mediaIngestion.general.imageMaxWidth = 1280;
		settings.mediaIngestion.general.videoInitialHeight = 720;
		settings.mediaIngestion.byNetwork.wifi.imageMaxWidth = 640;
		settings.mediaIngestion.byPower.battery.videoInitialHeight = 360;

		const definitions = resolveMediaIngestionRuntimeDefinitions({
			settings,
			runtimeContext: {
				network: 'default',
				power: 'default'
			}
		});

		expect(definitions.imageMaxWidth).toBe(1280);
		expect(definitions.videoInitialHeight).toBe(720);
	});

	it('detects wifi from OS connection type even with data saver enabled', () => {
		withNavigatorConnection({ type: 'wifi', effectiveType: '4g', saveData: true }, () => {
			const definitions = resolveMediaIngestionRuntimeDefinitions();
			expect(definitions.context.network).toBe('wifi');
		});
	});

	it('detects mobile from cellular generation when type is unknown', () => {
		withNavigatorConnection({ type: 'unknown', effectiveType: '4g' }, () => {
			const definitions = resolveMediaIngestionRuntimeDefinitions();
			expect(definitions.context.network).toBe('mobile');
		});
	});
});