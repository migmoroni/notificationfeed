import { feedCategories } from './feed-categories.svelte.js';
import { feedEntityFilter } from './feed-entity-filter.svelte.js';
import { createFeedMacroStore } from '$lib/persistence/feed-macro.store.js';
import type { FeedMacro } from '$lib/domain/feed-macro/feed-macro.js';

export type { FeedMacro } from '$lib/domain/feed-macro/feed-macro.js';

/** Sentinel ID used when "all macros combined" is active */
export const ALL_MACROS_ID = '__all__';

const repo = createFeedMacroStore();

let macros = $state<FeedMacro[]>([]);
let activeMacroId = $state<string | null>(null);

async function loadFromDB(): Promise<void> {
	macros = await repo.getAll();
}

async function saveToDB(macro: FeedMacro): Promise<void> {
	await repo.save(macro);
}

async function deleteFromDB(id: string): Promise<void> {
	await repo.delete(id);
}

export const feedMacros = {
	get macros() {
		return macros;
	},
	get activeMacroId() {
		return activeMacroId;
	},

	async init(): Promise<void> {
		await loadFromDB();
	},

	async saveCurrentAsMacro(name: string): Promise<void> {
		const newMacro: FeedMacro = {
			id: crypto.randomUUID(),
			name,
			filters: {
				pageIds: Array.from(feedEntityFilter.selectedPageIds),
				profileIds: Array.from(feedEntityFilter.selectedProfileIds),
				fontIds: Array.from(feedEntityFilter.selectedFontIds),
				subjectIds: feedCategories.getSelectedIds('subject'),
				contentTypeIds: feedCategories.getSelectedIds('content_type'),
				regionIds: feedCategories.getSelectedIds('region')
			}
		};
		await saveToDB(newMacro);
		macros = [...macros, newMacro];
		activeMacroId = newMacro.id;
	},

	applyMacro(id: string | null) {
		activeMacroId = id;

		if (!id) {
			feedEntityFilter.clearAll();
			feedCategories.clearAll();
			return;
		}

		if (id === ALL_MACROS_ID) {
			// Union of all saved macros' filters
			const allPageIds = new Set<string>();
			const allProfileIds = new Set<string>();
			const allFontIds = new Set<string>();
			const allSubjectIds = new Set<string>();
			const allContentTypeIds = new Set<string>();
			const allRegionIds = new Set<string>();

			for (const m of macros) {
				for (const v of m.filters.pageIds) allPageIds.add(v);
				for (const v of m.filters.profileIds) allProfileIds.add(v);
				for (const v of m.filters.fontIds) allFontIds.add(v);
				for (const v of m.filters.subjectIds) allSubjectIds.add(v);
				for (const v of m.filters.contentTypeIds) allContentTypeIds.add(v);
				for (const v of m.filters.regionIds) allRegionIds.add(v);
			}

			feedEntityFilter.clearAll();
			for (const v of allPageIds) feedEntityFilter.togglePage(v);
			for (const v of allProfileIds) feedEntityFilter.toggleProfile(v);
			for (const v of allFontIds) feedEntityFilter.toggleFont(v);

			feedCategories.clearAll();
			for (const v of allSubjectIds) feedCategories.toggleCategory(v, 'subject');
			for (const v of allContentTypeIds) feedCategories.toggleCategory(v, 'content_type');
			for (const v of allRegionIds) feedCategories.toggleCategory(v, 'region');
			return;
		}

		const macro = macros.find((m) => m.id === id);
		if (!macro) return;

		feedEntityFilter.clearAll();
		for (const pageId of macro.filters.pageIds) feedEntityFilter.togglePage(pageId);
		for (const profileId of macro.filters.profileIds) feedEntityFilter.toggleProfile(profileId);
		for (const fontId of macro.filters.fontIds) feedEntityFilter.toggleFont(fontId);

		feedCategories.clearAll();
		for (const catId of macro.filters.subjectIds) feedCategories.toggleCategory(catId, 'subject');
		for (const catId of macro.filters.contentTypeIds) feedCategories.toggleCategory(catId, 'content_type');
		for (const catId of macro.filters.regionIds) feedCategories.toggleCategory(catId, 'region');
	},

	async deleteMacro(id: string): Promise<void> {
		await deleteFromDB(id);
		macros = macros.filter((m) => m.id !== id);
		if (activeMacroId === id) {
			activeMacroId = null;
		}
	},

	async updateMacro(id: string): Promise<void> {
		const macro = macros.find((m) => m.id === id);
		if (!macro) return;
		const updated: FeedMacro = {
			...macro,
			filters: {
				pageIds: Array.from(feedEntityFilter.selectedPageIds),
				profileIds: Array.from(feedEntityFilter.selectedProfileIds),
				fontIds: Array.from(feedEntityFilter.selectedFontIds),
				subjectIds: feedCategories.getSelectedIds('subject'),
				contentTypeIds: feedCategories.getSelectedIds('content_type'),
				regionIds: feedCategories.getSelectedIds('region')
			}
		};
		await saveToDB(updated);
		macros = macros.map((m) => (m.id === id ? updated : m));
		activeMacroId = id;
	},

	get isCurrentStateSaved(): boolean {
		const currentFilters = {
			pageIds: Array.from(feedEntityFilter.selectedPageIds).sort(),
			profileIds: Array.from(feedEntityFilter.selectedProfileIds).sort(),
			fontIds: Array.from(feedEntityFilter.selectedFontIds).sort(),
			subjectIds: feedCategories.getSelectedIds('subject').sort(),
			contentTypeIds: feedCategories.getSelectedIds('content_type').sort(),
			regionIds: feedCategories.getSelectedIds('region').sort()
		};

		const hasAnyFilter =
			currentFilters.pageIds.length > 0 ||
			currentFilters.profileIds.length > 0 ||
			currentFilters.fontIds.length > 0 ||
			currentFilters.subjectIds.length > 0 ||
			currentFilters.contentTypeIds.length > 0 ||
			currentFilters.regionIds.length > 0;

		if (!activeMacroId) {
			return !hasAnyFilter;
		}

		// "All macros combined" is always considered "saved"
		if (activeMacroId === ALL_MACROS_ID) {
			return true;
		}

		const macro = macros.find((m) => m.id === activeMacroId);
		if (!macro) return false;

		const mFilters = {
			pageIds: [...macro.filters.pageIds].sort(),
			profileIds: [...macro.filters.profileIds].sort(),
			fontIds: [...macro.filters.fontIds].sort(),
			subjectIds: [...macro.filters.subjectIds].sort(),
			contentTypeIds: [...macro.filters.contentTypeIds].sort(),
			regionIds: [...macro.filters.regionIds].sort()
		};

		return JSON.stringify(currentFilters) === JSON.stringify(mFilters);
	},

	clearActiveMacroIfChanged() {
		if (activeMacroId && !this.isCurrentStateSaved) {
			activeMacroId = null;
		}
	}
};
