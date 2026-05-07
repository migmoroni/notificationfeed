/**
 * Media runtime context resolver.
 *
 * Computes the active runtime constraints used by media ingestion
 * (network + power) and folds them into the final image/video
 * definition limits.
 *
 * Source priority:
 *  - Web build: browser APIs (`navigator.connection`, Battery API)
 *  - Tauri build: desktop snapshot from Rust command
 *  - Missing/unsupported source: safe defaults (`mobile` + `battery`)
 */

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

interface TauriRuntimeContextSnapshot {
	network?: string | null;
	power?: string | null;
}

let cachedNetworkMode: IngestionImageNetworkMode = 'mobile';
let cachedPowerMode: IngestionImagePowerMode = 'battery';
let webBatteryProbeInitialized = false;
let tauriProbeInitialized = false;
let tauriProbeInFlight = false;

/** True when running inside a Tauri webview. */
function isTauriEnvironment(): boolean {
	if (typeof window === 'undefined') return false;
	return '__TAURI_INTERNALS__' in window;
}

/** Normalize desktop network payload into the app runtime enum. */
function normalizeTauriNetworkMode(mode: string | null | undefined): IngestionImageNetworkMode {
	return mode === 'wifi' || mode === 'mobile' ? mode : 'mobile';
}

/** Normalize desktop power payload into the app runtime enum. */
function normalizeTauriPowerMode(mode: string | null | undefined): IngestionImagePowerMode {
	if (mode === 'charging' || mode === 'battery' || mode === 'lowBattery') return mode;
	return 'battery';
}

/**
 * Request runtime snapshot from Tauri once and keep values cached.
 *
 * The call is fire-and-forget on purpose so ingestion can proceed with
 * defaults while desktop data is loading.
 */
function ensureTauriProbe(): void {
	if (!isTauriEnvironment()) return;
	if (tauriProbeInitialized || tauriProbeInFlight) return;
	tauriProbeInFlight = true;

	void (async () => {
		try {
			const { tauriInvoke } = await import('$lib/platform/desktop/tauri-bridge.js');
			const snapshot = await tauriInvoke<TauriRuntimeContextSnapshot>('get_runtime_context_snapshot');
			cachedNetworkMode = normalizeTauriNetworkMode(snapshot?.network);
			cachedPowerMode = normalizeTauriPowerMode(snapshot?.power);
		} catch {
			cachedNetworkMode = 'mobile';
			cachedPowerMode = 'battery';
		} finally {
			tauriProbeInitialized = true;
			tauriProbeInFlight = false;
		}
	})();
}

if (isTauriEnvironment()) {
	ensureTauriProbe();
}

/** Match common cellular generation strings (`2g`..`5g`, `slow-2g`). */
function isCellularGenerationHint(value: string): boolean {
	if (!value) return false;
	return /(^|[^a-z0-9])(slow-2g|2g|3g|4g|5g)([^a-z0-9]|$)/i.test(value);
}

/**
 * Resolve network mode from browser hints only.
 *
 * `navigator.connection.type` is preferred; `effectiveType` is used as
 * fallback when engines expose generation but hide concrete transport.
 */
function detectWebNetworkMode(): IngestionImageNetworkMode {
	if (typeof navigator === 'undefined') return 'mobile';
	const nav = navigator as NavigatorWithRuntimeHints;
	const conn = nav.connection ?? nav.mozConnection ?? nav.webkitConnection;
	if (!conn) return 'mobile';

	const type = (conn.type ?? '').toLowerCase();
	const effectiveType = (conn.effectiveType ?? '').toLowerCase();
	if (type.includes('wifi') || type.includes('ethernet')) return 'wifi';
	if (type.includes('cellular')) return 'mobile';
	if (isCellularGenerationHint(type)) return 'mobile';

	// Fallback: some engines omit `type` but expose radio generation in `effectiveType`.
	if (!type || type === 'unknown') {
		if (isCellularGenerationHint(effectiveType)) return 'mobile';
	}

	return 'mobile';
}

/** Convert Battery API state into the app power mode semantics. */
function resolvePowerModeFromBattery(battery: BatteryManagerLike): IngestionImagePowerMode {
	if (battery.charging) return 'charging';
	const level = Number.isFinite(battery.level) ? battery.level : 1;
	return level <= LOW_BATTERY_LEVEL_THRESHOLD ? 'lowBattery' : 'battery';
}

/**
 * Initialize browser Battery API probe once and keep power mode synced
 * through `chargingchange` / `levelchange` events.
 */
function ensureBatteryProbe(): void {
	if (webBatteryProbeInitialized) return;
	webBatteryProbeInitialized = true;

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
			cachedPowerMode = 'battery';
		});
}

/** Resolve effective network mode according to active runtime source. */
function detectNetworkMode(): IngestionImageNetworkMode {
	if (isTauriEnvironment()) {
		ensureTauriProbe();
		return cachedNetworkMode;
	}

	cachedNetworkMode = detectWebNetworkMode();
	return cachedNetworkMode;
}

/** Resolve effective power mode according to active runtime source. */
function detectPowerMode(): IngestionImagePowerMode {
	if (isTauriEnvironment()) {
		ensureTauriProbe();
		return cachedPowerMode;
	}

	ensureBatteryProbe();
	return cachedPowerMode;
}

/**
 * Detect current runtime context used by media ingestion policy.
 *
 * Returns cached values when probes are still warming up so callers are
 * never blocked by async runtime APIs.
 */
export function detectMediaIngestionRuntimeContext(): MediaIngestionRuntimeContext {
	return {
		network: detectNetworkMode(),
		power: detectPowerMode()
	};
}

/** Merge optional caller overrides with detected runtime values. */
function resolveRuntimeContext(
	runtimeContext?: Partial<MediaIngestionRuntimeContext>
): MediaIngestionRuntimeContext {
	const detected = detectMediaIngestionRuntimeContext();
	return {
		network: runtimeContext?.network ?? detected.network,
		power: runtimeContext?.power ?? detected.power
	};
}

/** Pick the network profile branch active for the current runtime mode. */
function resolveByNetworkProfile(
	settings: IngestionSettings,
	network: IngestionImageNetworkMode
): IngestionMediaProfile {
	if (network === 'wifi') return settings.mediaIngestion.byNetwork.wifi;
	if (network === 'mobile') return settings.mediaIngestion.byNetwork.mobile;
	return settings.mediaIngestion.general;
}

/** Pick the power profile branch active for the current runtime mode. */
function resolveByPowerProfile(
	settings: IngestionSettings,
	power: IngestionImagePowerMode
): IngestionMediaProfile {
	if (power === 'charging') return settings.mediaIngestion.byPower.charging;
	if (power === 'battery') return settings.mediaIngestion.byPower.battery;
	if (power === 'lowBattery') return settings.mediaIngestion.byPower.lowBattery;
	return settings.mediaIngestion.general;
}

/**
 * Resolve final media definitions (`imageMaxWidth`, `videoInitialHeight`)
 * from settings + runtime context.
 *
 * The strictest enabled value wins across `general`, `byNetwork`, and
 * `byPower`. If any active profile disables a dimension (`null`), the
 * resulting definition for that dimension is also `null`.
 */
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