/**
 * Ingestion settings — per-user configuration for the PostManager.
 *
 * Embedded in `UserSettings.ingestion`. All durations are in milliseconds and
 * day-counts are integers. `proxyServices` defines the CORS proxy chain used
 * by the web HTTP adapter (Tauri ignores it via `tauri-plugin-http`).
 */

import {
	INGESTION_HTTP_FEED_TRANSPORT_DEFAULTS,
	INGESTION_IPFS_FEED_TRANSPORT_DEFAULTS
} from '$lib/config/back-settings.js';

export interface ProxyConfig {
	/** Template URL with `{url}` placeholder for the encoded target. */
	url: string;
	/** Display label shown in settings UI. */
	label: string;
}

export interface IpfsGatewayConfig {
	/** Base gateway URL (e.g. https://w3s.link). */
	url: string;
	/** Display label shown in settings UI. */
	label: string;
}

export type FeedKind = 'rss' | 'atom' | 'jsonfeed';

export interface FeedTransportRule {
	/** Try direct URL fetch before trying proxies. */
	directEnabled: boolean;
	/** Use configured proxies after a direct failure. */
	proxyFallbackEnabled: boolean;
}

export interface IpfsFeedTransportRule {
	/** Try Helia direct resolution before HTTP fallback chain. */
	directEnabled: boolean;
	/** Allow direct HTTP gateway targets as fallback. */
	gatewayEnabled: boolean;
	/** Allow proxy-wrapped gateway targets as fallback. */
	proxyEnabled: boolean;
}

export interface FeedTransportByKind {
	rss: FeedTransportRule;
	atom: FeedTransportRule;
	jsonfeed: FeedTransportRule;
}

export interface IpfsFeedTransportByKind {
	rss: IpfsFeedTransportRule;
	atom: IpfsFeedTransportRule;
	jsonfeed: IpfsFeedTransportRule;
}

export type IngestionImageMaxWidth = 2048 | 1600 | 1280 | 1024 | 800 | 640 | null;
export type IngestionVideoInitialHeight = 1080 | 720 | 480 | 360 | 240 | null;
export type IngestionImageNetworkMode = 'default' | 'wifi' | 'mobile';
export type IngestionImagePowerMode = 'default' | 'charging' | 'battery' | 'lowBattery';

export interface IngestionMediaProfile {
	/** Max target width for image ingestion. Null disables image ingestion. */
	imageMaxWidth: IngestionImageMaxWidth;
	/** Initial video resolution hint (in p). Null = keep provider/default behavior. */
	videoInitialHeight: IngestionVideoInitialHeight;
}

export interface IngestionMediaByNetwork {
	wifi: IngestionMediaProfile;
	mobile: IngestionMediaProfile;
}

export interface IngestionMediaByPower {
	charging: IngestionMediaProfile;
	battery: IngestionMediaProfile;
	lowBattery: IngestionMediaProfile;
}

export interface IngestionMediaSettings {
	/** Shared global cap profile applied to both network and power profiles. */
	general: IngestionMediaProfile;
	/** Context-specific profile selected by current network condition. */
	byNetwork: IngestionMediaByNetwork;
	/** Context-specific profile selected by current power condition. */
	byPower: IngestionMediaByPower;
}

export interface IngestionSettings {
	/** How often the foreground scheduler wakes up to evaluate due fonts (ms). */
	schedulerTickIntervalMs: number;

	/**
	 * Polling interval (ms) for this user's fonts while the user is the
	 * active (foreground) user — i.e. actively interacting with the app.
	 */
	activeFontIntervalMs: number;

	/**
	 * Polling interval (ms) used while the user has been idle for less
	 * than `idleTier1MaxIdleMs`. Default: 30min.
	 */
	idleTier1IntervalMs: number;
	/**
	 * Upper bound (ms since last interaction) for tier-1. Default 24h.
	 * Below this → use `idleTier1IntervalMs`.
	 */
	idleTier1MaxIdleMs: number;

	/**
	 * Polling interval (ms) used while the user's idle time is between
	 * `idleTier1MaxIdleMs` and `idleTier2MaxIdleMs`. Default: 4h.
	 */
	idleTier2IntervalMs: number;
	/**
	 * Upper bound (ms since last interaction) for tier-2. Default 72h.
	 * Below this (and above tier-1) → use `idleTier2IntervalMs`.
	 */
	idleTier2MaxIdleMs: number;

