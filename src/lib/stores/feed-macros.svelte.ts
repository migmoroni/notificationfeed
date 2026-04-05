/**
 * Feed Macros Store — saved filter presets for the feed.
 *
 * Uses nodeIds instead of separate pageIds/profileIds/fontIds.
 * Integrates with feedEntityFilter (toggleCreator/toggleProfile/toggleFont).
 */

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

/** Collect all currently selected node IDs from the entity filter (pages + fonts). */
function currentNodeIds(): string[] {
	return [
		...feedEntityFilter.selectedPageIds,
		...feedEntityFilter.selectedFontIds
	];
}

export const feedMacros = {
	get macros() { return macros; },
	get activeMacroId() { return activeMacroId; },

	async init(): Promise<void> {
		await loadFromDB();
	},

	async saveCurrentAsMacro(name: string): Promise<void> {
		const newMacro: FeedMacro = {
			id: crypto.randomUUID(),
			name,
			filters: {
				nodeIds: currentNodeIds(),
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
			const allNodeIds = new Set<string>();
			const allSubjectIds = new Set<string>();
			const allContentTypeIds = new Set<string>();
			const allRegionIds = new Set<string>();

			for (const m of macros) {
				for (const v of m.filters.nodeIds) allNodeIds.add(v);
				for (const v of m.filters.subjectIds) allSubjectIds.add(v);
				for (const v of m.filters.contentTypeIds) allContentTypeIds.add(v);
				for (const v of m.filters.regionIds) allRegionIds.add(v);
			}

			feedEntityFilter.clearAll();
			applyNodeIds(allNodeIds);

			feedCategories.clearAll();
			for (const v of allSubjectIds) feedCategories.toggleCategory(v, 'subject');
			for (const v of allContentTypeIds) feedCategories.toggleCategory(v, 'content_type');
			for (const v of allRegionIds) feedCategories.toggleCategory(v, 'region');
			return;
		}

		const macro = macros.find((m) => m.id === id);
		if (!macro) return;

		feedEntityFilter.clearAll();
		applyNodeIds(new Set(macro.filters.nodeIds));

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
				nodeIds: currentNodeIds(),
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
			nodeIds: currentNodeIds().sort(),
			subjectIds: feedCategories.getSelectedIds('subject').sort(),
			contentTypeIds: feedCategories.getSelectedIds('content_type').sort(),
			regionIds: feedCategories.getSelectedIds('region').sort()
		};

		const hasAnyFilter =
			currentFilters.nodeIds.length > 0 ||
			currentFilters.subjectIds.length > 0 ||
			currentFilters.contentTypeIds.length > 0 ||
			currentFilters.regionIds.length > 0;

		if (!activeMacroId) return !hasAnyFilter;
		if (activeMacroId === ALL_MACROS_ID) return true;

		const macro = macros.find((m) => m.id === activeMacroId);
		if (!macro) return false;

		const mFilters = {
			nodeIds: [...macro.filters.nodeIds].sort(),
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

// ── Helpers ────────────────────────────────────────────────────────────

/**
 * Apply a set of saved nodeIds to the entity filter by detecting each node's
 * role via the filter's view methods and toggling accordingly.
 */
function applyNodeIds(nodeIds: Set<string>): void {
	const pageIdSet = new Set(feedEntityFilter.getPages().map((p) => p.id));

	for (const nid of nodeIds) {
		if (pageIdSet.has(nid)) {
			feedEntityFilter.togglePage(nid);
		} else {
			// Must be a font
			feedEntityFilter.toggleFont(nid);
		}
	}
}
