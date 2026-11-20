/**
 * Sidebar Flyout — coordinates which filter flyout is currently open in the sidebar.
 *
 * Only one flyout (library-tab filter or a category tree) can be open at a time.
 * Components register themselves with a unique key and close when the active key changes.
 */

let activeKey = $state<string | null>(null);

export const sidebarFlyout = {
	get activeKey() { return activeKey; },
	open(key: string) { activeKey = key; },
	close(key: string) {
		if (activeKey === key) activeKey = null;
	},
	closeAll() { activeKey = null; },
	isOpen(key: string): boolean { return activeKey === key; }
};