	/**
	 * Polling interval (ms) used after `idleTier2MaxIdleMs`. Default: 24h.
	 */
	idleTier3IntervalMs: number;

	/**
	 * On activation of a font, copy historical posts already cached in
	 * sibling user boxes into the current user's box, so the feed
	 * populates instantly.
	 */
	backfillOnActivate: boolean;
	/**
	 * On activation of a font, force an immediate network fetch (bypasses
	 * the per-font `nextScheduledAt` window). Disable to wait for the
	 * regular polling cycle instead.
	 */
	refreshOnActivate: boolean;

	/** Posts ingested longer ago than this in active sources auto-move to trash (days). */
	trashAgeActiveDays: number;
	/**
	 * Posts ingested longer ago than this on fonts the user has *deactivated* (still
	 * have residual posts in this user's box) auto-move to trash. This
	 * is a per-user judgment: other users keeping the same font active
	 * are unaffected.
	 */
	trashAgeOrphanDays: number;
	/** Posts in trash for longer than this are physically purged (days). */
	purgeAfterTrashDays: number;

	/** Ordered list; first 2xx response wins. */
	proxyServices: ProxyConfig[];

	/** Ordered list; first successful gateway response wins. */
	ipfsGatewayServices: IpfsGatewayConfig[];

	/** Per-feed transport order (direct/proxy fallback) for HTTP(S) feed URLs. */
	httpFeedTransportByKind: FeedTransportByKind;
	/** Per-feed transport order for IPFS/IPNS URLs (Helia direct + gateway/proxy fallback). */
	ipfsFeedTransportByKind: IpfsFeedTransportByKind;

	/**
	 * Media URL quality policy used during ingestion.
	 *
	 * Final profile is computed as the most restrictive value between
	 * the active general profile, active network profile and active
	 * power profile.
	 */
	mediaIngestion: IngestionMediaSettings;
}

export const DEFAULT_PROXIES: ProxyConfig[] = [
	{ url: 'https://corsproxy.io/?{url}', label: 'corsproxy.io' },
	{ url: 'https://api.rss2json.com/v1/api.json?rss_url={url}', label: 'rss2json' }
];

export const DEFAULT_IPFS_GATEWAYS: IpfsGatewayConfig[] = [
	{ url: 'https://w3s.link', label: 'w3s.link' },
	{ url: 'https://dweb.link', label: 'dweb.link' },
	{ url: 'https://ipfs.io', label: 'ipfs.io' }
];

export const DEFAULT_HTTP_FEED_TRANSPORT_BY_KIND: FeedTransportByKind = {
	rss: { ...INGESTION_HTTP_FEED_TRANSPORT_DEFAULTS.rss },
	atom: { ...INGESTION_HTTP_FEED_TRANSPORT_DEFAULTS.atom },
	jsonfeed: { ...INGESTION_HTTP_FEED_TRANSPORT_DEFAULTS.jsonfeed }
};

export const DEFAULT_IPFS_FEED_TRANSPORT_BY_KIND: IpfsFeedTransportByKind = {
	rss: { ...INGESTION_IPFS_FEED_TRANSPORT_DEFAULTS.rss },
	atom: { ...INGESTION_IPFS_FEED_TRANSPORT_DEFAULTS.atom },
	jsonfeed: { ...INGESTION_IPFS_FEED_TRANSPORT_DEFAULTS.jsonfeed }
};

export const DEFAULT_MEDIA_INGESTION_SETTINGS: IngestionMediaSettings = {
	general: {
		imageMaxWidth: 2048,
		videoInitialHeight: 1080
	},
	byNetwork: {
		wifi: {
			imageMaxWidth: 2048,
			videoInitialHeight: 1080
		},
		mobile: {
			imageMaxWidth: 2048,
			videoInitialHeight: 1080
		}
	},
	byPower: {
		charging: {
			imageMaxWidth: 2048,
			videoInitialHeight: 1080
		},
		battery: {
			imageMaxWidth: 2048,
			videoInitialHeight: 1080
		},
		lowBattery: {
			imageMaxWidth: 2048,
			videoInitialHeight: 1080
		}
	}
};

