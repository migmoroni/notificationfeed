/**
 * UserConsumer — local consumption account (refactored).
 *
 * Consumes feeds, organizes content, manages tree subscriptions and node activations.
 * Never publishes content.
 *
 * Key changes from previous model:
 *   - `follows` replaced by `activateTrees` (tree subscriptions)
 *   - `ConsumerState` replaced by `activateNodes` (per-node overrides)
 *   - `FavoriteTab` moved from separate store into user record
 *   - When a tree is activated, its root node is auto-activated
 */

import type { PriorityLevel } from './priority-level.js';
import type { FeedMacro, FeedMacroFilters } from '../feed-macro/feed-macro.js';
import type { ImageAsset } from '../shared/image-asset.js';

// ---------------------------------------------------------------------------
// Tree activation
// ---------------------------------------------------------------------------

export interface TreeActivation {
	treeId: string;
	activatedAt: Date;
}

// ---------------------------------------------------------------------------
// Node activation
// ---------------------------------------------------------------------------

export interface NodeActivation {
	/**
	 * Composite node ID: `treeId:localUuid`.
	 * References a TreeNode embedded in a ContentTree.
	 */
	nodeId: string;

	/**
	 * Priority override. null = inherit from parent in tree.
	 * Inheritance chain: fontNode → root → 3 (default)
	 */
	priority: PriorityLevel | null;

	/** Whether this node is marked as favorite */
	favorite: boolean;

	/** Local enabled/disabled override */
	enabled: boolean;

	/**
	 * Tab assignments (many-to-many). Empty array means the item
	 * only appears in the system "all_favorites" tab (when favorite === true).
	 */
	favoriteTabIds: string[];

	/** User-defined tag assignments for this node */
	tagIds: string[];
}

// ---------------------------------------------------------------------------
// Favorite tabs (embedded in user)
// ---------------------------------------------------------------------------

export interface FavoriteTab {
	id: string;
	title: string;
	emoji: string;
	position: number;
	isSystem: boolean;
	createdAt: Date;
}

export const SYSTEM_FAVORITES_TAB_ID = '00000000-0000-0000-0000-allfav000001';

// ---------------------------------------------------------------------------
// User tags (embedded in user)
// ---------------------------------------------------------------------------

export interface UserTag {
	id: string;
	name: string;
	createdAt: Date;
}

// ---------------------------------------------------------------------------
// UserConsumer
// ---------------------------------------------------------------------------

export interface UserConsumer {
	id: string;
	role: 'consumer';
	displayName: string;

	/** Profile image (avatar slot, WEBP base64). Null = default icon. Mutually exclusive with profileEmoji. */
	profileImage: ImageAsset | null;

	/** Profile emoji (alternative to image). Mutually exclusive with profileImage. */
	profileEmoji: string | null;

	/** Soft-delete flag. Removed users are hidden but kept in DB. */
	removedAt: Date | null;

	/** Trees the user has subscribed to */
	activateTrees: TreeActivation[];

	/** Per-node activation state (priority, favorite, enabled) */
	activateNodes: NodeActivation[];

	/** Favorite tabs (system "all_favorites" + custom tabs) */
	favoriteTabs: FavoriteTab[];

	/** User-defined tags for annotating activated nodes */
	userTags: UserTag[];

	/** Saved feed filter presets */
	feedMacros: FeedMacro[];

	createdAt: Date;
	updatedAt: Date;
}

export type NewUserConsumer = Pick<UserConsumer, 'displayName'>;

// ---------------------------------------------------------------------------
// Repository contract
// ---------------------------------------------------------------------------

export interface UserConsumerRepository {
	getAll(): Promise<UserConsumer[]>;
	getById(id: string): Promise<UserConsumer | null>;
	create(data: NewUserConsumer): Promise<UserConsumer>;
	update(id: string, data: Partial<NewUserConsumer>): Promise<UserConsumer>;
	delete(id: string): Promise<void>;

	/** Node activation management (cascades tree + root activation/deactivation) */
	activateNode(userId: string, nodeId: string): Promise<void>;
	deactivateNode(userId: string, nodeId: string): Promise<void>;

	/** Per-node state */
	setPriority(userId: string, nodeId: string, priority: PriorityLevel | null): Promise<void>;
	setFavorite(userId: string, nodeId: string, favorite: boolean): Promise<void>;
	setEnabled(userId: string, nodeId: string, enabled: boolean): Promise<void>;
	updateFavoriteTabIds(userId: string, nodeId: string, tabIds: string[]): Promise<void>;

	/** Favorite tab management (embedded in user) */
	createTab(userId: string, tab: Omit<FavoriteTab, 'id' | 'isSystem' | 'createdAt'>): Promise<FavoriteTab>;
	updateTab(userId: string, tabId: string, data: Partial<Pick<FavoriteTab, 'title' | 'emoji' | 'position'>>): Promise<FavoriteTab>;
	deleteTab(userId: string, tabId: string): Promise<void>;

	/** User tag management (embedded in user) */
	createUserTag(userId: string, name: string): Promise<UserTag>;
	updateUserTag(userId: string, tagId: string, name: string): Promise<UserTag>;
	deleteUserTag(userId: string, tagId: string): Promise<void>;
	updateNodeTagIds(userId: string, nodeId: string, tagIds: string[]): Promise<void>;

	/** Feed macro management (embedded in user) */
	createMacro(userId: string, macro: Omit<FeedMacro, 'id'>): Promise<FeedMacro>;
	updateMacro(userId: string, macroId: string, filters: FeedMacroFilters): Promise<FeedMacro>;
	deleteMacro(userId: string, macroId: string): Promise<void>;

	/** Profile image / emoji */
	setProfileImage(userId: string, image: ImageAsset | null): Promise<void>;
	setProfileEmoji(userId: string, emoji: string | null): Promise<void>;

	/** Soft-delete / restore */
	softDelete(userId: string): Promise<void>;
	restore(userId: string): Promise<void>;
}
