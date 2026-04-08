/**
 * Active User Store — manages which user identity is currently active.
 *
 * Supports switching between multiple UserConsumer and UserCreator identities.
 * The active user determines which nav items are shown and which stores are
 * initialized (consumer vs creator).
 *
 * Pattern: module-level $state + exported read-only accessor.
 */

import type { UserBase, UserRole } from '$lib/domain/user/user.js';
import type { UserConsumer } from '$lib/domain/user/user-consumer.js';
import type { UserCreator } from '$lib/domain/user/user-creator.js';
import type { ImageAsset } from '$lib/domain/shared/image-asset.js';
import { getDatabase } from '$lib/persistence/db.js';

// ── Internal reactive state ────────────────────────────────────────────

interface ActiveUserState {
	current: UserBase | null;
	allUsers: UserBase[];
	loading: boolean;
}

let state = $state<ActiveUserState>({
	current: null,
	allUsers: [],
	loading: false
});

// ── Helpers ────────────────────────────────────────────────────────────

const ACTIVE_USER_KEY = 'notfeed:active-user-id';

function saveActiveUserId(userId: string): void {
	try { localStorage.setItem(ACTIVE_USER_KEY, userId); } catch { /* SSR / private mode */ }
}

function loadActiveUserId(): string | null {
	try { return localStorage.getItem(ACTIVE_USER_KEY); } catch { return null; }
}

async function loadAllUsers(): Promise<UserBase[]> {
	const db = await getDatabase();
	const users = await db.users.getAll<UserBase>();
	return users;
}

async function persistUser(user: UserBase): Promise<void> {
	const db = await getDatabase();
	await db.users.put($state.snapshot(user));
}

// ── Exported accessor ──────────────────────────────────────────────────

