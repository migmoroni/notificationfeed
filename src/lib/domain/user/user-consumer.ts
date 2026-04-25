/**
 * UserConsumer — local consumption account (refactored).
 *
 * Consumes feeds, organizes content, manages tree subscriptions and node activations.
 * Never publishes content.
 *
 * Key changes from previous model:
 *   - `follows` replaced by `activateTrees` (tree subscriptions)
 *   - `ConsumerState` replaced by `activateNodes` (per-node overrides)
 *   - Custom `LibraryTab` entries stored in user record (system tabs are app constants)
 *   - When a tree is activated, its root node is auto-activated
 */

import type { FeedMacro, FeedMacroFilters } from '../feed-macro/feed-macro.js';
import type { ImageAsset } from '../shared/image-asset.js';
import type { UserBase } from './user.js';

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

	/** Whether this node is marked as favorite */
	favorite: boolean;

	/** Local enabled/disabled override */
	enabled: boolean;

	/**
	 * Library tab assignments (many-to-many). Empty array means the item
	 * only appears in system tabs (all library / only favorites when favorite === true).
	 */
	libraryTabIds: string[];
}

// ---------------------------------------------------------------------------
// Library tabs
// ---------------------------------------------------------------------------

/**
 * LibraryTab — user-created custom tab for organizing library items.
 * System tabs (All Library, Only Favorites) are NOT stored in the user record;
 * they are application constants defined below.
 */
export interface LibraryTab {
	id: string;
	title: string;
	emoji: string;
	position: number;
	createdAt: Date;
}

/** System tab ID: shows all activated nodes */
export const SYSTEM_ALL_LIBRARY_TAB_ID = '00000000-0000-0000-0000-alllib000001';
/** System tab ID: shows only favorite nodes */
export const SYSTEM_ONLY_FAVORITES_TAB_ID = '00000000-0000-0000-0000-onlyfav00001';

/** System tabs — application constants, never persisted in user record */
export const SYSTEM_LIBRARY_TABS: ReadonlyArray<Readonly<LibraryTab & { isSystem: true }>> = [
	{
		id: SYSTEM_ALL_LIBRARY_TAB_ID,
		title: 'All Library',
		emoji: '📚',
		position: -2,
		isSystem: true,
		createdAt: new Date(0)
	},
	{
		id: SYSTEM_ONLY_FAVORITES_TAB_ID,
		title: 'Only Favorites',
		emoji: '⭐',
		position: -1,
		isSystem: true,
		createdAt: new Date(0)
	}
] as const;

// ---------------------------------------------------------------------------
// UserConsumer
// ---------------------------------------------------------------------------

export interface UserConsumer extends UserBase {
	role: 'consumer';

	/** Trees the user has subscribed to */
	activateTrees: TreeActivation[];

	/** Per-node activation state (priority, favorite, enabled) */
	activateNodes: NodeActivation[];

	/** Custom library tabs created by the user (system tabs are app constants) */
	libraryTabs: LibraryTab[];

	/** Saved feed filter presets */
	feedMacros: FeedMacro[];
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
	setFavorite(userId: string, nodeId: string, favorite: boolean): Promise<void>;
	setEnabled(userId: string, nodeId: string, enabled: boolean): Promise<void>;
	updateLibraryTabIds(userId: string, nodeId: string, tabIds: string[]): Promise<void>;

	/** Custom library tab management (embedded in user) */
	createTab(userId: string, tab: Omit<LibraryTab, 'id' | 'createdAt'>): Promise<LibraryTab>;
	updateTab(userId: string, tabId: string, data: Partial<Pick<LibraryTab, 'title' | 'emoji' | 'position'>>): Promise<LibraryTab>;
	deleteTab(userId: string, tabId: string): Promise<void>;

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
