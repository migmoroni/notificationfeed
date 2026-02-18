/**
 * FavoriteFolder — container for organizing favorited entities.
 *
 * The "Inbox" folder is system-created and cannot be renamed, deleted, or reordered.
 * All newly-favorited entities land in Inbox (favoriteFolderId = null on ConsumerState).
 * Users can create additional folders and move items between them.
 *
 * UI presents two interchangeable views:
 * - List/grid: folders shown as collapsible sections
 * - Tabs: each folder is a lateral tab
 */

export interface FavoriteFolder {
	id: string;

	/** Display name */
	name: string;

	/** True only for the system "Inbox" folder */
	isInbox: boolean;

	/** Sort order (Inbox is always 0) */
	order: number;

	createdAt: Date;
}

export type NewFavoriteFolder = Omit<FavoriteFolder, 'id' | 'createdAt'>;

/**
 * Contract for FavoriteFolder persistence.
 */
export interface FavoriteFolderRepository {
	getAll(): Promise<FavoriteFolder[]>;
	getById(id: string): Promise<FavoriteFolder | null>;
	getInbox(): Promise<FavoriteFolder>;
	create(folder: NewFavoriteFolder): Promise<FavoriteFolder>;
	update(id: string, data: Partial<Pick<FavoriteFolder, 'name' | 'order'>>): Promise<FavoriteFolder>;
	delete(id: string): Promise<void>;
}
