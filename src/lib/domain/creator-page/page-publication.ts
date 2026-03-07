/**
 * PagePublication — the published snapshot of a CreatorPage.
 *
 * Stored separately from CreatorPage to avoid bloating the main record
 * with a potentially large PageExport blob. One record per page (latest only).
 */

import type { PageExport } from './page-export.js';

export interface PagePublication {
	/** References CreatorPage.id — one publication per page */
	pageId: string;

	/** Matches CreatorPage.publishedVersion */
	version: number;

	/** The immutable snapshot */
	snapshot: PageExport;

	/** When this version was published */
	publishedAt: Date;
}

/**
 * Contract for PagePublication persistence.
 */
export interface PagePublicationRepository {
	getByPageId(pageId: string): Promise<PagePublication | null>;
	save(publication: PagePublication): Promise<void>;
	delete(pageId: string): Promise<void>;
}
