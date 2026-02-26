/**
 * FeedMacro store — implements FeedMacroRepository using IndexedDB.
 */

import type { FeedMacro, FeedMacroRepository } from '$lib/domain/feed-macro/feed-macro.js';
import { getDatabase } from './db.js';

export function createFeedMacroStore(): FeedMacroRepository {
	return {
		async getAll(): Promise<FeedMacro[]> {
			const db = await getDatabase();
			return db.feedMacros.getAll<FeedMacro>();
		},

		async save(macro: FeedMacro): Promise<void> {
			const db = await getDatabase();
			await db.feedMacros.put(macro);
		},

		async delete(id: string): Promise<void> {
			const db = await getDatabase();
			await db.feedMacros.delete(id);
		}
	};
}
