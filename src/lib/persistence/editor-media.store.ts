/**
 * Editor Media store — persistence for media assets created/edited by the creator.
 *
 * Separate from contentMedias (consumer/read) so editing assets don't
 * interfere with the consumption pipeline.
 */

import type { ContentMedia, ContentMediaRepository } from '$lib/domain/content-media/content-media.js';
import { getDatabase } from './db.js';

export function createEditorMediaStore(): ContentMediaRepository {
	return {
		async getAll(): Promise<ContentMedia[]> {
			const db = await getDatabase();
			return db.editorMedias.getAll<ContentMedia>();
		},

		async getById(id: string): Promise<ContentMedia | null> {
			const db = await getDatabase();
			return db.editorMedias.getById<ContentMedia>(id);
		},

		async getByIds(ids: string[]): Promise<ContentMedia[]> {
			const db = await getDatabase();
			const results: ContentMedia[] = [];
			for (const id of ids) {
				const media = await db.editorMedias.getById<ContentMedia>(id);
				if (media) results.push(media);
			}
			return results;
		},

		async getByAuthor(authorId: string): Promise<ContentMedia[]> {
			const db = await getDatabase();
			return db.editorMedias.query<ContentMedia>('author', authorId);
		},

		async put(media: ContentMedia): Promise<void> {
			const db = await getDatabase();
			await db.editorMedias.put(media);
		},

		async delete(id: string): Promise<void> {
			const db = await getDatabase();
			await db.editorMedias.delete(id);
		}
	};
}
