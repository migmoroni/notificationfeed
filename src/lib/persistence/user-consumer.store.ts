/**
 * UserConsumer store — persistence for user consumers with tree/node activations.
 *
 * Replaces the old follows/consumerStates model with activateTrees/activateNodes.
 * LibraryTabs are now embedded in the user record.
 */

import type {
	UserConsumer,
	UserConsumerRepository,
	NewUserConsumer,
	NodeActivation,
} from '$lib/domain/user/user-consumer.js';
import type { LibraryTab } from '$lib/domain/user/user-consumer.js';
import type { FeedMacro, FeedMacroFilters } from '$lib/domain/feed-macro/feed-macro.js';
import type { ImageAsset } from '$lib/domain/shared/image-asset.js';
import { createUserSettings } from '$lib/domain/user/user.js';
import { uuidv7 } from '$lib/domain/shared/uuidv7.js';
import { parseTreeId, getRootNodeId, getAllNodeIds } from '$lib/domain/content-tree/content-tree.js';
import { getStorageBackend } from './db.js';
import { getTreeByNodeId } from './content-tree.store.js';

export function createUserConsumerStore(): UserConsumerRepository {
	return {
		async getAll(): Promise<UserConsumer[]> {
			const db = await getStorageBackend();
			return db.users.query<UserConsumer>('role', 'consumer');
		},

		async getById(id: string): Promise<UserConsumer | null> {
			const db = await getStorageBackend();
			return db.users.getById<UserConsumer>(id);
		},

		async create(data: NewUserConsumer): Promise<UserConsumer> {
			const db = await getStorageBackend();
			const now = new Date();
			const consumer: UserConsumer = {
				id: uuidv7(),
				role: 'consumer',
				displayName: data.displayName,
				profileImage: null,
				profileEmoji: null,
				removedAt: null,
				settingsUser: createUserSettings(),
				activateTrees: [],
				activateNodes: [],
				libraryTabs: [],
				feedMacros: [],
				interactedAt: now,
				createdAt: now,
				updatedAt: now
			};
			await db.users.put(consumer);
			return consumer;
		},

		async update(id: string, data: Partial<NewUserConsumer>): Promise<UserConsumer> {
			const db = await getStorageBackend();
			const existing = await db.users.getById<UserConsumer>(id);
			if (!existing) throw new Error(`UserConsumer not found: ${id}`);

			const updated: UserConsumer = {
				...existing,
				...data,
				updatedAt: new Date()
			};
			await db.users.put(updated);
			return updated;
		},

		async delete(id: string): Promise<void> {
			const db = await getStorageBackend();
			await db.users.delete(id);
		},

		// -- Node management (cascades tree + root activation) --

		async activateNode(userId: string, nodeId: string): Promise<void> {
			const db = await getStorageBackend();
			const user = await db.users.getById<UserConsumer>(userId);
			if (!user) throw new Error(`UserConsumer not found: ${userId}`);

			const exists = user.activateNodes.some((n) => n.nodeId === nodeId);
			if (exists) return;

			// Cascade: ensure the tree and its root node are also activated
			const treeId = parseTreeId(nodeId);
			const tree = await getTreeByNodeId(nodeId);

			if (tree) {
				// Activate tree if not already subscribed
				if (!user.activateTrees.some((t) => t.treeId === treeId)) {
					user.activateTrees.push({ treeId, activatedAt: new Date() });
				}

				// Activate root node if not already activated and this isn't the root
				const rootNodeId = getRootNodeId(tree);
				if (rootNodeId && rootNodeId !== nodeId) {
					if (!user.activateNodes.some((n) => n.nodeId === rootNodeId)) {
						user.activateNodes.push({
							nodeId: rootNodeId,
							favorite: false,
							enabled: true,
							libraryTabIds: []
						});
					}
				}
			}

			const activation: NodeActivation = {
				nodeId,
				favorite: false,
				enabled: true,
				libraryTabIds: []
			};
			user.activateNodes.push(activation);
			user.updatedAt = new Date();
			await db.users.put(user);
		},

		async deactivateNode(userId: string, nodeId: string): Promise<void> {
			const db = await getStorageBackend();
			const user = await db.users.getById<UserConsumer>(userId);
			if (!user) throw new Error(`UserConsumer not found: ${userId}`);

			const tree = await getTreeByNodeId(nodeId);

			if (tree) {
				const rootNodeId = getRootNodeId(tree);

				if (nodeId === rootNodeId) {
					// Cascade: deactivating root removes all nodes in the tree + the tree subscription
					const allIds = new Set(getAllNodeIds(tree));
					user.activateNodes = user.activateNodes.filter((n) => !allIds.has(n.nodeId));
					const treeId = parseTreeId(nodeId);
					user.activateTrees = user.activateTrees.filter((t) => t.treeId !== treeId);
				} else {
					// Non-root: remove only this node
					user.activateNodes = user.activateNodes.filter((n) => n.nodeId !== nodeId);
				}
			} else {
				// Tree not found — remove just the node
				user.activateNodes = user.activateNodes.filter((n) => n.nodeId !== nodeId);
			}

			user.updatedAt = new Date();
			await db.users.put(user);
		},

		async setFavorite(userId: string, nodeId: string, favorite: boolean): Promise<void> {
			const db = await getStorageBackend();
			const user = await db.users.getById<UserConsumer>(userId);
			if (!user) throw new Error(`UserConsumer not found: ${userId}`);

			const activation = user.activateNodes.find((n) => n.nodeId === nodeId);
			if (!activation) throw new Error(`Node not activated: ${nodeId}`);

			activation.favorite = favorite;
			if (!favorite) {
				activation.libraryTabIds = [];
			}
			user.updatedAt = new Date();
			await db.users.put(user);
		},

		async setEnabled(userId: string, nodeId: string, enabled: boolean): Promise<void> {
			const db = await getStorageBackend();
			const user = await db.users.getById<UserConsumer>(userId);
			if (!user) throw new Error(`UserConsumer not found: ${userId}`);

			const activation = user.activateNodes.find((n) => n.nodeId === nodeId);
			if (!activation) throw new Error(`Node not activated: ${nodeId}`);

			activation.enabled = enabled;
			user.updatedAt = new Date();
			await db.users.put(user);
		},

		async updateLibraryTabIds(userId: string, nodeId: string, tabIds: string[]): Promise<void> {
			const db = await getStorageBackend();
			const user = await db.users.getById<UserConsumer>(userId);
			if (!user) throw new Error(`UserConsumer not found: ${userId}`);

			const activation = user.activateNodes.find((n) => n.nodeId === nodeId);
			if (!activation) throw new Error(`Node not activated: ${nodeId}`);

			activation.libraryTabIds = tabIds;
			user.updatedAt = new Date();
			await db.users.put(user);
		},

		// -- Tab management (embedded in user) --

		async createTab(
			userId: string,
			tab: Omit<LibraryTab, 'id' | 'createdAt'>
		): Promise<LibraryTab> {
			const db = await getStorageBackend();
			const user = await db.users.getById<UserConsumer>(userId);
			if (!user) throw new Error(`UserConsumer not found: ${userId}`);

			const newTab: LibraryTab = {
				id: uuidv7(),
				createdAt: new Date(),
				...tab
			};
			user.libraryTabs.push(newTab);
			user.updatedAt = new Date();
			await db.users.put(user);
			return newTab;
		},

		async updateTab(
			userId: string,
			tabId: string,
			data: Partial<Pick<LibraryTab, 'title' | 'emoji' | 'position'>>
		): Promise<LibraryTab> {
			const db = await getStorageBackend();
			const user = await db.users.getById<UserConsumer>(userId);
			if (!user) throw new Error(`UserConsumer not found: ${userId}`);

			const tab = user.libraryTabs.find((t) => t.id === tabId);
			if (!tab) throw new Error(`LibraryTab not found: ${tabId}`);

			Object.assign(tab, data);
			user.updatedAt = new Date();
			await db.users.put(user);
			return tab;
		},

		async deleteTab(userId: string, tabId: string): Promise<void> {
			const db = await getStorageBackend();
			const user = await db.users.getById<UserConsumer>(userId);
			if (!user) throw new Error(`UserConsumer not found: ${userId}`);

			const tab = user.libraryTabs.find((t) => t.id === tabId);
			if (!tab) return;

			user.libraryTabs = user.libraryTabs.filter((t) => t.id !== tabId);

			// Clear tab references from node activations
			for (const activation of user.activateNodes) {
				activation.libraryTabIds = activation.libraryTabIds.filter((id) => id !== tabId);
			}

			user.updatedAt = new Date();
			await db.users.put(user);
		},

		// -- Feed macro management (embedded in user) --

		async createMacro(
			userId: string,
			macro: Omit<FeedMacro, 'id'>
		): Promise<FeedMacro> {
			const db = await getStorageBackend();
			const user = await db.users.getById<UserConsumer>(userId);
			if (!user) throw new Error(`UserConsumer not found: ${userId}`);

			const newMacro: FeedMacro = { id: uuidv7(), ...macro };
			user.feedMacros = [...(user.feedMacros ?? []), newMacro];
			user.updatedAt = new Date();
			await db.users.put(user);
			return newMacro;
		},

		async updateMacro(
			userId: string,
			macroId: string,
			filters: FeedMacroFilters
		): Promise<FeedMacro> {
			const db = await getStorageBackend();
			const user = await db.users.getById<UserConsumer>(userId);
			if (!user) throw new Error(`UserConsumer not found: ${userId}`);

			const macro = (user.feedMacros ?? []).find((m) => m.id === macroId);
			if (!macro) throw new Error(`FeedMacro not found: ${macroId}`);

			macro.filters = filters;
			user.updatedAt = new Date();
			await db.users.put(user);
			return macro;
		},

		async deleteMacro(userId: string, macroId: string): Promise<void> {
			const db = await getStorageBackend();
			const user = await db.users.getById<UserConsumer>(userId);
			if (!user) throw new Error(`UserConsumer not found: ${userId}`);

			user.feedMacros = (user.feedMacros ?? []).filter((m) => m.id !== macroId);
			user.updatedAt = new Date();
			await db.users.put(user);
		},

		// -- Profile image --

		async setProfileImage(userId: string, image: ImageAsset | null): Promise<void> {
			const db = await getStorageBackend();
			const user = await db.users.getById<UserConsumer>(userId);
			if (!user) throw new Error(`UserConsumer not found: ${userId}`);

			user.profileImage = image;
			if (image) user.profileEmoji = null;
			user.updatedAt = new Date();
			await db.users.put(user);
		},

		async setProfileEmoji(userId: string, emoji: string | null): Promise<void> {
			const db = await getStorageBackend();
			const user = await db.users.getById<UserConsumer>(userId);
			if (!user) throw new Error(`UserConsumer not found: ${userId}`);

			user.profileEmoji = emoji;
			if (emoji) user.profileImage = null;
			user.updatedAt = new Date();
			await db.users.put(user);
		},

		// -- Soft-delete / restore --

		async softDelete(userId: string): Promise<void> {
			const db = await getStorageBackend();
			const user = await db.users.getById<UserConsumer>(userId);
			if (!user) throw new Error(`UserConsumer not found: ${userId}`);

			user.removedAt = new Date();
			user.updatedAt = new Date();
			await db.users.put(user);
		},

		async restore(userId: string): Promise<void> {
			const db = await getStorageBackend();
			const user = await db.users.getById<UserConsumer>(userId);
			if (!user) throw new Error(`UserConsumer not found: ${userId}`);

			user.removedAt = null;
			user.updatedAt = new Date();
			await db.users.put(user);
		}
	};
}
