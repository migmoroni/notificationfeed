/**
 * ContentMedia store — persistence for content media using IndexedDB.
 */

import type { ContentMedia, ContentMediaRepository } from '$lib/domain/content-media/content-media.js';
import { getDatabase } from './db.js';

export function createContentMediaStore(): ContentMediaRepository {
	return {
		async getAll(): Promise<ContentMedia[]> {
			const db = await getDatabase();
			return db.contentMedias.getAll<ContentMedia>();
		},

		async getById(id: string): Promise<ContentMedia | null> {
			const db = await getDatabase();
			return db.contentMedias.getById<ContentMedia>(id);
		},

		async getByIds(ids: string[]): Promise<ContentMedia[]> {
			const db = await getDatabase();
			const results: ContentMedia[] = [];
			for (const id of ids) {
				const media = await db.contentMedias.getById<ContentMedia>(id);
				if (media) results.push(media);
			}
			return results;
		},

		async getByAuthor(authorId: string): Promise<ContentMedia[]> {
			const db = await getDatabase();
			return db.contentMedias.query<ContentMedia>('author', authorId);
		},

		async put(media: ContentMedia): Promise<void> {
			const db = await getDatabase();
			await db.contentMedias.put(media);
		},

		async delete(id: string): Promise<void> {
			const db = await getDatabase();
			await db.contentMedias.delete(id);
		}
	};
}
