import { feedCategories } from './feed-categories.svelte.js';
import { feedEntityFilter } from './feed-entity-filter.svelte.js';
import { createFeedMacroStore } from '$lib/persistence/feed-macro.store.js';
import type { FeedMacro } from '$lib/domain/feed-macro/feed-macro.js';

export type { FeedMacro } from '$lib/domain/feed-macro/feed-macro.js';

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
