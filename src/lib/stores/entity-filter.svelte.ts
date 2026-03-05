/**
 * Entity Filter Factory — creates independent EntityFilterStore instances.
 *
 * Each call returns a store with its own selection state ($state).
 * The data source (how pages/profiles/fonts are loaded) is injected,
 * so the same code powers both Feed and Browse filters.
 *
 * Feed passes: profiles/fonts from the feed store, pages from IndexedDB.
 * Browse passes: all entities from IndexedDB.
 */

import type { CreatorPage } from '$lib/domain/creator-page/creator-page.js';
import type { Profile } from '$lib/domain/profile/profile.js';
import type { Font } from '$lib/domain/font/font.js';
import type { Section, SectionContainerType, SectionContainer } from '$lib/domain/section/section.js';
import type { EntityFilterStore } from './entity-filter.types.js';

export interface EntityFilterDataSource {
	/** Load all data needed for this filter. Called on mount. */
	load(): Promise<{ pages: CreatorPage[]; profiles: Profile[]; fonts: Font[]; sectionContainers?: SectionContainer[] }>;
	/** Return currently active profiles (profiles that have fonts). */
	getProfiles(): Profile[];
	/** Return currently active fonts. */
	getFonts(): Font[];
}

export function createEntityFilter(source: EntityFilterDataSource): EntityFilterStore {
	let selectedPageIds = $state<Set<string>>(new Set());
	let selectedProfileIds = $state<Set<string>>(new Set());
	let selectedFontIds = $state<Set<string>>(new Set());
	let pages = $state<CreatorPage[]>([]);
	let sectionContainers = $state<SectionContainer[]>([]);

	function getActiveProfiles(): Profile[] {
		const fontProfileIds = new Set(source.getFonts().map((f) => f.profileId));
		return source.getProfiles().filter((p) => fontProfileIds.has(p.id));
	}

	function getActiveFonts(): Font[] {
		return source.getFonts();
	}

	return {
		get selectedPageIds() { return selectedPageIds; },
		get selectedProfileIds() { return selectedProfileIds; },
		get selectedFontIds() { return selectedFontIds; },

		get hasFilters(): boolean {
			return selectedPageIds.size > 0 || selectedProfileIds.size > 0 || selectedFontIds.size > 0;
		},

		async loadPages(): Promise<void> {
			const data = await source.load();
			pages = data.pages;
			sectionContainers = data.sectionContainers ?? [];
		},

		getPages(): { id: string; title: string; avatarData: string | null; profileCount: number }[] {
			const profiles = getActiveProfiles();
			const pageProfileCount = new Map<string, number>();

			for (const profile of profiles) {
				if (!profile.creatorPageId) continue;
				pageProfileCount.set(
					profile.creatorPageId,
					(pageProfileCount.get(profile.creatorPageId) ?? 0) + 1
				);
			}

			const pageMap = new Map(pages.map((p) => [p.id, p]));
			const results: { id: string; title: string; avatarData: string | null; profileCount: number }[] = [];

			for (const [pageId, count] of pageProfileCount) {
				const page = pageMap.get(pageId);
				results.push({
					id: pageId,
					title: page?.title ?? `Page ${pageId.slice(-4)}`,
					avatarData: page?.avatar?.data ?? null,
					profileCount: count
				});
			}
			return results.sort((a, b) => a.title.localeCompare(b.title));
		},

		getProfiles(pageId?: string): Profile[] {
			const profiles = getActiveProfiles();
			if (pageId) {
				return profiles
					.filter((p) => p.creatorPageId === pageId)
					.sort((a, b) => a.title.localeCompare(b.title));
			}
			return profiles.sort((a, b) => a.title.localeCompare(b.title));
		},

		getFonts(profileId: string): Font[] {
			return getActiveFonts()
				.filter((f) => f.profileId === profileId)
				.sort((a, b) => a.title.localeCompare(b.title));
		},

		getStandaloneProfiles(): Profile[] {
			return getActiveProfiles()
				.filter((p) => !p.creatorPageId)
				.sort((a, b) => a.title.localeCompare(b.title));
		},

		getSections(containerType: SectionContainerType, containerId: string): Section[] {
			const container = sectionContainers.find((c) => c.containerId === containerId);
			if (!container) return [];
			return [...container.sections].sort((a, b) => a.order - b.order);
		},

		// ── Selection ────────────────────────────────────────────────────

		isPageSelected(pageId: string): boolean {
			return selectedPageIds.has(pageId);
		},

		isProfileSelected(profileId: string): boolean {
			return selectedProfileIds.has(profileId);
		},

		isFontSelected(fontId: string): boolean {
			return selectedFontIds.has(fontId);
		},

		togglePage(pageId: string): void {
			const next = new Set(selectedPageIds);
			if (next.has(pageId)) {
				next.delete(pageId);
				const childProfiles = getActiveProfiles().filter((p) => p.creatorPageId === pageId);
				const nextProfiles = new Set(selectedProfileIds);
				const nextFonts = new Set(selectedFontIds);
				for (const p of childProfiles) {
					nextProfiles.delete(p.id);
					for (const f of getActiveFonts().filter((f) => f.profileId === p.id)) {
						nextFonts.delete(f.id);
					}
				}
				selectedProfileIds = nextProfiles;
				selectedFontIds = nextFonts;
			} else {
				next.add(pageId);
			}
			selectedPageIds = next;
		},

		toggleProfile(profileId: string): void {
			const next = new Set(selectedProfileIds);
			if (next.has(profileId)) {
				next.delete(profileId);
				const nextFonts = new Set(selectedFontIds);
				for (const f of getActiveFonts().filter((f) => f.profileId === profileId)) {
					nextFonts.delete(f.id);
				}
				selectedFontIds = nextFonts;
			} else {
				next.add(profileId);
			}
			selectedProfileIds = next;
		},

		toggleFont(fontId: string): void {
			const next = new Set(selectedFontIds);
			if (next.has(fontId)) {
				next.delete(fontId);
			} else {
				next.add(fontId);
			}
			selectedFontIds = next;
		},

		clearAll(): void {
			selectedPageIds = new Set();
			selectedProfileIds = new Set();
			selectedFontIds = new Set();
		},

		get totalSelected(): number {
			return selectedPageIds.size + selectedProfileIds.size + selectedFontIds.size;
		},

		getAllowedFontIds(): Set<string> {
			if (!this.hasFilters) return new Set();

			const allowed = new Set<string>();
			const allFonts = getActiveFonts();
			const allProfiles = getActiveProfiles();

			const fontsForProfile = (profileId: string): string[] => {
				const pFonts = allFonts.filter((f) => f.profileId === profileId);
				const selected = pFonts.filter((f) => selectedFontIds.has(f.id));
				return selected.length > 0 ? selected.map((f) => f.id) : pFonts.map((f) => f.id);
			};

			for (const pageId of selectedPageIds) {
				const pageProfiles = allProfiles.filter((p) => p.creatorPageId === pageId);
				const selectedInPage = pageProfiles.filter((p) => selectedProfileIds.has(p.id));
				const profilesToUse = selectedInPage.length > 0 ? selectedInPage : pageProfiles;
				for (const p of profilesToUse) {
					for (const fid of fontsForProfile(p.id)) allowed.add(fid);
				}
			}

			for (const profileId of selectedProfileIds) {
				const profile = allProfiles.find((p) => p.id === profileId);
				if (profile?.creatorPageId && selectedPageIds.has(profile.creatorPageId)) continue;
				for (const fid of fontsForProfile(profileId)) allowed.add(fid);
			}

			for (const fontId of selectedFontIds) {
				const font = allFonts.find((f) => f.id === fontId);
				if (!font) continue;
				const profile = allProfiles.find((p) => p.id === font.profileId);
				if (profile && selectedProfileIds.has(profile.id)) continue;
				if (profile?.creatorPageId && selectedPageIds.has(profile.creatorPageId)) continue;
				allowed.add(fontId);
			}

			return allowed;
		}
	};
}
