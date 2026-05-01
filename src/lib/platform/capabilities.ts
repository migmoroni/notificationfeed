/**
 * Platform capabilities detection.
 *
 * Detects the current runtime (web, android TWA, desktop Tauri)
 * and exposes feature flags for platform-specific behavior.
 */

export type Platform = 'web' | 'android' | 'desktop';
export type StorageBackendKind = 'indexeddb' | 'sqlite';

export function detectPlatform(): Platform {
	if (typeof window === 'undefined') return 'web';

	// Tauri injects __TAURI_INTERNALS__ on the window object
	if ('__TAURI_INTERNALS__' in window) return 'desktop';

	// TWA sets document.referrer to the Android package origin
	// or we can check the display-mode media query
	if (window.matchMedia('(display-mode: standalone)').matches && /android/i.test(navigator.userAgent)) {
		return 'android';
	}

	return 'web';
}

export interface Capabilities {
	/** Current runtime */
	platform: Platform;
	/** Active storage backend. Tauri builds bundling SQLite set VITE_STORAGE_BACKEND=sqlite. */
	storageBackend: StorageBackendKind;
	/** Can show native system tray icon */
	hasTray: boolean;
	/** Can send push notifications */
	hasPush: boolean;
	/** Has access to the native filesystem */
	hasFileSystem: boolean;
	/** Can auto-update the application */
	hasAutoUpdate: boolean;
	/** Supports service worker for offline caching */
	hasServiceWorker: boolean;
	/** Supports Background Sync API (one-shot, when reconnecting) */
	hasBackgroundSync: boolean;
	/** Supports Periodic Background Sync API */
	hasPeriodicSync: boolean;
	/** Supports install prompt (A2HS) */
	hasInstallPrompt: boolean;
	/** Can deliver OS notifications (web Notification API or Tauri plugin). */
	hasNotifications: boolean;
}

function detectStorageBackend(): StorageBackendKind {
	const env = (import.meta.env?.VITE_STORAGE_BACKEND as string | undefined) ?? 'indexeddb';
	return env === 'sqlite' ? 'sqlite' : 'indexeddb';
}

function detectBackgroundSync(): boolean {
	if (typeof window === 'undefined' || !('ServiceWorkerRegistration' in window)) return false;
	return 'sync' in window.ServiceWorkerRegistration.prototype;
}

function detectPeriodicSync(): boolean {
	if (typeof window === 'undefined' || !('ServiceWorkerRegistration' in window)) return false;
	return 'periodicSync' in window.ServiceWorkerRegistration.prototype;
}

export function getCapabilities(): Capabilities {
	const platform = detectPlatform();
	const hasServiceWorker = typeof navigator !== 'undefined' && 'serviceWorker' in navigator;
	const hasNotifications =
		platform === 'desktop' ||
		(typeof window !== 'undefined' && 'Notification' in window) ||
		(typeof self !== 'undefined' && 'Notification' in self);

	return {
		platform,
		storageBackend: detectStorageBackend(),
		hasTray: platform === 'desktop',
		hasPush: platform === 'web' || platform === 'android',
		hasFileSystem: platform === 'desktop',
		hasAutoUpdate: platform === 'desktop',
		hasServiceWorker,
		hasBackgroundSync: hasServiceWorker && detectBackgroundSync(),
		hasPeriodicSync: hasServiceWorker && detectPeriodicSync(),
		hasInstallPrompt: platform === 'web',
		hasNotifications
	};
}
