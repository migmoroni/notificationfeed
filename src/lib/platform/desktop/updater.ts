/**
 * Tauri — Auto-updater integration.
 */

export async function checkForUpdates(): Promise<boolean> {
	try {
		const { check } = await import('@tauri-apps/plugin-updater');
		const update = await check();
		return update !== null;
	} catch {
		return false;
	}
}

export async function installUpdate(): Promise<void> {
	const { check } = await import('@tauri-apps/plugin-updater');
	const update = await check();

	if (update) {
		await update.downloadAndInstall();
		const { relaunch } = await import('@tauri-apps/plugin-process');
		await relaunch();
	}
}
