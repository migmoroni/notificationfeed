/**
 * FeedMacro — saved filter preset for the feed.
 *
 * Simplified: uses nodeIds instead of separate pageIds/profileIds/fontIds.
 * Category filters remain unchanged.
 */

export interface FeedMacroFilters {
	/** Selected content node IDs (any role) */
	nodeIds: string[];
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
