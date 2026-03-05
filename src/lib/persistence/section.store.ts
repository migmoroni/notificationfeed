/**
 * Section store — implements SectionRepository using IndexedDB.
 *
 * Sections are stored grouped by containerId: one IndexedDB record
 * (SectionContainer) per container, holding all its sections.
 */

import type { SectionRepository, SectionContainer } from '$lib/domain/section/section.js';
import { getDatabase } from './db.js';

export function createSectionStore(): SectionRepository {
	return {
		async getAll(): Promise<SectionContainer[]> {
			const db = await getDatabase();
			return db.sections.getAll<SectionContainer>();
		},

		async getByContainer(containerId: string): Promise<SectionContainer | null> {
			const db = await getDatabase();
			return db.sections.getById<SectionContainer>(containerId);
		},

		async saveContainer(container: SectionContainer): Promise<void> {
			const db = await getDatabase();
			await db.sections.put(container);
		},

		async deleteContainer(containerId: string): Promise<void> {
			const db = await getDatabase();
			await db.sections.delete(containerId);
		}
	};
}
