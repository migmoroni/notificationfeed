/**
 * Feed Macros Store — saved filter presets for the feed.
 *
 * Uses nodeIds instead of separate pageIds/profileIds/fontIds.
 * Integrates with feedEntityFilter (toggleCreator/toggleProfile/toggleFont).
 *
 * Persistence is delegated to the consumer store (macros are embedded in UserConsumer).
 */

import { feedCategories } from './feed-categories.svelte.js';
import { feedEntityFilter } from './feed-entity-filter.svelte.js';
import { consumer } from './consumer.svelte.js';
import type { FeedMacro } from '$lib/domain/feed-macro/feed-macro.js';
import type { CategoryTreeId } from '$lib/domain/category/category.js';

const TREE_IDS: CategoryTreeId[] = ['subject', 'content_type', 'media_type', 'region'];

export type { FeedMacro } from '$lib/domain/feed-macro/feed-macro.js';

/** Sentinel ID used when "all macros combined" is active */
export const ALL_MACROS_ID = '__all__';

let activeMacroId = $state<string | null>(null);

/** Collect all currently selected node IDs from the entity filter (pages + fonts). */
function currentNodeIds(): string[] {
	return [
		...feedEntityFilter.selectedPageIds,
		...feedEntityFilter.selectedFontIds
	];
}

function currentFilters() {
	const categoryIdsByTree = Object.fromEntries(
		TREE_IDS.map((t) => [t, feedCategories.getSelectedIds(t)])
	) as Record<CategoryTreeId, string[]>;

	return { nodeIds: currentNodeIds(), categoryIdsByTree };
}

export const feedMacros = {
	get macros() { return consumer.feedMacros; },
	get activeMacroId() { return activeMacroId; },

	async saveCurrentAsMacro(name: string): Promise<void> {
		const created = await consumer.createMacro({ name, filters: currentFilters() });
		activeMacroId = created.id;
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
			const allCatIds: Record<CategoryTreeId, Set<string>> = Object.fromEntries(
				TREE_IDS.map((t) => [t, new Set<string>()])
			) as Record<CategoryTreeId, Set<string>>;

			for (const m of consumer.feedMacros) {
				for (const v of m.filters.nodeIds) allNodeIds.add(v);
				for (const t of TREE_IDS) {
					for (const v of m.filters.categoryIdsByTree[t]) allCatIds[t].add(v);
				}
			}

			feedEntityFilter.clearAll();
			applyNodeIds(allNodeIds);

			feedCategories.clearAll();
			for (const t of TREE_IDS) {
				for (const v of allCatIds[t]) feedCategories.toggleCategory(v, t);
			}
			return;
		}

		const macro = consumer.feedMacros.find((m) => m.id === id);
		if (!macro) return;

		feedEntityFilter.clearAll();
		applyNodeIds(new Set(macro.filters.nodeIds));

		feedCategories.clearAll();
		for (const t of TREE_IDS) {
			for (const catId of macro.filters.categoryIdsByTree[t]) feedCategories.toggleCategory(catId, t);
		}
	},

	async deleteMacro(id: string): Promise<void> {
		await consumer.deleteMacro(id);
		if (activeMacroId === id) {
			activeMacroId = null;
		}
	},

	async updateMacro(id: string): Promise<void> {
		const macro = consumer.feedMacros.find((m) => m.id === id);
		if (!macro) return;

		await consumer.updateMacro(id, currentFilters());
		activeMacroId = id;
	},

	get isCurrentStateSaved(): boolean {
		const currentNodesSorted = currentNodeIds().sort();
		const currentCats = Object.fromEntries(
			TREE_IDS.map((t) => [t, feedCategories.getSelectedIds(t).sort()])
		);

		const hasAnyFilter =
			currentNodesSorted.length > 0 ||
			TREE_IDS.some((t) => currentCats[t].length > 0);

		if (!activeMacroId) return !hasAnyFilter;
		if (activeMacroId === ALL_MACROS_ID) return true;

		const macro = consumer.feedMacros.find((m) => m.id === activeMacroId);
		if (!macro) return false;

		const macroCats = Object.fromEntries(
			TREE_IDS.map((t) => [t, [...macro.filters.categoryIdsByTree[t]].sort()])
		);

		return (
			JSON.stringify(currentNodesSorted) === JSON.stringify([...macro.filters.nodeIds].sort()) &&
			JSON.stringify(currentCats) === JSON.stringify(macroCats)
		);
	},

	clearActiveMacroIfChanged() {
		if (activeMacroId && !this.isCurrentStateSaved) {
			activeMacroId = null;
		}
	},

	/** Reset local UI state (e.g. on user switch). */
	reset() {
		activeMacroId = null;
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
