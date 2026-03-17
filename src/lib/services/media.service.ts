/**
 * Media Service — higher-level orchestrator for ContentMedia creation.
 *
 * Wraps image.service.ts (low-level Canvas processing) and adds:
 *   - UUIDv7 ID generation
 *   - ContentMedia entity construction
 *   - IndexedDB persistence
 *
 * Browser-only (uses Canvas API via image.service.ts).
 */

import type { ContentMedia } from '$lib/domain/content-media/content-media.js';
import type { ImageSlot } from '$lib/domain/shared/image-asset.js';
import { processImage } from './image.service.js';
import { createContentMediaStore } from '$lib/persistence/content-media.store.js';
import { uuidv7 } from '$lib/domain/shared/uuidv7.js';

const mediaRepo = createContentMediaStore();

/**
 * Process an uploaded image file and persist it as a ContentMedia entity.
 */
export async function processAndCreateMedia(
	file: File,
	slot: ImageSlot,
	authorId?: string
): Promise<ContentMedia> {
	const asset = await processImage(file, slot);
	const now = new Date();

	const media: ContentMedia = {
		metadata: {
			id: uuidv7(),
			createdAt: now,
			updatedAt: now,
			author: authorId
		},
		mediaRef: `data:image/webp;base64,${asset.data}`,
		mimeType: 'image/webp',
		size: Math.ceil((asset.data.length * 3) / 4), // approximate base64 → bytes
		width: asset.width,
		height: asset.height
	};

	await mediaRepo.put(media);
	return media;
}

/**
 * Get a displayable URL for a ContentMedia entity.
 * For data URLs this is simply the mediaRef itself.
 */
export function getMediaPreviewUrl(media: ContentMedia): string {
	return media.mediaRef;
}

/**
 * Replace the file data of an existing ContentMedia entity.
 */
export async function replaceMediaFile(
	mediaId: string,
	file: File,
	slot: ImageSlot
): Promise<ContentMedia> {
	const existing = await mediaRepo.getById(mediaId);
	if (!existing) throw new Error(`ContentMedia not found: ${mediaId}`);

	const asset = await processImage(file, slot);

	const updated: ContentMedia = {
		...existing,
		metadata: { ...existing.metadata, updatedAt: new Date() },
		mediaRef: `data:image/webp;base64,${asset.data}`,
		mimeType: 'image/webp',
		size: Math.ceil((asset.data.length * 3) / 4),
		width: asset.width,
		height: asset.height
	};

	await mediaRepo.put(updated);
	return updated;
}

/**
 * Delete a ContentMedia entity from persistence.
 */
export async function deleteMedia(mediaId: string): Promise<void> {
	await mediaRepo.delete(mediaId);
}
