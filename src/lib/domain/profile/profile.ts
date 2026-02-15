/**
 * Profile — the central entity of Notfeed.
 *
 * A Profile represents a user identity that aggregates multiple Fonts (data sources).
 * All feeds, notifications, and settings revolve around Profiles.
 */

export interface Profile {
	id: string;
	name: string;
	avatarUrl?: string;
	createdAt: Date;
	updatedAt: Date;
}

export type NewProfile = Omit<Profile, 'id' | 'createdAt' | 'updatedAt'>;
