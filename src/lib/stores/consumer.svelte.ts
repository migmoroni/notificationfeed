/**
 * Consumer Store — reactive state for the active UserConsumer.
 *
 * Replaces follows/ConsumerState with activateTrees/activateNodes.
 * LibraryTabs are now embedded in the user record.
 *
 * Pattern: module-level $state + exported read-only accessor + init() lifecycle.
 */

import type { UserConsumer, NodeActivation, LibraryTab } from '$lib/domain/user/user-consumer.js';
import { SYSTEM_ALL_LIBRARY_TAB_ID } from '$lib/domain/user/user-consumer.js';
import type { FeedMacro, FeedMacroFilters } from '$lib/domain/feed-macro/feed-macro.js';
import type { PriorityLevel } from '$lib/domain/user/priority-level.js';
import type { ImageAsset } from '$lib/domain/shared/image-asset.js';
import { buildNodeActivationMap } from '$lib/domain/shared/priority-resolver.js';
import { createUserConsumerStore } from '$lib/persistence/user-consumer.store.js';

// ── Internal reactive state ────────────────────────────────────────────

interface ConsumerStoreState {
	user: UserConsumer | null;
	activationMap: Map<string, NodeActivation>;
	loading: boolean;
}

let state = $state<ConsumerStoreState>({
	user: null,
	activationMap: new Map(),
	loading: false
});

const repo = createUserConsumerStore();

// ── Helpers ────────────────────────────────────────────────────────────

function refreshActivationMap(): void {
	state.activationMap = buildNodeActivationMap(state.user?.activateNodes ?? []);
}

// ── Exported accessor ──────────────────────────────────────────────────

