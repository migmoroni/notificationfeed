import {
	createIngestionSettings,
	normalizeIngestionSettings,
	type IngestionImageMaxWidth,
	type IngestionImageNetworkMode,
	type IngestionImagePowerMode,
	type IngestionMediaProfile,
	type IngestionSettings,
	type IngestionVideoInitialHeight
} from '$lib/domain/ingestion/ingestion-settings.js';

const LOW_BATTERY_LEVEL_THRESHOLD = 0.2;

interface NetworkInformationLike {
	type?: string;
	effectiveType?: string;
	saveData?: boolean;
}

interface BatteryManagerLike {
	charging: boolean;
	level: number;
	addEventListener?: (event: 'chargingchange' | 'levelchange', listener: () => void) => void;
}

type NavigatorWithRuntimeHints = Navigator & {
	connection?: NetworkInformationLike;
	mozConnection?: NetworkInformationLike;
	webkitConnection?: NetworkInformationLike;
	getBattery?: () => Promise<BatteryManagerLike>;
};

export interface MediaIngestionRuntimeContext {
	network: IngestionImageNetworkMode;
	power: IngestionImagePowerMode;
}

export interface ResolveMediaIngestionRuntimeDefinitionsOptions {
	settings?: IngestionSettings | null;
	runtimeContext?: Partial<MediaIngestionRuntimeContext>;
}

export interface MediaIngestionRuntimeDefinitions {
	context: MediaIngestionRuntimeContext;
	imageMaxWidth: IngestionImageMaxWidth;
	videoInitialHeight: IngestionVideoInitialHeight;
}

let cachedPowerMode: IngestionImagePowerMode = 'default';
let batteryProbeInitialized = false;

function isCellularGenerationHint(value: string): boolean {
	if (!value) return false;
	return /(^|[^a-z0-9])(slow-2g|2g|3g|4g|5g)([^a-z0-9]|$)/i.test(value);
}

function detectNetworkMode(): IngestionImageNetworkMode {
	if (typeof navigator === 'undefined') return 'default';
	const nav = navigator as NavigatorWithRuntimeHints;
	const conn = nav.connection ?? nav.mozConnection ?? nav.webkitConnection;
	if (!conn) return 'default';

	const type = (conn.type ?? '').toLowerCase();
	const effectiveType = (conn.effectiveType ?? '').toLowerCase();
	if (type.includes('wifi') || type.includes('ethernet')) return 'wifi';
	if (type.includes('cellular')) return 'mobile';
	if (isCellularGenerationHint(type)) return 'mobile';

	// Fallback: some engines omit `type` but expose radio generation in `effectiveType`.
	if (!type || type === 'unknown') {
		if (isCellularGenerationHint(effectiveType)) return 'mobile';
	}

	return 'default';
}

function resolvePowerModeFromBattery(battery: BatteryManagerLike): IngestionImagePowerMode {
	if (battery.charging) return 'charging';
	const level = Number.isFinite(battery.level) ? battery.level : 1;
	return level <= LOW_BATTERY_LEVEL_THRESHOLD ? 'lowBattery' : 'battery';
}

function ensureBatteryProbe(): void {
	if (batteryProbeInitialized) return;
	batteryProbeInitialized = true;

	if (typeof navigator === 'undefined') return;
	const nav = navigator as NavigatorWithRuntimeHints;
	if (typeof nav.getBattery !== 'function') return;

	void nav
		.getBattery()
		.then((battery) => {
			const sync = () => {
				cachedPowerMode = resolvePowerModeFromBattery(battery);
			};
			sync();
			battery.addEventListener?.('chargingchange', sync);
			battery.addEventListener?.('levelchange', sync);
		})
		.catch(() => {
			cachedPowerMode = 'default';
		});
}

function detectPowerMode(): IngestionImagePowerMode {
	ensureBatteryProbe();
	return cachedPowerMode;
}

export function detectMediaIngestionRuntimeContext(): MediaIngestionRuntimeContext {
	return {
		network: detectNetworkMode(),
		power: detectPowerMode()
	};
}

function resolveRuntimeContext(
	runtimeContext?: Partial<MediaIngestionRuntimeContext>
): MediaIngestionRuntimeContext {
	const detected = detectMediaIngestionRuntimeContext();
	return {
		network: runtimeContext?.network ?? detected.network,
		power: runtimeContext?.power ?? detected.power
	};
}

function resolveByNetworkProfile(
	settings: IngestionSettings,
	network: IngestionImageNetworkMode
): IngestionMediaProfile {
	if (network === 'wifi') return settings.mediaIngestion.byNetwork.wifi;
	if (network === 'mobile') return settings.mediaIngestion.byNetwork.mobile;
	return settings.mediaIngestion.general;
}

function resolveByPowerProfile(
	settings: IngestionSettings,
	power: IngestionImagePowerMode
): IngestionMediaProfile {
	if (power === 'charging') return settings.mediaIngestion.byPower.charging;
	if (power === 'battery') return settings.mediaIngestion.byPower.battery;
	if (power === 'lowBattery') return settings.mediaIngestion.byPower.lowBattery;
	return settings.mediaIngestion.general;
}

export function resolveMediaIngestionRuntimeDefinitions(
	options: ResolveMediaIngestionRuntimeDefinitionsOptions = {}
): MediaIngestionRuntimeDefinitions {
	const normalized = normalizeIngestionSettings(options.settings ?? createIngestionSettings());
	const context = resolveRuntimeContext(options.runtimeContext);

	const general = normalized.mediaIngestion.general;
	const network = resolveByNetworkProfile(normalized, context.network);
	const power = resolveByPowerProfile(normalized, context.power);

	const imageMaxWidth =
		general.imageMaxWidth == null || network.imageMaxWidth == null || power.imageMaxWidth == null
			? null
			: (Math.min(general.imageMaxWidth, network.imageMaxWidth, power.imageMaxWidth) as IngestionImageMaxWidth);

	const videoInitialHeight =
		general.videoInitialHeight == null ||
		network.videoInitialHeight == null ||
		power.videoInitialHeight == null
			? null
			: (Math.min(
					general.videoInitialHeight,
					network.videoInitialHeight,
					power.videoInitialHeight
				) as IngestionVideoInitialHeight);

	return {
		context,
		imageMaxWidth,
		videoInitialHeight
	};
}