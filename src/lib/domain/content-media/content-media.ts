/**
 * ContentMedia — external media referenced by content nodes.
 *
 * Media is stored separately and referenced by ID.
 * Nodes never embed media directly — they only hold a mediaId reference.
 *
 * mediaRef holds the actual data representation:
 *   - base64 data URL for locally stored media
 *   - blob URL for runtime-created media
 *   - external URL for future distributed scenarios
 */

export interface ContentMediaMetadata {
	id: string;
	createdAt: Date;
	updatedAt: Date;
	/** ID of the creator user (if known) */
	author?: string;
}

export interface ContentMedia {
	metadata: ContentMediaMetadata;

	/** Reference to the media data (base64 data URL, blob URL, or external URL) */
	mediaRef: string;

	/** MIME type (e.g., 'image/webp', 'video/mp4') */
	mimeType: string;

	/** File size in bytes (if known) */
	size?: number;

	/** Alt text for accessibility */
	alt?: string;

	/** Original dimensions for images/video */
	width?: number;
	height?: number;
}

export type NewContentMedia = Omit<ContentMedia, 'metadata'> & {
	alt?: string;
};

export interface ContentMediaRepository {
	getAll(): Promise<ContentMedia[]>;
	getById(id: string): Promise<ContentMedia | null>;
	getByIds(ids: string[]): Promise<ContentMedia[]>;
	getByAuthor(authorId: string): Promise<ContentMedia[]>;
	put(media: ContentMedia): Promise<void>;
	delete(id: string): Promise<void>;
}