function capImageWidthByGeneral(
	value: IngestionImageMaxWidth,
	general: IngestionImageMaxWidth
): IngestionImageMaxWidth {
	if (general == null) return null;
	if (value == null) return null;
	return value > general ? general : value;
}

function capVideoInitialHeightByGeneral(
	value: IngestionVideoInitialHeight,
	general: IngestionVideoInitialHeight
): IngestionVideoInitialHeight {
	if (general == null) return null;
	if (value == null) return null;
	return value > general ? general : value;
}

function capMediaProfileByGeneral(
	profile: IngestionMediaProfile,
	general: IngestionMediaProfile
): IngestionMediaProfile {
	return {
		imageMaxWidth: capImageWidthByGeneral(profile.imageMaxWidth, general.imageMaxWidth),
		videoInitialHeight: capVideoInitialHeightByGeneral(profile.videoInitialHeight, general.videoInitialHeight)
	};
}

function normalizeMediaIngestionSettings(mediaIngestion: IngestionMediaSettings): IngestionMediaSettings {
	const general = mediaIngestion.general;

	const byNetwork = {
		...mediaIngestion.byNetwork
	};
	byNetwork.wifi = capMediaProfileByGeneral(byNetwork.wifi, general);
	byNetwork.mobile = capMediaProfileByGeneral(byNetwork.mobile, general);

	const byPower = {
		...mediaIngestion.byPower
	};
	byPower.charging = capMediaProfileByGeneral(byPower.charging, general);
	byPower.battery = capMediaProfileByGeneral(byPower.battery, general);
	byPower.lowBattery = capMediaProfileByGeneral(byPower.lowBattery, general);

	return {
		general,
		byNetwork,
		byPower
	};
}

function pickDefined<T>(value: T | undefined, fallback: T): T {
	return value === undefined ? fallback : value;
}

export function createIngestionSettings(): IngestionSettings {
	return {
		schedulerTickIntervalMs: 30_000,
		activeFontIntervalMs: 5 * 60_000,
		idleTier1IntervalMs: 30 * 60_000,
		idleTier1MaxIdleMs: 24 * 60 * 60_000,
		idleTier2IntervalMs: 4 * 60 * 60_000,
		idleTier2MaxIdleMs: 72 * 60 * 60_000,
		idleTier3IntervalMs: 24 * 60 * 60_000,
		backfillOnActivate: true,
		refreshOnActivate: true,
		trashAgeActiveDays: 180,
		trashAgeOrphanDays: 30,
		purgeAfterTrashDays: 30,
		proxyServices: [...DEFAULT_PROXIES],
		ipfsGatewayServices: [...DEFAULT_IPFS_GATEWAYS],
		httpFeedTransportByKind: {
			rss: { ...DEFAULT_HTTP_FEED_TRANSPORT_BY_KIND.rss },
			atom: { ...DEFAULT_HTTP_FEED_TRANSPORT_BY_KIND.atom },
			jsonfeed: { ...DEFAULT_HTTP_FEED_TRANSPORT_BY_KIND.jsonfeed }
		},
		ipfsFeedTransportByKind: {
			rss: { ...DEFAULT_IPFS_FEED_TRANSPORT_BY_KIND.rss },
			atom: { ...DEFAULT_IPFS_FEED_TRANSPORT_BY_KIND.atom },
			jsonfeed: { ...DEFAULT_IPFS_FEED_TRANSPORT_BY_KIND.jsonfeed }
		},
		mediaIngestion: {
			general: {
				...DEFAULT_MEDIA_INGESTION_SETTINGS.general
			},
			byNetwork: {
				wifi: { ...DEFAULT_MEDIA_INGESTION_SETTINGS.byNetwork.wifi },
				mobile: { ...DEFAULT_MEDIA_INGESTION_SETTINGS.byNetwork.mobile }
			},
			byPower: {
				charging: { ...DEFAULT_MEDIA_INGESTION_SETTINGS.byPower.charging },
				battery: { ...DEFAULT_MEDIA_INGESTION_SETTINGS.byPower.battery },
				lowBattery: { ...DEFAULT_MEDIA_INGESTION_SETTINGS.byPower.lowBattery }
			}
		}
	};
}

