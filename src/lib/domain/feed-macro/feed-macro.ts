/**
 * FeedMacro — saved filter preset for the feed.
 *
 * Represents a named snapshot of combined filters (entity selection +
 * category selection) that the user can apply in one click.
 * Stored in IndexedDB under the `feedMacros` store.
 */

export interface FeedMacroFilters {
	pageIds: string[];
	profileIds: string[];
	fontIds: string[];
	subjectIds: string[];
	contentTypeIds: string[];
	regionIds: string[];
}

export interface FeedMacro {
	id: string;
	name: string;
	filters: FeedMacroFilters;
}

export type NewFeedMacro = Omit<FeedMacro, 'id'>;

export interface FeedMacroRepository {
	getAll(): Promise<FeedMacro[]>;
	save(macro: FeedMacro): Promise<void>;
	delete(id: string): Promise<void>;
}
