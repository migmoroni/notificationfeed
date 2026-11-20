/**
 * Activity Settings Store — user-tunable controls for the activity system.
 *
 * Reads/writes through the active user's `settingsUser.activity` record, so
 * the configuration is per-user (and travels with the user identity, not
 * with the device). Reactive via Svelte 5 runes.
 */

import { activeUser } from './active-user.svelte.js';

export const activitySettings = {
	/**
	 * Whether activity tracking is enabled for the active user.
	 * Defaults to `true` when no user is loaded so the very first events
	 * recorded during init are not silently dropped.
	 */
	get enabled(): boolean {
		return activeUser.current?.settingsUser.activity.enabled ?? true;
	},

	async setEnabled(value: boolean): Promise<void> {
		const userId = activeUser.current?.id;
		if (!userId) return;
		await activeUser.setActivityEnabled(userId, value);
	}
};
