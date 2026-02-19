/**
 * Consumer Store — reactive state for the active UserConsumer.
 *
 * Wraps the persistence layer (user-consumer.store.ts) with Svelte 5 runes.
 * Single source of truth for follows, consumer states, and the state map
 * used by priority-resolver and feed-sorter downstream.
 *
 * Pattern: module-level $state + exported read-only accessor + init() lifecycle.
 */

import type { UserConsumer } from '$lib/domain/user/user-consumer.js';
import type { ConsumerState, ConsumerEntityType, PriorityLevel } from '$lib/domain/shared/consumer-state.js';
import type { FollowRef } from '$lib/domain/shared/follow-ref.js';
import { buildStateMap } from '$lib/domain/shared/priority-resolver.js';
import { createUserConsumerStore } from '$lib/persistence/user-consumer.store.js';

// ── Internal reactive state ────────────────────────────────────────────

interface ConsumerStoreState {
	user: UserConsumer | null;
	states: ConsumerState[];
	stateMap: Map<string, ConsumerState>;
	loading: boolean;
}

let state = $state<ConsumerStoreState>({
	user: null,
	states: [],
	stateMap: new Map(),
	loading: false
});

const repo = createUserConsumerStore();

// ── Helpers ────────────────────────────────────────────────────────────

function refreshStateMap(): void {
	state.stateMap = buildStateMap(state.states);
}

function findOrCreateState(entityId: string, entityType: ConsumerEntityType): ConsumerState {
	const existing = state.states.find((s) => s.entityId === entityId);
	if (existing) return { ...existing };
	return {
		entityType,
		entityId,
		enabled: true,
		favoriteTabIds: [],
		priority: null,
		favorite: false,
		overriddenAt: new Date()
	};
}

// ── Exported accessor ──────────────────────────────────────────────────

export const consumer = {
	get user() { return state.user; },
	get states() { return state.states; },
	get stateMap() { return state.stateMap; },
	get loading() { return state.loading; },
	get isReady() { return state.user !== null && !state.loading; },

	// ── Actions ──────────────────────────────────────────────────────

	async init(): Promise<void> {
		if (state.loading) return;
		state.loading = true;

		try {
			const consumers = await repo.getAll();
			let user: UserConsumer;

			if (consumers.length > 0) {
				user = consumers[0];
			} else {
				user = await repo.create({ displayName: 'Default' });
			}

			const states = await repo.getAllStates(user.id);

			state.user = user;
			state.states = states;
			refreshStateMap();
		} finally {
			state.loading = false;
		}
	},

	async setPriority(entityId: string, entityType: ConsumerEntityType, level: PriorityLevel | null): Promise<void> {
		if (!state.user) return;

		const cs = findOrCreateState(entityId, entityType);
		cs.priority = level;
		cs.overriddenAt = new Date();

		await repo.setState(state.user.id, cs);

		// Update local state
		const idx = state.states.findIndex((s) => s.entityId === entityId);
		if (idx >= 0) {
			state.states[idx] = cs;
		} else {
			state.states = [...state.states, cs];
		}
		refreshStateMap();
	},

	async setFavorite(entityId: string, entityType: ConsumerEntityType, value: boolean): Promise<void> {
		if (!state.user) return;

		const cs = findOrCreateState(entityId, entityType);
		cs.favorite = value;
		if (!value) cs.favoriteTabIds = []; // clear tab assignments when unfavoriting
		cs.overriddenAt = new Date();

		await repo.setState(state.user.id, cs);

		const idx = state.states.findIndex((s) => s.entityId === entityId);
		if (idx >= 0) {
			state.states[idx] = cs;
		} else {
			state.states = [...state.states, cs];
		}
		refreshStateMap();
	},

	async toggleEnabled(entityId: string, entityType: ConsumerEntityType): Promise<void> {
		if (!state.user) return;

		const cs = findOrCreateState(entityId, entityType);
		cs.enabled = !cs.enabled;
		cs.overriddenAt = new Date();

		await repo.setState(state.user.id, cs);

		const idx = state.states.findIndex((s) => s.entityId === entityId);
		if (idx >= 0) {
			state.states[idx] = cs;
		} else {
			state.states = [...state.states, cs];
		}
		refreshStateMap();
	},

	async addFollow(follow: FollowRef): Promise<void> {
		if (!state.user) return;

		await repo.addFollow(state.user.id, follow);
		state.user = { ...state.user, follows: [...state.user.follows, follow] };
	},

	async removeFollow(targetId: string): Promise<void> {
		if (!state.user) return;

		await repo.removeFollow(state.user.id, targetId);
		state.user = {
			...state.user,
			follows: state.user.follows.filter((f) => f.targetId !== targetId)
		};
	},

	async updateFavoriteTabIds(entityId: string, entityType: ConsumerEntityType, tabIds: string[]): Promise<void> {
		if (!state.user) return;

		const cs = findOrCreateState(entityId, entityType);
		cs.favoriteTabIds = tabIds;
		cs.overriddenAt = new Date();

		await repo.setState(state.user.id, cs);

		const idx = state.states.findIndex((s) => s.entityId === entityId);
		if (idx >= 0) {
			state.states[idx] = cs;
		} else {
			state.states = [...state.states, cs];
		}
		refreshStateMap();
	}
};
