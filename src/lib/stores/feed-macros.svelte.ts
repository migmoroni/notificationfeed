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
import { activityService } from '$lib/services/activity.service.js';
import type { FeedMacro } from '$lib/domain/feed-macro/feed-macro.js';
import type { CategoryTreeId } from '$lib/domain/category/category.js';
import type { CategoryFilterMode } from '$lib/stores/category-tree.types.js';

const TREE_IDS: CategoryTreeId[] = ['subject', 'content', 'media', 'region', 'language'];

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

	const categoryModesByTree = Object.fromEntries(
		TREE_IDS.map((t) => {
			const modes: Record<string, CategoryFilterMode> = {};
			for (const id of feedCategories.getSelectedIds(t)) {
				const m = feedCategories.getFilterMode(id, t);
				if (m) modes[id] = m;
			}
			return [t, modes];
		})
	) as Record<CategoryTreeId, Record<string, CategoryFilterMode>>;

	const priorityByNodeId: Record<string, 'high'> = { ...feedEntityFilter.priorityByNodeId };

	return { nodeIds: currentNodeIds(), categoryIdsByTree, categoryModesByTree, priorityByNodeId };
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

		void activityService.record({
			type: 'open',
			targetType: 'feedmacro',
			targetId: id,
			context: 'feed'
		});

		if (id === ALL_MACROS_ID) {
			const allNodeIds = new Set<string>();
			const allCatModes: Record<CategoryTreeId, Map<string, CategoryFilterMode>> = Object.fromEntries(
				TREE_IDS.map((t) => [t, new Map<string, CategoryFilterMode>()])
			) as Record<CategoryTreeId, Map<string, CategoryFilterMode>>;
			const allPriorities: Record<string, 'high'> = {};

			for (const m of consumer.feedMacros) {
				for (const v of m.filters.nodeIds) allNodeIds.add(v);
				for (const t of TREE_IDS) {
					for (const v of m.filters.categoryIdsByTree[t]) {
						const mode = m.filters.categoryModesByTree?.[t]?.[v] ?? 'any';
						allCatModes[t].set(v, mode);
					}
				}
				if (m.filters.priorityByNodeId) {
					for (const [nid, p] of Object.entries(m.filters.priorityByNodeId)) {
						allPriorities[nid] = p;
					}
				}
			}

			feedEntityFilter.clearAll();
			applyNodeIds(allNodeIds);
			feedEntityFilter.setPriorityByNodeId(allPriorities);

			feedCategories.clearAll();
			for (const t of TREE_IDS) {
				for (const [v, mode] of allCatModes[t]) feedCategories.selectCategory(v, t, mode);
			}
			return;
		}

		const macro = consumer.feedMacros.find((m) => m.id === id);
		if (!macro) return;

		feedEntityFilter.clearAll();
		applyNodeIds(new Set(macro.filters.nodeIds));
		feedEntityFilter.setPriorityByNodeId(macro.filters.priorityByNodeId ?? {});

		feedCategories.clearAll();
		for (const t of TREE_IDS) {
			for (const catId of macro.filters.categoryIdsByTree[t]) {
				const mode = macro.filters.categoryModesByTree?.[t]?.[catId] ?? 'any';
				feedCategories.selectCategory(catId, t, mode);
			}
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
		const currentModes = Object.fromEntries(
			TREE_IDS.map((t) => {
				const modes: Record<string, CategoryFilterMode> = {};
				for (const id of feedCategories.getSelectedIds(t)) {
					const m = feedCategories.getFilterMode(id, t);
					if (m) modes[id] = m;
				}
				return [t, modes];
			})
		);
		const currentPriorities = sortRecord(feedEntityFilter.priorityByNodeId);

		const hasAnyFilter =
			currentNodesSorted.length > 0 ||
			TREE_IDS.some((t) => currentCats[t].length > 0) ||
			Object.keys(currentPriorities).length > 0;

		if (!activeMacroId) return !hasAnyFilter;
		if (activeMacroId === ALL_MACROS_ID) return true;

		const macro = consumer.feedMacros.find((m) => m.id === activeMacroId);
		if (!macro) return false;

		const macroCats = Object.fromEntries(
			TREE_IDS.map((t) => [t, [...macro.filters.categoryIdsByTree[t]].sort()])
		);
		const macroModes = Object.fromEntries(
			TREE_IDS.map((t) => [t, macro.filters.categoryModesByTree?.[t] ?? {}])
		);
		const macroPriorities = sortRecord(macro.filters.priorityByNodeId ?? {});

		return (
			JSON.stringify(currentNodesSorted) === JSON.stringify([...macro.filters.nodeIds].sort()) &&
			JSON.stringify(currentCats) === JSON.stringify(macroCats) &&
			JSON.stringify(currentModes) === JSON.stringify(macroModes) &&
			JSON.stringify(currentPriorities) === JSON.stringify(macroPriorities)
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

/** Returns a new record with keys sorted alphabetically (for stable JSON compare). */
function sortRecord<V>(rec: Record<string, V>): Record<string, V> {
	const out: Record<string, V> = {};
	for (const k of Object.keys(rec).sort()) out[k] = rec[k];
	return out;
}

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
