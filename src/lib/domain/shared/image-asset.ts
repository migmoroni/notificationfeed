/**
 * ImageAsset — value object for stored images.
 *
 * All uploaded images are converted to WEBP before persistence.
 * The original format is not preserved in storage.
 */

export type ImageSlot = 'avatar' | 'banner';

/** Maximum dimensions by slot */
export const IMAGE_MAX_DIMENSIONS: Record<ImageSlot, { width: number; height: number }> = {
	avatar: { width: 512, height: 512 },
	banner: { width: 1600, height: 600 }
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
