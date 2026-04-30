/**
 * ImageAsset — value object for stored images.
 *
 * All uploaded images are converted to WEBP before persistence.
 * The original format is not preserved in storage.
 */

import { IMAGE_LIMITS } from '$lib/config/back-settings.js';

export type ImageSlot = 'avatar' | 'banner';

/** Maximum dimensions by slot */
export const IMAGE_MAX_DIMENSIONS: Record<ImageSlot, { width: number; height: number }> = {
	avatar: { width: IMAGE_LIMITS.avatarMaxWidth, height: IMAGE_LIMITS.avatarMaxHeight },
	banner: { width: IMAGE_LIMITS.bannerMaxWidth, height: IMAGE_LIMITS.bannerMaxHeight }
};

/** Formats accepted on input (converted to WEBP) */
export const ACCEPTED_IMAGE_FORMATS = ['image/svg+xml', 'image/png', 'image/jpeg', 'image/gif', 'image/webp'] as const;
export type AcceptedImageFormat = (typeof ACCEPTED_IMAGE_FORMATS)[number];

export interface ImageAsset {
	/** WEBP binary data as base64 string */
	data: string;

	/** Actual width in pixels (after resize) */
	width: number;

	/** Actual height in pixels (after resize) */
	height: number;

	/** Original format before conversion */
	originalFormat: AcceptedImageFormat;

	/** Determines max dimensions applied */
	slot: ImageSlot;
}
