/**
 * FavoriteTab — container for organizing favorited entities.
 *
 * Tabs are a many-to-many association: a FavoriteItem can belong
 * to multiple tabs simultaneously. The system tab "all_favorites"
 * always exists and cannot be deleted, renamed, or reordered.
 * Every favorited entity appears in all_favorites automatically.
 *
 * Users can create custom tabs with an emoji + title, and assign
 * items to multiple tabs via bulk selection.
 *
 * UI presents tabs as a vertical sidebar (expanded: emoji + title,
 * compact: emoji only).
 */

export interface FavoriteTab {
	id: string;

	/** Display name (max 20 chars) */
	title: string;

	/** Required emoji identifier (unique per tab) */
	emoji: string;

	/** Sort order (all_favorites is always 0) */
	position: number;

	/** True only for the system "all_favorites" tab */
	isSystem: boolean;

	createdAt: Date;
}

export type NewFavoriteTab = Omit<FavoriteTab, 'id' | 'createdAt'>;

/**
 * Contract for FavoriteTab persistence.
 */
export interface FavoriteTabRepository {
	getAll(): Promise<FavoriteTab[]>;
	getById(id: string): Promise<FavoriteTab | null>;
	getSystemTab(): Promise<FavoriteTab>;
	create(tab: NewFavoriteTab): Promise<FavoriteTab>;
	update(id: string, data: Partial<Pick<FavoriteTab, 'title' | 'emoji' | 'position'>>): Promise<FavoriteTab>;
	delete(id: string): Promise<void>;
}
