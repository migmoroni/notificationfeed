/**
 * Layout Store — reactive adaptive layout detection.
 *
 * Single source of truth for layout mode across the entire app.
 * Components MUST consume this store — never recalculate layout locally.
 *
 * Detection strategy:
 * 1. window.innerWidth is the primary signal (< 900px → compact)
 * 2. pointer: coarse and hover: none refine but never override width
 * 3. No User-Agent parsing. No separate builds.
 *
 * Works in: browser, PWA standalone, Tauri window, TWA Android.
 * Updates automatically on resize/orientation change — no reload needed.
 */

export type LayoutMode = 'compact' | 'expanded';

export type InputCapability = 'touch' | 'pointer' | 'hybrid';

export interface LayoutState {
	/** Primary mode — drives shell structure (nav, grid, panels) */
	mode: LayoutMode;

	/** Detected input capability — refines interaction patterns */
	input: InputCapability;

	/** Current viewport width in px */
	viewportWidth: number;

	/** Whether the device is in landscape orientation */
	landscape: boolean;
}

const BREAKPOINT = 900;
const LARGE_SCREEN = 1280;

/**
 * Detect input capability from media queries.
 * Does NOT override layout mode — only informs interaction patterns
 * (e.g. larger tap targets for touch, hover effects for pointer).
 */
function detectInput(): InputCapability {
	if (typeof window === 'undefined') return 'pointer';

	const coarse = window.matchMedia('(pointer: coarse)').matches;
	const noHover = window.matchMedia('(hover: none)').matches;

	// Pure touch device (phone, tablet without keyboard/mouse)
	if (coarse && noHover) return 'touch';
	// Touchscreen laptop or tablet with attached keyboard
	if (coarse && !noHover) return 'hybrid';
	// Desktop with mouse/trackpad
	return 'pointer';
}

function detectLandscape(): boolean {
	if (typeof window === 'undefined') return false;
	return window.innerWidth > window.innerHeight;
}

function detectLayout(): LayoutState {
	if (typeof window === 'undefined') {
		return { mode: 'compact', input: 'pointer', viewportWidth: 0, landscape: false };
	}

	const viewportWidth = window.innerWidth;
	const input = detectInput();
	const landscape = detectLandscape();

	// Rule 1: width < 900px → always compact (small screens)
	// Rule 2: width ≥ 1280px → always expanded (TV 720p+, large monitors, even with touch)
	// Rule 3: 900px ≤ width < 1280px → depends on input:
	//         touch → compact (phone landscape ~932px)
	//         pointer/hybrid → expanded (desktop small window, touchscreen laptop)
	let mode: LayoutMode;
	if (viewportWidth < BREAKPOINT) {
		mode = 'compact';
	} else if (viewportWidth >= LARGE_SCREEN) {
		mode = 'expanded';
	} else if (input === 'touch') {
		// Mid-range width + pure touch = phone landscape → stay compact
		mode = 'compact';
	} else {
		mode = 'expanded';
	}

	return { mode, input, viewportWidth, landscape };
}

// --- Reactive state (Svelte 5 runes) ---

let state = $state<LayoutState>(detectLayout());

/**
 * Read-only reactive layout state.
 *
 * Import and use directly in any component:
 * ```svelte
 * <script>
 *   import { layout } from '$lib/stores/layout.svelte.js';
 * </script>
 *
 * {#if layout.isCompact}
 *   <BottomNav />
 * {:else}
 *   <Sidebar />
 * {/if}
 * ```
 */
export const layout = {
	get mode() {
		return state.mode;
	},
	get input() {
		return state.input;
	},
	get viewportWidth() {
		return state.viewportWidth;
	},
	get landscape() {
		return state.landscape;
	},

	/** Whether current mode is compact (mobile / small window) */
	get isCompact() {
		return state.mode === 'compact';
	},

	/** Whether current mode is expanded (desktop / large window) */
	get isExpanded() {
		return state.mode === 'expanded';
	},

	/** Whether primary input is touch (no hover available) */
	get isTouch() {
		return state.input === 'touch';
	},

	/** Whether device is a touchscreen laptop or similar hybrid */
	get isHybrid() {
		return state.input === 'hybrid';
	}
};

// --- Lifecycle ---

let cleanupFn: (() => void) | null = null;

/**
 * Initialize layout listeners. Call once from root +layout.svelte onMount.
 * Returns a cleanup function to remove all listeners.
 *
 * Memory leak prevention:
 * - Returns explicit cleanup (removeEventListener for all 4 listeners)
 * - Cancels any pending rAF
 * - Guards against double-init (cleans up previous instance)
 *
 * ```svelte
 * <script>
 *   import { onMount } from 'svelte';
 *   import { initLayout } from '$lib/stores/layout.svelte.js';
 *
 *   onMount(() => {
 *     const cleanup = initLayout();
 *     return cleanup;
 *   });
 * </script>
 * ```
 */
export function initLayout(): () => void {
	if (typeof window === 'undefined') return () => {};

	// Guard against double-init
	if (cleanupFn) cleanupFn();

	const update = () => {
		state = detectLayout();
	};

	// Debounced resize via requestAnimationFrame — avoids layout thrashing
	// during continuous drag-resize of Tauri/browser windows
	let resizeRaf: number | null = null;
	const onResize = () => {
		if (resizeRaf) cancelAnimationFrame(resizeRaf);
		resizeRaf = requestAnimationFrame(update);
	};

	// Orientation change (mobile, TWA) — small delay because some
	// browsers report stale innerWidth during the event itself
	const onOrientation = () => {
		setTimeout(update, 100);
	};

	// Media query change listeners — pointer/hover can change when
	// a tablet is docked or an external display is connected
	const mqPointer = window.matchMedia('(pointer: coarse)');
	const mqHover = window.matchMedia('(hover: none)');
	const onMediaChange = () => update();

	// Attach all listeners
	window.addEventListener('resize', onResize, { passive: true });
	window.addEventListener('orientationchange', onOrientation);
	mqPointer.addEventListener('change', onMediaChange);
	mqHover.addEventListener('change', onMediaChange);

	// Initial detection
	update();

	// Cleanup function — removes all listeners and cancels pending rAF
	cleanupFn = () => {
		window.removeEventListener('resize', onResize);
		window.removeEventListener('orientationchange', onOrientation);
		mqPointer.removeEventListener('change', onMediaChange);
		mqHover.removeEventListener('change', onMediaChange);
		if (resizeRaf) cancelAnimationFrame(resizeRaf);
		cleanupFn = null;
	};

	return cleanupFn;
}
