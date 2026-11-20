/**
 * OS notifier — unified facade for native notifications.
 *
 * Routes a `{ title, body, tag }` payload to the right primitive:
 *   - service worker context  → `self.registration.showNotification`
 *   - Tauri desktop          → `@tauri-apps/plugin-notification`
 *   - browser foreground     → `new Notification(...)`
 *
 * All call-sites use this facade; the engine never branches on
 * runtime. Errors are swallowed (best-effort) — the inbox entry has
 * already been written, so missing OS notification is a non-issue.
 */

export interface OsNotifyPayload {
	title: string;
	body: string;
	/** Tag — newer notifications with the same tag replace previous ones. */
	tag?: string;
	/**
	 * Click-routing payload. Read by:
	 *   - the SW `notificationclick` handler — it opens `targetUrl`.
	 *   - the foreground `Notification.onclick` handler — same thing.
	 * The Tauri plugin has no click-routing API, so this field is
	 * ignored on desktop.
	 */
	data?: { targetUrl: string };
}

/** Detect whether we're inside a service worker. */
function isServiceWorker(): boolean {
	if (typeof self === 'undefined') return false;
	if (typeof window !== 'undefined') return false;
	const reg = (self as { registration?: { showNotification?: unknown } }).registration;
	return !!reg && typeof reg.showNotification === 'function';
}

function isTauri(): boolean {
	return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

/**
 * Fire an OS notification, returning whether it likely surfaced.
 * `false` is non-fatal; the inbox entry remains the canonical record.
 */
export async function notifyOs(payload: OsNotifyPayload): Promise<boolean> {
	try {
		if (isServiceWorker()) {
			const reg = (self as { registration?: ServiceWorkerRegistration }).registration;
			if (!reg || typeof reg.showNotification !== 'function') return false;
			// `renotify` is supported by browsers but missing from the
			// stock `NotificationOptions` lib type — pass it via a cast.
			await reg.showNotification(payload.title, {
				body: payload.body,
				tag: payload.tag,
				renotify: false,
				data: payload.data
			} as NotificationOptions);
			return true;
		}

		if (isTauri()) {
			// Lazy-load: only desktop bundles ship the plugin.
			const mod = await import('@tauri-apps/plugin-notification');
			let granted = await mod.isPermissionGranted();
			if (!granted) {
				const perm = await mod.requestPermission();
				granted = perm === 'granted';
			}
			if (!granted) return false;
			mod.sendNotification({ title: payload.title, body: payload.body });
			return true;
		}

		// Foreground browser.
		if (typeof window !== 'undefined' && 'Notification' in window) {
			if (Notification.permission !== 'granted') return false;
			const n = new Notification(payload.title, { body: payload.body, tag: payload.tag });
			const targetUrl = payload.data?.targetUrl;
			if (targetUrl) {
				n.onclick = () => {
					try {
						window.focus();
					} catch {
						/* noop */
					}
					window.location.href = targetUrl;
					n.close();
				};
			}
			return true;
		}

		return false;
	} catch {
		return false;
	}
}
