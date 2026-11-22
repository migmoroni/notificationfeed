/**
 * Android TWA — helpers for Trusted Web Activity specifics.
 */

/**
 * Detect if running inside a TWA (Trusted Web Activity).
 */
export function isTwa(): boolean {
	return (
		window.matchMedia('(display-mode: standalone)').matches &&
		/android/i.test(navigator.userAgent) &&
		!('__TAURI_INTERNALS__' in window)
	);
}

/**
 * Request to change the Android status bar color via meta tag.
 */
export function setStatusBarColor(color: string): void {
	let meta = document.querySelector('meta[name="theme-color"]');
	if (!meta) {
		meta = document.createElement('meta');
		meta.setAttribute('name', 'theme-color');
		document.head.appendChild(meta);
	}
	meta.setAttribute('content', color);
}