export const activeUser = {
	get current() { return state.current; },
	get role(): UserRole | null { return state.current?.role ?? null; },
	get isConsumer() { return state.current?.role === 'consumer'; },
	get isCreator() { return state.current?.role === 'creator'; },
	get allUsers() { return state.allUsers; },
	get consumers() { return state.allUsers.filter((u): u is UserConsumer => u.role === 'consumer' && !u.removedAt); },
	get creators() { return state.allUsers.filter((u): u is UserCreator => u.role === 'creator' && !u.removedAt); },
	get removedUsers() { return state.allUsers.filter((u) => !!u.removedAt); },
	get loading() { return state.loading; },

	/**
	 * Initialize: load all users from DB.
	 * Restores the last active user from localStorage; falls back to first consumer.
	 * Called from +layout.svelte before store-specific init().
	 */
	async init(): Promise<void> {
		if (state.loading) return;
		state.loading = true;

		try {
			state.allUsers = await loadAllUsers();

			if (!state.current) {
				// Try to restore last active user
				const savedId = loadActiveUserId();
				const saved = savedId ? state.allUsers.find(u => u.id === savedId) : null;

				if (saved) {
					state.current = saved;
				} else {
					// Fallback: first consumer
					const consumers = state.allUsers.filter(u => u.role === 'consumer');
					if (consumers.length > 0) {
						state.current = consumers[0];
						saveActiveUserId(consumers[0].id);
					}
				}
			}
		} finally {
			state.loading = false;
		}
	},

	/**
	 * Reload the user list (e.g. after creating a new user).
	 * Also refreshes state.current so the active user banner picks up changes.
	 */
	async reload(): Promise<void> {
		state.allUsers = await loadAllUsers();
		if (state.current) {
			const fresh = state.allUsers.find(u => u.id === state.current!.id);
			if (fresh) state.current = fresh;
		}
	},

	/**
	 * Switch to a different user by ID.
	 */
	switchTo(userId: string): void {
		const user = state.allUsers.find(u => u.id === userId);
		if (user) {
			state.current = user;
			saveActiveUserId(user.id);
		}
	},

	/**
	 * Set the active user directly (used during init when consumer.init() creates the user).
	 */
	setActive(user: UserBase): void {
		state.current = user;
		saveActiveUserId(user.id);
		// Also update in allUsers list if not present
		if (!state.allUsers.find(u => u.id === user.id)) {
			state.allUsers = [...state.allUsers, user];
		}
	},

	/**
	 * Create a new consumer user.
	 */
	async createConsumer(displayName: string): Promise<UserConsumer> {
		const now = new Date();
		const user: UserConsumer = {
			id: crypto.randomUUID(),
			role: 'consumer',
			displayName,
			profileImage: null,
			profileEmoji: null,
			removedAt: null,
			activateTrees: [],
			activateNodes: [],
			favoriteTabs: [],
			feedMacros: [],
			createdAt: now,
			updatedAt: now
		};
		await persistUser(user);
		state.allUsers = [...state.allUsers, user];
		return user;
	},

	/**
	 * Create a new creator user (local, no Nostr keypair).
	 */
	async createCreator(displayName: string): Promise<UserCreator> {
		const now = new Date();
		const user: UserCreator = {
			id: crypto.randomUUID(),
			role: 'creator',
			displayName,
			profileImage: null,
			profileEmoji: null,
			removedAt: null,
			nostrKeypair: null,
			syncStatus: 'local',
			ownedTreeIds: [],
			ownedMediaIds: [],
			createdAt: now,
			updatedAt: now
		};
		await persistUser(user);
		state.allUsers = [...state.allUsers, user];
		return user;
	},

	/**
	 * Update a user's display name.
	 */
	async updateDisplayName(userId: string, displayName: string): Promise<void> {
		const user = state.allUsers.find(u => u.id === userId);
		if (!user) return;

		const updated = { ...user, displayName, updatedAt: new Date() };
		await persistUser(updated);

		state.allUsers = state.allUsers.map(u => u.id === userId ? updated : u);
		if (state.current?.id === userId) {
			state.current = updated;
		}
	},

	/**
	 * Update a user's profile image.
	 */
	async setProfileImage(userId: string, image: ImageAsset | null): Promise<void> {
		const user = state.allUsers.find(u => u.id === userId);
		if (!user) return;

		const updated = { ...user, profileImage: image, profileEmoji: image ? null : user.profileEmoji, updatedAt: new Date() };
		await persistUser(updated);

		state.allUsers = state.allUsers.map(u => u.id === userId ? updated : u);
		if (state.current?.id === userId) {
			state.current = updated;
		}
	},

	async setProfileEmoji(userId: string, emoji: string | null): Promise<void> {
		const user = state.allUsers.find(u => u.id === userId);
		if (!user) return;

		const updated = { ...user, profileEmoji: emoji, profileImage: emoji ? null : user.profileImage, updatedAt: new Date() };
		await persistUser(updated);

		state.allUsers = state.allUsers.map(u => u.id === userId ? updated : u);
		if (state.current?.id === userId) {
			state.current = updated;
		}
	},

	/**
	 * Soft-delete a user (mark as removed, keep in DB).
	 */
	async softDelete(userId: string): Promise<void> {
		const user = state.allUsers.find(u => u.id === userId);
		if (!user) return;

		const updated = { ...user, removedAt: new Date(), updatedAt: new Date() };
		await persistUser(updated);

		state.allUsers = state.allUsers.map(u => u.id === userId ? updated : u);

		// If the deleted user is the current one, switch to first available
		if (state.current?.id === userId) {
			const available = state.allUsers.find(u => u.id !== userId && !u.removedAt);
			if (available) {
				state.current = available;
				saveActiveUserId(available.id);
			} else {
				state.current = null;
			}
		}
	},

	/**
	 * Restore a soft-deleted user.
	 */
	async restore(userId: string): Promise<void> {
		const user = state.allUsers.find(u => u.id === userId);
		if (!user) return;

		const updated = { ...user, removedAt: null, updatedAt: new Date() };
		await persistUser(updated);

		state.allUsers = state.allUsers.map(u => u.id === userId ? updated : u);
	}
};
