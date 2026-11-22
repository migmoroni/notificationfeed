/**
 * Tauri — Window management (minimize to tray, startup behavior).
 */

export async function setupWindowBehavior(): Promise<void> {
	const { getCurrentWindow } = await import('@tauri-apps/api/window');
	const win = getCurrentWindow();

	// Intercept close to minimize to tray instead
	await win.onCloseRequested(async (event) => {
		event.preventDefault();
		await win.hide();
	});
}

export async function showWindow(): Promise<void> {
	const { getCurrentWindow } = await import('@tauri-apps/api/window');
	const win = getCurrentWindow();
	await win.show();
	await win.setFocus();
}

export async function hideWindow(): Promise<void> {
	const { getCurrentWindow } = await import('@tauri-apps/api/window');
	const win = getCurrentWindow();
	await win.hide();
}
