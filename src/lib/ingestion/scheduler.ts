/**
 * Foreground ingestion scheduler (Plano B).
 *
 * Drives `PostManager.tick()` on a recurring timer in the page context.
 * Pauses when the document is hidden — *except* on Tauri desktop, where
 * the window may be tucked behind the tray and we still want to refresh.
 */

import { getCapabilities } from '$lib/platform/capabilities.js';
import { createPostManager } from './post-manager.js';
import { activeUser } from '$lib/stores/active-user.svelte.js';
import { INGESTION_SCHEDULER } from '$lib/config/back-settings.js';

const DEFAULT_TICK_INTERVAL_MS = INGESTION_SCHEDULER.defaultTickIntervalMs;
const MIN_TICK_INTERVAL_MS = INGESTION_SCHEDULER.minTickMs;

let interval: ReturnType<typeof setInterval> | null = null;
let currentTickMs = DEFAULT_TICK_INTERVAL_MS;
let visibilityHandler: (() => void) | null = null;
let manager: ReturnType<typeof createPostManager> | null = null;

/**
 * Lazily build (and cache) the singleton `PostManager` used by the
 * foreground scheduler. The manager is bound to `activeUser` so it
 * can correctly identify which user is in the foreground.
 */
function getManager() {
	if (!manager) {
		manager = createPostManager({
			getActiveUserId: () => activeUser.current?.id ?? null
		});
	}
	return manager;
}

/**
 * Read the active user's `schedulerTickIntervalMs`, clamping it to a
 * sane minimum (avoiding accidentally-tiny intervals that would melt
 * the CPU). Falls back to `DEFAULT_TICK_INTERVAL_MS` when the user
 * has no settings yet.
 */
function readTickIntervalMs(): number {
	const raw = activeUser.current?.settingsUser.ingestion?.schedulerTickIntervalMs;
	if (typeof raw !== 'number' || !Number.isFinite(raw)) return DEFAULT_TICK_INTERVAL_MS;
	return Math.max(MIN_TICK_INTERVAL_MS, Math.floor(raw));
}

/**
 * Decide whether the scheduler should fire on the current tick.
 *  - SSR / no `document`: always run.
 *  - Tauri desktop: always run (window may be hidden in tray and we
 *    still want refreshes).
 *  - Web/PWA: only run while the page is visible, to avoid burning
 *    battery in background tabs.
 */
function shouldRun(): boolean {
	if (typeof document === 'undefined') return true;
	if (getCapabilities().platform === 'desktop') return true;
	return !document.hidden;
}

/**
 * Single tick wrapper. Stamps the active user's `interactedAt`
 * (heartbeat that keeps fonts on the active-tier interval) and then
 * triggers the manager. Both calls are best-effort — logged but never
 * thrown so a single failing tick can't poison the timer loop.
 */
async function safeTick(): Promise<void> {
	if (!shouldRun()) return;
	// Stamp the active user as having interacted right now — this is what
	// keeps their fonts on the `activeFontIntervalMs` cadence. Failures
	// are non-fatal (the persistence write is debounced internally).
	const userId = activeUser.current?.id;
	if (userId) {
		try {
			await activeUser.markInteracted(userId);
		} catch (err) {
			console.warn('[scheduler] markInteracted failed', err);
		}
	}
	try {
		await getManager().tick();
	} catch (err) {
		console.warn('[scheduler] tick failed', err);
	}
}

/**
 * Start the foreground scheduler. Idempotent — a second call while
 * already running is a no-op. Registers a `visibilitychange` listener
 * on the web/PWA path so the page can ingest immediately upon
 * becoming visible again.
 */
export function startScheduler(): void {
	if (interval) return;
	currentTickMs = readTickIntervalMs();
	// Initial tick immediately after mount.
	void safeTick();
	interval = setInterval(() => void safeTick(), currentTickMs);

	if (typeof document !== 'undefined' && getCapabilities().platform !== 'desktop') {
		visibilityHandler = () => {
			if (!document.hidden) void safeTick();
		};
		document.addEventListener('visibilitychange', visibilityHandler);
	}
}

/**
 * Stop the scheduler and release its `visibilitychange` listener.
 * Safe to call multiple times.
 */
export function stopScheduler(): void {
	if (interval) {
		clearInterval(interval);
		interval = null;
	}
	if (visibilityHandler && typeof document !== 'undefined') {
		document.removeEventListener('visibilitychange', visibilityHandler);
		visibilityHandler = null;
	}
}

/**
 * Re-read the user's `schedulerTickIntervalMs` and reschedule if it
 * changed. Cheap to call from settings UI on every save.
 */
export function reloadSchedulerInterval(): void {
	if (!interval) return;
	const next = readTickIntervalMs();
	if (next === currentTickMs) return;
	clearInterval(interval);
	currentTickMs = next;
	interval = setInterval(() => void safeTick(), currentTickMs);
}

/**
 * Force-fetch a single font right now. Convenience proxy to
 * `PostManager.refreshFont` so callers don't need to depend on the
 * manager directly.
 */
export async function refreshFont(nodeId: string): Promise<void> {
	await getManager().refreshFont(nodeId);
}

/**
 * Trigger one full ingestion sweep on demand (used by manual refresh
 * buttons in the UI). Concurrent calls are coalesced inside the manager.
 */
export async function tickNow(): Promise<void> {
	await getManager().tick();
}
