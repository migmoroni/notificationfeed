/**
 * Priority Resolver — resolves effective priority for a Font.
 *
 * Inheritance chain: Font → Profile → CreatorPage → 3 (default)
 * Each level can define a priority or inherit (null) from its parent.
 * Resolved at runtime, never persisted as a derived value.
 *
 * This is a pure function module — no side effects, no state.
 */

import type { ConsumerState, PriorityLevel } from './consumer-state.js';

const DEFAULT_PRIORITY: PriorityLevel = 3;

/**
 * Minimal context needed to resolve priority for a single Font.
 * Extracted once from the domain entities, then reused per-post.
 */
export interface PriorityContext {
	fontId: string;
	profileId: string;
	creatorPageId: string | null;
}

/**
 * Build a lookup map from ConsumerState array for O(1) access by entityId.
 */
export function buildStateMap(states: ConsumerState[]): Map<string, ConsumerState> {
	const map = new Map<string, ConsumerState>();
	for (const s of states) {
		map.set(s.entityId, s);
	}
	return map;
}

/**
 * Resolve effective priority for a single Font following the inheritance chain.
 *
 * Walk order:
 * 1. Font-level ConsumerState.priority
 * 2. Profile-level ConsumerState.priority
 * 3. CreatorPage-level ConsumerState.priority (if the Font belongs to a Page)
 * 4. DEFAULT_PRIORITY (3 = baixa)
 *
 * A non-null value at any level stops the walk.
 */
export function resolveEffectivePriority(
	ctx: PriorityContext,
	stateMap: Map<string, ConsumerState>
): PriorityLevel {
	// 1. Font-level override
	const fontState = stateMap.get(ctx.fontId);
	if (fontState?.priority != null) return fontState.priority;

	// 2. Profile-level override
	const profileState = stateMap.get(ctx.profileId);
	if (profileState?.priority != null) return profileState.priority;

	// 3. CreatorPage-level override
	if (ctx.creatorPageId) {
		const pageState = stateMap.get(ctx.creatorPageId);
		if (pageState?.priority != null) return pageState.priority;
	}

	// 4. Default
	return DEFAULT_PRIORITY;
}

/**
 * Build a complete map of fontId → effective priority for all known fonts.
 * Called once when the feed needs to be sorted, then passed to the sorter.
 */
export function buildPriorityMap(
	contexts: PriorityContext[],
	stateMap: Map<string, ConsumerState>
): Map<string, PriorityLevel> {
	const map = new Map<string, PriorityLevel>();
	for (const ctx of contexts) {
		map.set(ctx.fontId, resolveEffectivePriority(ctx, stateMap));
	}
	return map;
}
