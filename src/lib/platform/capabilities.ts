/**
 * Platform capabilities detection.
 *
 * Detects the current runtime (web, android TWA, desktop Tauri)
 * and exposes feature flags for platform-specific behavior.
 */

export type Platform = 'web' | 'android' | 'desktop';

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
	/** Supports install prompt (A2HS) */
	hasInstallPrompt: boolean;
}

export function getCapabilities(): Capabilities {
	const platform = detectPlatform();

	return {
		hasTray: platform === 'desktop',
		hasPush: platform === 'web' || platform === 'android',
		hasFileSystem: platform === 'desktop',
		hasAutoUpdate: platform === 'desktop',
		hasServiceWorker: 'serviceWorker' in navigator,
		hasInstallPrompt: platform === 'web'
	};
}
