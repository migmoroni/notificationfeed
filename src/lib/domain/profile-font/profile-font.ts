/**
 * ProfileFont — junction record linking a Profile to a Font.
 *
 * Enables N:N relationships between profiles and fonts.
 * A font can appear in multiple profiles, and a profile can contain multiple fonts.
 * Section grouping and display order within the profile are stored here,
 * not on the font itself.
 */

export interface ProfileFont {
	id: string;

	/** The Profile this link belongs to */
	profileId: string;

	/** The Font being linked */
	fontId: string;

	/** Section within the parent Profile (visual grouping, null = unsectioned) */
	sectionId: string | null;

	/** Display order within the profile (0-based) */
	order: number;
}

export type NewProfileFont = Omit<ProfileFont, 'id'>;

export interface ProfileFontRepository {
	getAll(): Promise<ProfileFont[]>;
	getById(id: string): Promise<ProfileFont | null>;
	getByProfileId(profileId: string): Promise<ProfileFont[]>;
	getByFontId(fontId: string): Promise<ProfileFont[]>;
	create(data: NewProfileFont): Promise<ProfileFont>;
	update(id: string, data: Partial<NewProfileFont>): Promise<ProfileFont>;
	delete(id: string): Promise<void>;
	deleteByProfileId(profileId: string): Promise<void>;
	deleteByFontId(fontId: string): Promise<void>;
}
