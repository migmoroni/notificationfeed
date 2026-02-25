/**
 * Import Service — handles importing .notfeed.json files and simple URL lists.
 *
 * Consumers use this to:
 * 1. Import a PageExport (.notfeed.json) → creates CreatorPage + Profiles + Fonts locally
 * 2. Import simple URLs (RSS/Atom) → creates standalone Profiles + Fonts
 */

import type { PageExport } from '$lib/domain/creator-page/page-export.js';
import type { NewCreatorPage } from '$lib/domain/creator-page/creator-page.js';
import { createCreatorPageStore } from '$lib/persistence/creator-page.store.js';
import { createProfileStore } from '$lib/persistence/profile.store.js';
import { createFontStore } from '$lib/persistence/font.store.js';
import { getDatabase } from '$lib/persistence/db.js';

export interface ImportResult {
	success: boolean;
	message: string;
	creatorPageId?: string;
	profileIds?: string[];
	fontIds?: string[];
}

/**
 * Parse and validate a .notfeed.json file.
 */
export function parseNotfeedJson(text: string): PageExport | null {
	try {
		const data = JSON.parse(text);

		// Basic structural validation
		if (!data.exportId || !data.page || !Array.isArray(data.profiles)) {
			return null;
		}

		if (!data.page.title || typeof data.page.title !== 'string') {
			return null;
		}

		return data as PageExport;
	} catch {
		return null;
	}
}

/**
 * Import a PageExport into local IndexedDB.
 * Creates new IDs for all entities. Checks for duplicate exportId.
 */
export async function importNotfeedJson(pageExport: PageExport, consumerId: string): Promise<ImportResult> {
	const pageStore = createCreatorPageStore();
	const profileStore = createProfileStore();
	const fontStore = createFontStore();

	// Check for existing import with same exportId
	const existing = await pageStore.getByExportId(pageExport.exportId);
	if (existing) {
		return {
			success: false,
			message: `Esta página já foi importada anteriormente: "${existing.title}".`
		};
	}

	// Create CreatorPage
	const newPage: NewCreatorPage = {
		ownerId: consumerId,
		title: pageExport.page.title,
		bio: pageExport.page.bio ?? '',
		tags: pageExport.page.tags ?? [],
		avatar: pageExport.page.avatar ?? null,
		banner: pageExport.page.banner ?? null
	};

	const creatorPage = await pageStore.create(newPage);

	// Set exportId and syncStatus directly (not part of NewCreatorPage)
	await pageStore.setSyncStatus(creatorPage.id, 'imported');
	const db = await getDatabase();
	const stored = await db.creatorPages.getById<typeof creatorPage>(creatorPage.id);
	if (stored) {
		stored.exportId = pageExport.exportId;
		await db.creatorPages.put(stored);
	}

	const profileIds: string[] = [];
	const fontIds: string[] = [];

	// Create Profiles and their Fonts
	for (const profileSnapshot of pageExport.profiles) {
		const profile = await profileStore.create({
			ownerType: 'consumer',
			ownerId: consumerId,
			creatorPageId: creatorPage.id,
			title: profileSnapshot.title,
			tags: profileSnapshot.tags ?? [],
			avatar: profileSnapshot.avatar ?? null,
			categoryAssignments: profileSnapshot.categoryAssignments ?? [],
			defaultEnabled: profileSnapshot.defaultEnabled ?? true
		});

		profileIds.push(profile.id);

		for (const fontSnapshot of (profileSnapshot.fonts ?? [])) {
			const font = await fontStore.create({
				profileId: profile.id,
				title: fontSnapshot.title,
				tags: fontSnapshot.tags ?? [],
				avatar: fontSnapshot.avatar ?? null,
				protocol: fontSnapshot.protocol,
				config: fontSnapshot.config,
				defaultEnabled: fontSnapshot.defaultEnabled ?? true
			});

			fontIds.push(font.id);
		}
	}

	return {
		success: true,
		message: `Importado: "${pageExport.page.title}" com ${profileIds.length} profile(s) e ${fontIds.length} font(s).`,
		creatorPageId: creatorPage.id,
		profileIds,
		fontIds
	};
}

/**
 * Auto-detect protocol from a URL.
 */
function detectProtocol(url: string): 'rss' | 'atom' | null {
	const lower = url.toLowerCase().trim();
	if (lower.includes('atom')) return 'atom';
	if (lower.endsWith('.xml') || lower.endsWith('/feed') || lower.includes('rss') || lower.includes('feed')) return 'rss';
	// Default to RSS for generic URLs
	if (lower.startsWith('http://') || lower.startsWith('https://')) return 'rss';
	return null;
}

/**
 * Import a list of URLs as standalone Profiles + Fonts.
 * Each URL becomes a Font under a new standalone Profile.
 */
export async function importSimpleUrls(urls: string[], consumerId: string): Promise<ImportResult> {
	const profileStore = createProfileStore();
	const fontStore = createFontStore();

	const validUrls = urls
		.map(u => u.trim())
		.filter(u => u && (u.startsWith('http://') || u.startsWith('https://')));

	if (validUrls.length === 0) {
		return {
			success: false,
			message: 'Nenhuma URL válida encontrada. URLs devem começar com http:// ou https://.'
		};
	}

	const profileIds: string[] = [];
	const fontIds: string[] = [];

	// Create one profile per URL for simplicity
	const profile = await profileStore.create({
		ownerType: 'consumer',
		ownerId: consumerId,
		creatorPageId: null,
		title: `Import (${new Date().toLocaleDateString('pt-BR')})`,
		tags: ['importado'],
		avatar: null,
		categoryAssignments: [],
		defaultEnabled: true
	});

	profileIds.push(profile.id);

	for (const url of validUrls) {
		const protocol = detectProtocol(url) ?? 'rss';

		// Extract a title from the URL
		let title: string;
		try {
			const parsed = new URL(url);
			title = parsed.hostname.replace('www.', '');
		} catch {
			title = url.slice(0, 50);
		}

		const font = await fontStore.create({
			profileId: profile.id,
			title,
			tags: [],
			avatar: null,
			protocol,
			config: { url },
			defaultEnabled: true
		});

		fontIds.push(font.id);
	}

	return {
		success: true,
		message: `Importadas ${fontIds.length} font(s) em um novo profile.`,
		profileIds,
		fontIds
	};
}
