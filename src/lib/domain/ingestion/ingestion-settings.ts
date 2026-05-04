/**
 * Ingestion settings — per-user configuration for the PostManager.
 *
 * Embedded in `UserSettings.ingestion`. All durations are in milliseconds and
 * day-counts are integers. `proxyServices` defines the CORS proxy chain used
 * by the web HTTP adapter (Tauri ignores it via `tauri-plugin-http`).
 */

import { INGESTION_FEED_TRANSPORT_DEFAULTS } from '$lib/config/back-settings.js';

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

export interface FeedTransportByKind {
	rss: FeedTransportRule;
	atom: FeedTransportRule;
	jsonfeed: FeedTransportRule;
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

	/** Enable IPFS/IPNS gateway resolution for ipfs:// and ipns:// URLs. */
	ipfsGatewayEnabled: boolean;
	/** Ordered list; first successful gateway response wins. */
	ipfsGatewayServices: IpfsGatewayConfig[];

	/** Per-feed transport order (direct/proxy fallback) for web HTTP fetches. */
	feedTransportByKind: FeedTransportByKind;
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

export const DEFAULT_FEED_TRANSPORT_BY_KIND: FeedTransportByKind = {
	rss: { ...INGESTION_FEED_TRANSPORT_DEFAULTS.rss },
	atom: { ...INGESTION_FEED_TRANSPORT_DEFAULTS.atom },
	jsonfeed: { ...INGESTION_FEED_TRANSPORT_DEFAULTS.jsonfeed }
};

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
		ipfsGatewayEnabled: true,
		ipfsGatewayServices: [...DEFAULT_IPFS_GATEWAYS],
		feedTransportByKind: {
			rss: { ...DEFAULT_FEED_TRANSPORT_BY_KIND.rss },
			atom: { ...DEFAULT_FEED_TRANSPORT_BY_KIND.atom },
			jsonfeed: { ...DEFAULT_FEED_TRANSPORT_BY_KIND.jsonfeed }
		}
	};
}
