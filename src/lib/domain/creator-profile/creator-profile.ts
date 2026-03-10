/**
 * CreatorProfile — junction record linking a CreatorPage to a Profile.
 *
 * Enables N:N relationships between pages and profiles.
 * A profile can appear in multiple pages, and a page can contain multiple profiles.
 * Section grouping and display order within the page are stored here,
 * not on the profile itself.
 */

export interface CreatorProfile {
	id: string;

	/** The CreatorPage this link belongs to */
	creatorPageId: string;

	/** The Profile being linked */
	profileId: string;

	/** Section within the parent CreatorPage (visual grouping, null = unsectioned) */
	sectionId: string | null;

	/** Display order within the page (0-based) */
	order: number;
}

export type NewCreatorProfile = Omit<CreatorProfile, 'id'>;

export interface CreatorProfileRepository {
	getAll(): Promise<CreatorProfile[]>;
	getById(id: string): Promise<CreatorProfile | null>;
	getByCreatorPageId(creatorPageId: string): Promise<CreatorProfile[]>;
	getByProfileId(profileId: string): Promise<CreatorProfile[]>;
	create(data: NewCreatorProfile): Promise<CreatorProfile>;
	update(id: string, data: Partial<NewCreatorProfile>): Promise<CreatorProfile>;
	delete(id: string): Promise<void>;
	deleteByCreatorPageId(creatorPageId: string): Promise<void>;
	deleteByProfileId(profileId: string): Promise<void>;
}
