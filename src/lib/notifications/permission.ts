/**
 * Notification permission helper.
 *
 * Encapsulates the permission state across web/PWA/Tauri so the UI
 * can render a single button. On web, we rely on `Notification.requestPermission`.
 * On Tauri, we delegate to `@tauri-apps/plugin-notification`. Service
 * workers cannot request permission themselves (the foreground page
 * must do it before scheduling a SW-driven notification).
 */

export type NotificationPermissionState = 'granted' | 'denied' | 'default' | 'unsupported';

function isTauri(): boolean {
	return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

export async function getNotificationPermission(): Promise<NotificationPermissionState> {
	try {
		if (isTauri()) {
			const mod = await import('@tauri-apps/plugin-notification');
			return (await mod.isPermissionGranted()) ? 'granted' : 'default';
		}
		if (typeof window !== 'undefined' && 'Notification' in window) {
			return Notification.permission as NotificationPermissionState;
		}
		return 'unsupported';
	} catch {
		return 'unsupported';
	}
}

export async function requestNotificationPermission(): Promise<NotificationPermissionState> {
	try {
		if (isTauri()) {
			const mod = await import('@tauri-apps/plugin-notification');
			const result = await mod.requestPermission();
			return result === 'granted' ? 'granted' : 'denied';
		}
		if (typeof window !== 'undefined' && 'Notification' in window) {
			const result = await Notification.requestPermission();
			return result as NotificationPermissionState;
		}
		return 'unsupported';
	} catch {
		return 'denied';
	}
}
