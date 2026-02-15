/**
 * Tauri — System tray icon and context menu.
 */

export async function setupTray(): Promise<void> {
	const { TrayIcon } = await import('@tauri-apps/api/tray');
	const { Menu } = await import('@tauri-apps/api/menu');

	const menu = await Menu.new({
		items: [
			{
				id: 'show',
				text: 'Show Notfeed',
				action: async () => {
					const { getCurrentWindow } = await import('@tauri-apps/api/window');
					const win = getCurrentWindow();
					await win.show();
					await win.setFocus();
				}
			},
			{
				id: 'quit',
				text: 'Quit',
				action: async () => {
					const { exit } = await import('@tauri-apps/api/process');
					await exit(0);
				}
			}
		]
	});

	await TrayIcon.new({
		tooltip: 'Notfeed',
		menu,
		menuOnLeftClick: false
	});
}
