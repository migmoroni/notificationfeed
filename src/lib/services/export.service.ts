/**
 * Export Service — builds and downloads .notfeed.json files.
 *
 * Only exports from published snapshots. The page must be published first.
 * The exported file is identical to the publishedSnapshot stored on the page.
 */

import type { PageExport } from '$lib/domain/creator-page/page-export.js';
import { PAGE_EXPORT_EXTENSION, PAGE_EXPORT_MIME } from '$lib/domain/creator-page/page-export.js';
import { creator } from '$lib/stores/creator.svelte.js';

/**
 * Download a PageExport as a .notfeed.json file.
 */
export function downloadPageExport(pageExport: PageExport): void {
	const json = JSON.stringify(pageExport, null, 2);
	const blob = new Blob([json], { type: PAGE_EXPORT_MIME });
	const url = URL.createObjectURL(blob);

	const slug = pageExport.page.title
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/(^-|-$)/g, '');

	const filename = `${slug || 'page'}-v${pageExport.version}${PAGE_EXPORT_EXTENSION}`;

	const a = document.createElement('a');
	a.href = url;
	a.download = filename;
	document.body.appendChild(a);
	a.click();
	document.body.removeChild(a);
	URL.revokeObjectURL(url);
}

/**
 * Export a page: uses its published snapshot to trigger a download.
 * Throws if the page is not published.
 */
export async function exportPage(pageId: string): Promise<void> {
	const tree = creator.getPageTree(pageId);
	if (!tree) throw new Error(`CreatorPage not found: ${pageId}`);

	const { page } = tree;
	if (!page.publishedSnapshot) {
		throw new Error('A página precisa ser publicada antes de exportar.');
	}

	downloadPageExport(page.publishedSnapshot);
}
