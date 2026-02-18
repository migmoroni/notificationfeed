/**
 * Unit tests for priority-resolver.
 *
 * Tests the priority inheritance chain: Font → Profile → CreatorPage → 3
 */

import { describe, it, expect } from 'vitest';
import {
	buildStateMap,
	resolveEffectivePriority,
	buildPriorityMap
} from './priority-resolver.js';
import type { ConsumerState } from './consumer-state.js';
import type { PriorityContext } from './priority-resolver.js';

// ── Helpers ────────────────────────────────────────────────────────────

function makeState(entityId: string, entityType: 'font' | 'profile' | 'creator_page', priority: 1 | 2 | 3 | null): ConsumerState {
	return {
		entityType,
		entityId,
		enabled: true,
		favoriteFolderId: null,
		priority,
		favorite: false,
		overriddenAt: new Date()
	};
}

// ── buildStateMap ──────────────────────────────────────────────────────

describe('buildStateMap', () => {
	it('builds a map keyed by entityId', () => {
		const states = [
			makeState('font-1', 'font', 1),
			makeState('profile-1', 'profile', 2)
		];
		const map = buildStateMap(states);

		expect(map.size).toBe(2);
		expect(map.get('font-1')?.priority).toBe(1);
		expect(map.get('profile-1')?.priority).toBe(2);
	});

	it('returns empty map for empty input', () => {
		const map = buildStateMap([]);
		expect(map.size).toBe(0);
	});

	it('overwrites duplicate entityIds (last wins)', () => {
		const states = [
			makeState('font-1', 'font', 1),
			makeState('font-1', 'font', 3)
		];
		const map = buildStateMap(states);

		expect(map.size).toBe(1);
		expect(map.get('font-1')?.priority).toBe(3);
	});
});

// ── resolveEffectivePriority ───────────────────────────────────────────

describe('resolveEffectivePriority', () => {
	it('returns font priority when set', () => {
		const stateMap = buildStateMap([
			makeState('font-1', 'font', 1),
			makeState('profile-1', 'profile', 2)
		]);
		const ctx: PriorityContext = { fontId: 'font-1', profileId: 'profile-1', creatorPageId: null };

		expect(resolveEffectivePriority(ctx, stateMap)).toBe(1);
	});

	it('falls back to profile priority when font is null', () => {
		const stateMap = buildStateMap([
			makeState('font-1', 'font', null),
			makeState('profile-1', 'profile', 2)
		]);
		const ctx: PriorityContext = { fontId: 'font-1', profileId: 'profile-1', creatorPageId: null };

		expect(resolveEffectivePriority(ctx, stateMap)).toBe(2);
	});

	it('falls back to creatorPage priority when font and profile are null', () => {
		const stateMap = buildStateMap([
			makeState('font-1', 'font', null),
			makeState('profile-1', 'profile', null),
			makeState('page-1', 'creator_page', 1)
		]);
		const ctx: PriorityContext = { fontId: 'font-1', profileId: 'profile-1', creatorPageId: 'page-1' };

		expect(resolveEffectivePriority(ctx, stateMap)).toBe(1);
	});

	it('returns default (3) when all levels are null', () => {
		const stateMap = buildStateMap([
			makeState('font-1', 'font', null),
			makeState('profile-1', 'profile', null),
			makeState('page-1', 'creator_page', null)
		]);
		const ctx: PriorityContext = { fontId: 'font-1', profileId: 'profile-1', creatorPageId: 'page-1' };

		expect(resolveEffectivePriority(ctx, stateMap)).toBe(3);
	});

	it('returns default (3) when no states exist at all', () => {
		const stateMap = buildStateMap([]);
		const ctx: PriorityContext = { fontId: 'font-1', profileId: 'profile-1', creatorPageId: 'page-1' };

		expect(resolveEffectivePriority(ctx, stateMap)).toBe(3);
	});

	it('skips creatorPageId when null in context', () => {
		const stateMap = buildStateMap([
			makeState('page-1', 'creator_page', 1)
		]);
		const ctx: PriorityContext = { fontId: 'font-1', profileId: 'profile-1', creatorPageId: null };

		// Even though page state exists, context has no creatorPageId — should use default
		expect(resolveEffectivePriority(ctx, stateMap)).toBe(3);
	});

	it('font priority takes precedence even when all levels have values', () => {
		const stateMap = buildStateMap([
			makeState('font-1', 'font', 2),
			makeState('profile-1', 'profile', 1),
			makeState('page-1', 'creator_page', 3)
		]);
		const ctx: PriorityContext = { fontId: 'font-1', profileId: 'profile-1', creatorPageId: 'page-1' };

		expect(resolveEffectivePriority(ctx, stateMap)).toBe(2);
	});
});

// ── buildPriorityMap ───────────────────────────────────────────────────

describe('buildPriorityMap', () => {
	it('builds a map of fontId → effective priority', () => {
		const stateMap = buildStateMap([
			makeState('font-1', 'font', 1),
			makeState('font-2', 'font', null),
			makeState('profile-a', 'profile', 2)
		]);
		const contexts: PriorityContext[] = [
			{ fontId: 'font-1', profileId: 'profile-a', creatorPageId: null },
			{ fontId: 'font-2', profileId: 'profile-a', creatorPageId: null }
		];

		const map = buildPriorityMap(contexts, stateMap);

		expect(map.get('font-1')).toBe(1);
		expect(map.get('font-2')).toBe(2); // inherited from profile
	});

	it('returns empty map for empty contexts', () => {
		const stateMap = buildStateMap([]);
		const map = buildPriorityMap([], stateMap);
		expect(map.size).toBe(0);
	});

	it('assigns default 3 to fonts with no state chain', () => {
		const stateMap = buildStateMap([]);
		const contexts: PriorityContext[] = [
			{ fontId: 'font-orphan', profileId: 'profile-missing', creatorPageId: null }
		];

		const map = buildPriorityMap(contexts, stateMap);
		expect(map.get('font-orphan')).toBe(3);
	});
});
