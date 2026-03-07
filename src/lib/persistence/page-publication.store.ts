/**
 * PagePublication store — implements PagePublicationRepository using the local database.
 */

import type {
	PagePublicationRepository,
	PagePublication
} from '$lib/domain/creator-page/page-publication.js';
import { getDatabase } from './db.js';

export function createPagePublicationStore(): PagePublicationRepository {
	return {
		async getByPageId(pageId: string): Promise<PagePublication | null> {
			const db = await getDatabase();
			return db.pagePublications.getById<PagePublication>(pageId);
		},

		async save(publication: PagePublication): Promise<void> {
			const db = await getDatabase();
			await db.pagePublications.put(publication);
		},

		async delete(pageId: string): Promise<void> {
			const db = await getDatabase();
			await db.pagePublications.delete(pageId);
		}
	};
}