export function normalizeIngestionSettings(settings: IngestionSettings | null | undefined): IngestionSettings {
	const defaults = createIngestionSettings();
	if (!settings) return defaults;

	return {
		...defaults,
		...settings,
		proxyServices: settings.proxyServices ? [...settings.proxyServices] : [...defaults.proxyServices],
		ipfsGatewayServices: settings.ipfsGatewayServices ? [...settings.ipfsGatewayServices] : [...defaults.ipfsGatewayServices],
		httpFeedTransportByKind: {
			rss: {
				...defaults.httpFeedTransportByKind.rss,
				...(settings.httpFeedTransportByKind?.rss ?? {})
			},
			atom: {
				...defaults.httpFeedTransportByKind.atom,
				...(settings.httpFeedTransportByKind?.atom ?? {})
			},
			jsonfeed: {
				...defaults.httpFeedTransportByKind.jsonfeed,
				...(settings.httpFeedTransportByKind?.jsonfeed ?? {})
			}
		},
		ipfsFeedTransportByKind: {
			rss: {
				...defaults.ipfsFeedTransportByKind.rss,
				...(settings.ipfsFeedTransportByKind?.rss ?? {})
			},
			atom: {
				...defaults.ipfsFeedTransportByKind.atom,
				...(settings.ipfsFeedTransportByKind?.atom ?? {})
			},
			jsonfeed: {
				...defaults.ipfsFeedTransportByKind.jsonfeed,
				...(settings.ipfsFeedTransportByKind?.jsonfeed ?? {})
			}
		},
		mediaIngestion: normalizeMediaIngestionSettings({
			general: {
				imageMaxWidth: pickDefined(
					settings.mediaIngestion?.general?.imageMaxWidth,
					defaults.mediaIngestion.general.imageMaxWidth
				),
				videoInitialHeight: pickDefined(
					settings.mediaIngestion?.general?.videoInitialHeight,
					defaults.mediaIngestion.general.videoInitialHeight
				)
			},
			byNetwork: {
				wifi: {
					imageMaxWidth: pickDefined(
						settings.mediaIngestion?.byNetwork?.wifi?.imageMaxWidth,
						defaults.mediaIngestion.byNetwork.wifi.imageMaxWidth
					),
					videoInitialHeight: pickDefined(
						settings.mediaIngestion?.byNetwork?.wifi?.videoInitialHeight,
						defaults.mediaIngestion.byNetwork.wifi.videoInitialHeight
					)
				},
				mobile: {
					imageMaxWidth: pickDefined(
						settings.mediaIngestion?.byNetwork?.mobile?.imageMaxWidth,
						defaults.mediaIngestion.byNetwork.mobile.imageMaxWidth
					),
					videoInitialHeight: pickDefined(
						settings.mediaIngestion?.byNetwork?.mobile?.videoInitialHeight,
						defaults.mediaIngestion.byNetwork.mobile.videoInitialHeight
					)
				}
			},
			byPower: {
				charging: {
					imageMaxWidth: pickDefined(
						settings.mediaIngestion?.byPower?.charging?.imageMaxWidth,
						defaults.mediaIngestion.byPower.charging.imageMaxWidth
					),
					videoInitialHeight: pickDefined(
						settings.mediaIngestion?.byPower?.charging?.videoInitialHeight,
						defaults.mediaIngestion.byPower.charging.videoInitialHeight
					)
				},
				battery: {
					imageMaxWidth: pickDefined(
						settings.mediaIngestion?.byPower?.battery?.imageMaxWidth,
						defaults.mediaIngestion.byPower.battery.imageMaxWidth
					),
					videoInitialHeight: pickDefined(
						settings.mediaIngestion?.byPower?.battery?.videoInitialHeight,
						defaults.mediaIngestion.byPower.battery.videoInitialHeight
					)
				},
				lowBattery: {
					imageMaxWidth: pickDefined(
						settings.mediaIngestion?.byPower?.lowBattery?.imageMaxWidth,
						defaults.mediaIngestion.byPower.lowBattery.imageMaxWidth
					),
					videoInitialHeight: pickDefined(
						settings.mediaIngestion?.byPower?.lowBattery?.videoInitialHeight,
						defaults.mediaIngestion.byPower.lowBattery.videoInitialHeight
					)
				}
			}
		})
	};
}
