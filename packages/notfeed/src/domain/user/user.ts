/**
 * User — root identity in Notfeed.
 *
 * Two mutually exclusive roles: consumer and creator.
 * Both can coexist on the same device as separate user records.
 */

import type { ImageAsset } from '../shared/image-asset.js';
import {
	createIngestionSettings,
	type IngestionSettings
} from '../ingestion/ingestion-settings.js';
import {
	createNotificationPipeline,
	type NotificationPipeline
} from '../notifications/pipeline.js';

export type UserRole = 'consumer' | 'creator';

/**
 * Per-user app settings.
 *
 * Controls UI behavior and opt-in subsystems. Persisted in the user record
 * (NOT in localStorage), so it travels with the user identity and can differ
 * per user on the same device.
 */
export interface UserSettings {
	/** Preferred UI language (e.g. 'en-US', 'pt-BR'). */
	language: string;
	/** Activity tracking subsystem. */
	activity: {
		/** When false, `activityService.record` is a no-op. */
		enabled: boolean;
	};
	/** Ingestion / scheduler / retention configuration. */
	ingestion: IngestionSettings;
	/**
	 * Notification pipeline (master toggle + the three funnel steps).
	 * Lives here, not in a separate persistence store, because it's a
	 * per-user preference like every other settings slice.
	 */
	notifications: NotificationPipeline;
}

/** Factory used on user creation to seed default settings. */
export function createUserSettings(language = 'en-US'): UserSettings {
	return {
		language,
		activity: { enabled: true },
		ingestion: createIngestionSettings(),
		notifications: createNotificationPipeline()
	};
}

export interface UserBase {
	id: string;
	role: UserRole;

	/** Display name (max 50 characters) */
	displayName: string;

	/** Profile image (avatar slot, WEBP base64). Null = default icon. Mutually exclusive with profileEmoji. */
	profileImage: ImageAsset | null;

	/** Profile emoji (alternative to image). Mutually exclusive with profileImage. */
	profileEmoji: string | null;

	/** Soft-delete flag. Removed users are hidden but kept in DB. */
	removedAt: Date | null;

	/** Per-user app settings (language, activity, …). */
	settingsUser: UserSettings;

	/**
	 * Last time the user "interacted" with the app — opening it, tapping
	 * a notification, etc. Used by the ingestion scheduler to decide
	 * which idle-tier polling interval to apply for this user's fonts.
	 */
	interactedAt: Date;

	createdAt: Date;
	updatedAt: Date;
}