export const consumer = {
	get user() { return state.user; },
	get activateTrees() { return state.user?.activateTrees ?? []; },
	get activateNodes() { return state.user?.activateNodes ?? []; },
	get activationMap() { return state.activationMap; },
	get libraryTabs() { return state.user?.libraryTabs ?? []; },
	get loading() { return state.loading; },
	get isReady() { return state.user !== null && !state.loading; },

	/** Node activation lookup by nodeId */
	getActivation(nodeId: string): NodeActivation | undefined {
		return state.activationMap.get(nodeId);
	},

	/** Whether a tree is activated */
	isTreeActivated(treeId: string): boolean {
		return state.user?.activateTrees.some((t) => t.treeId === treeId) ?? false;
	},

	/** Whether a node is activated */
	isNodeActivated(nodeId: string): boolean {
		return state.activationMap.has(nodeId);
	},

	/** Get enabled font node IDs (for feed loading) — only activated AND enabled */
	getEnabledFontNodeIds(allFontNodeIds: string[]): string[] {
		return allFontNodeIds.filter((nodeId) => {
			const activation = state.activationMap.get(nodeId);
			return activation != null && activation.enabled !== false;
		});
	},

	// ── Actions ──────────────────────────────────────────────────────

	async init(userId?: string): Promise<void> {
		if (state.loading) return;
		state.loading = true;

		try {
			let user: UserConsumer | null = null;

			if (userId) {
				user = await repo.getById(userId);
			}

			if (!user) {
				const consumers = await repo.getAll();
				user = consumers.length > 0 ? consumers[0] : await repo.create({ displayName: 'Default' });
			}

			state.user = user;
			refreshActivationMap();
		} finally {
			state.loading = false;
		}
	},

	/** Clear all in-memory consumer state (e.g. when switching away to a creator user). */
	clear(): void {
		state.user = null;
		state.activationMap = new Map();
	},

	async activateNode(nodeId: string): Promise<void> {
		if (!state.user) return;

		await repo.activateNode(state.user.id, nodeId);

		const refreshed = await repo.getById(state.user.id);
		if (refreshed) {
			state.user = refreshed;
			refreshActivationMap();
		}
	},

	async deactivateNode(nodeId: string): Promise<void> {
		if (!state.user) return;

		await repo.deactivateNode(state.user.id, nodeId);

		const refreshed = await repo.getById(state.user.id);
		if (refreshed) {
			state.user = refreshed;
			refreshActivationMap();
		}
	},

	async toggleNodeEnabled(nodeId: string): Promise<void> {
		if (!state.user) return;

		const current = state.activationMap.get(nodeId);
		const newEnabled = !(current?.enabled ?? true);

		await repo.setEnabled(state.user.id, nodeId, newEnabled);

		const refreshed = await repo.getById(state.user.id);
		if (refreshed) {
			state.user = refreshed;
			refreshActivationMap();
		}
	},

	/** Ensure a node is in activateNodes, auto-activating if needed. */
	async ensureNodeActivated(nodeId: string): Promise<void> {
		if (!state.user) return;
		if (state.activationMap.has(nodeId)) return;
		await this.activateNode(nodeId);
	},

	async setPriority(nodeId: string, level: PriorityLevel | null): Promise<void> {
		if (!state.user) return;

		await this.ensureNodeActivated(nodeId);
		await repo.setPriority(state.user.id, nodeId, level);

		// Optimistic update
		const activation = state.user.activateNodes.find((n) => n.nodeId === nodeId);
		if (activation) {
			activation.priority = level;
			refreshActivationMap();
		}
	},

	async setFavorite(nodeId: string, favorite: boolean): Promise<void> {
		if (!state.user) return;

		await this.ensureNodeActivated(nodeId);
		await repo.setFavorite(state.user.id, nodeId, favorite);

		// Optimistic update
		const activation = state.user.activateNodes.find((n) => n.nodeId === nodeId);
		if (activation) {
			activation.favorite = favorite;
			if (!favorite) activation.libraryTabIds = [];
			refreshActivationMap();
		}
	},

	async updateLibraryTabIds(nodeId: string, tabIds: string[]): Promise<void> {
		if (!state.user) return;

		await repo.updateLibraryTabIds(state.user.id, nodeId, tabIds);

		const activation = state.user.activateNodes.find((n) => n.nodeId === nodeId);
		if (activation) {
			activation.libraryTabIds = tabIds;
			refreshActivationMap();
		}
	},

	// ── Tab management ───────────────────────────────────────────────

	async createTab(title: string, emoji: string): Promise<LibraryTab> {
		if (!state.user) throw new Error('No active user');

		const maxPos = state.user.libraryTabs.reduce((max, t) => Math.max(max, t.position), 0);
		const tab = await repo.createTab(state.user.id, { title, emoji, position: maxPos + 1 });

		state.user = { ...state.user, libraryTabs: [...state.user.libraryTabs, tab] };
		return tab;
	},

	async updateTab(tabId: string, data: { title?: string; emoji?: string }): Promise<void> {
		if (!state.user) return;

		const updated = await repo.updateTab(state.user.id, tabId, data);
		state.user = {
			...state.user,
			libraryTabs: state.user.libraryTabs.map((t) => (t.id === tabId ? updated : t))
		};
	},

	async deleteTab(tabId: string): Promise<void> {
		if (!state.user) return;

		await repo.deleteTab(state.user.id, tabId);

		const refreshed = await repo.getById(state.user.id);
		if (refreshed) {
			state.user = refreshed;
			refreshActivationMap();
		}
	},

	// ── Feed macro management ────────────────────────────────────────

	get feedMacros(): FeedMacro[] {
		return state.user?.feedMacros ?? [];
	},

	async createMacro(macro: Omit<FeedMacro, 'id'>): Promise<FeedMacro> {
		if (!state.user) throw new Error('No active user');

		const created = await repo.createMacro(state.user.id, macro);
		state.user = { ...state.user, feedMacros: [...(state.user.feedMacros ?? []), created] };
		return created;
	},

	async updateMacro(macroId: string, filters: FeedMacroFilters): Promise<FeedMacro> {
		if (!state.user) throw new Error('No active user');

		const updated = await repo.updateMacro(state.user.id, macroId, filters);
		state.user = {
			...state.user,
			feedMacros: (state.user.feedMacros ?? []).map((m) => (m.id === macroId ? updated : m))
		};
		return updated;
	},

	async deleteMacro(macroId: string): Promise<void> {
		if (!state.user) return;

		await repo.deleteMacro(state.user.id, macroId);
		state.user = {
			...state.user,
			feedMacros: (state.user.feedMacros ?? []).filter((m) => m.id !== macroId)
		};
	},

	// ── Profile image ────────────────────────────────────────────────

	async setProfileImage(image: ImageAsset | null): Promise<void> {
		if (!state.user) return;

		await repo.setProfileImage(state.user.id, image);
		state.user = { ...state.user, profileImage: image, profileEmoji: image ? null : state.user.profileEmoji, updatedAt: new Date() };
	},

	async setProfileEmoji(emoji: string | null): Promise<void> {
		if (!state.user) return;

		await repo.setProfileEmoji(state.user.id, emoji);
		state.user = { ...state.user, profileEmoji: emoji, profileImage: emoji ? null : state.user.profileImage, updatedAt: new Date() };
	}
};
