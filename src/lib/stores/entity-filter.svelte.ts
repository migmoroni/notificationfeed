/**
 * Entity Filter Factory — creates independent EntityFilterStore instances.
 *
 * Each call returns a store with its own selection state ($state).
 * The data source (how pages/profiles/fonts are loaded) is injected,
 * so the same code powers Feed, Browse and Preview filters.
 *
 * Relationships are resolved through N:N junction tables:
 *   CreatorPage ←→ Profile  (via CreatorProfile)
 *   Profile     ←→ Font     (via ProfileFont)
 */

import type { CreatorPage } from '$lib/domain/creator-page/creator-page.js';
import type { Profile } from '$lib/domain/profile/profile.js';
import type { Font } from '$lib/domain/font/font.js';
import type { CreatorProfile } from '$lib/domain/creator-profile/creator-profile.js';
import type { ProfileFont } from '$lib/domain/profile-font/profile-font.js';
import type { Section, SectionContainerType, SectionContainer } from '$lib/domain/section/section.js';
import type { EntityFilterStore } from './entity-filter.types.js';

export interface EntityFilterDataSource {
	/** Load all data needed for this filter. Called on mount. */
	load(): Promise<{
		pages: CreatorPage[];
		profiles: Profile[];
		fonts: Font[];
		creatorProfiles: CreatorProfile[];
		profileFonts: ProfileFont[];
		sectionContainers?: SectionContainer[];
	}>;
	/** Return currently active profiles. */
	getProfiles(): Profile[];
	/** Return currently active fonts. */
	getFonts(): Font[];
	/** Return creator-profile junctions. */
	getCreatorProfiles(): CreatorProfile[];
	/** Return profile-font junctions. */
	getProfileFonts(): ProfileFont[];
}

export function createEntityFilter(source: EntityFilterDataSource): EntityFilterStore {
	let selectedPageIds = $state<Set<string>>(new Set());
	let selectedProfileIds = $state<Set<string>>(new Set());
	let selectedFontIds = $state<Set<string>>(new Set());
	let pages = $state<CreatorPage[]>([]);
	let sectionContainers = $state<SectionContainer[]>([]);

	// ── Junction helpers ─────────────────────────────────────────────

	/** Profile IDs linked to a given page via creatorProfiles junction. */
	function profileIdsForPage(pageId: string): Set<string> {
		const ids = new Set<string>();
		for (const cp of source.getCreatorProfiles()) {
			if (cp.creatorPageId === pageId) ids.add(cp.profileId);
		}
		return ids;
	}

	/** Font IDs linked to a given profile via profileFonts junction. */
	function fontIdsForProfile(profileId: string): Set<string> {
		const ids = new Set<string>();
		for (const pf of source.getProfileFonts()) {
			if (pf.profileId === profileId) ids.add(pf.fontId);
		}
		return ids;
	}

	/** Page IDs that own a given profile via creatorProfiles junction. */
	function pageIdsForProfile(profileId: string): Set<string> {
		const ids = new Set<string>();
		for (const cp of source.getCreatorProfiles()) {
			if (cp.profileId === profileId) ids.add(cp.creatorPageId);
		}
		return ids;
	}

	/** Profile IDs that own a given font via profileFonts junction. */
	function profileIdsForFont(fontId: string): Set<string> {
		const ids = new Set<string>();
		for (const pf of source.getProfileFonts()) {
			if (pf.fontId === fontId) ids.add(pf.profileId);
		}
		return ids;
	}

	/** Set of all profile IDs appearing in any creatorProfile junction. */
	function linkedProfileIds(): Set<string> {
		const ids = new Set<string>();
		for (const cp of source.getCreatorProfiles()) ids.add(cp.profileId);
		return ids;
	}

	/** Set of all font IDs appearing in any profileFont junction. */
	function linkedFontIds(): Set<string> {
		const ids = new Set<string>();
		for (const pf of source.getProfileFonts()) ids.add(pf.fontId);
		return ids;
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
			return pages
				.map((p) => ({
					id: p.id,
					title: p.title,
					avatarData: p.avatar?.data ?? null,
					profileCount: profileIdsForPage(p.id).size
				}))
				.sort((a, b) => a.title.localeCompare(b.title));
		},

		getProfiles(pageId?: string): (Profile & { sectionId: string | null })[] {
			const profiles = source.getProfiles();
			if (pageId) {
				const cps = source.getCreatorProfiles().filter((cp) => cp.creatorPageId === pageId);
				const ids = new Set(cps.map((cp) => cp.profileId));
				return profiles
					.filter((p) => ids.has(p.id))
					.map((p) => {
						const cp = cps.find((cp) => cp.profileId === p.id);
						return { ...p, sectionId: cp?.sectionId ?? null };
					})
					.sort((a, b) => a.title.localeCompare(b.title));
			}
			return profiles.map((p) => ({ ...p, sectionId: null })).sort((a, b) => a.title.localeCompare(b.title));
		},

		getFonts(profileId: string): (Font & { sectionId: string | null })[] {
			const pfs = source.getProfileFonts().filter((pf) => pf.profileId === profileId);
			const ids = new Set(pfs.map((pf) => pf.fontId));
			return source.getFonts()
				.filter((f) => ids.has(f.id))
				.map((f) => {
					const pf = pfs.find((pf) => pf.fontId === f.id);
					return { ...f, sectionId: pf?.sectionId ?? null };
				})
				.sort((a, b) => a.title.localeCompare(b.title));
		},

		getStandaloneProfiles(): Profile[] {
			const linked = linkedProfileIds();
			return source.getProfiles()
				.filter((p) => !linked.has(p.id))
				.sort((a, b) => a.title.localeCompare(b.title));
		},

		getStandaloneFonts(): Font[] {
			const linked = linkedFontIds();
			return source.getFonts()
				.filter((f) => !linked.has(f.id))
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
				// Deselect child profiles and their fonts
				const childProfileIds = profileIdsForPage(pageId);
				const nextProfiles = new Set(selectedProfileIds);
				const nextFonts = new Set(selectedFontIds);
				for (const pid of childProfileIds) {
					nextProfiles.delete(pid);
					for (const fid of fontIdsForProfile(pid)) {
						nextFonts.delete(fid);
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
				// Deselect child fonts
				const nextFonts = new Set(selectedFontIds);
				for (const fid of fontIdsForProfile(profileId)) {
					nextFonts.delete(fid);
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

		getAllowedProfileIds(): Set<string> {
			if (!this.hasFilters) return new Set();

			const allowed = new Set<string>();
			const allProfiles = source.getProfiles();
			const profileMap = new Map(allProfiles.map((p) => [p.id, p]));

			// Profiles included by selected pages
			for (const pageId of selectedPageIds) {
				const pageProfileIds = profileIdsForPage(pageId);
				const selectedInPage = [...pageProfileIds].filter((pid) => selectedProfileIds.has(pid));
				const idsToUse = selectedInPage.length > 0 ? selectedInPage : [...pageProfileIds];
				for (const pid of idsToUse) {
					if (profileMap.has(pid)) allowed.add(pid);
				}
			}

			// Directly selected profiles not already covered by a selected page
			for (const profileId of selectedProfileIds) {
				const ownerPages = pageIdsForProfile(profileId);
				const coveredByPage = [...ownerPages].some((pid) => selectedPageIds.has(pid));
				if (coveredByPage) continue;
				allowed.add(profileId);
			}

			return allowed;
		},

		getAllowedFontIds(): Set<string> {
			if (!this.hasFilters) return new Set();

			const allowed = new Set<string>();
			const allFonts = source.getFonts();
			const fontMap = new Map(allFonts.map((f) => [f.id, f]));

			/** Return font ids for a profile, narrowed by font selection if any. */
			const fontsForProfile = (profileId: string): string[] => {
				const pfIds = fontIdsForProfile(profileId);
				const pFonts = [...pfIds].filter((fid) => fontMap.has(fid));
				const selected = pFonts.filter((fid) => selectedFontIds.has(fid));
				return selected.length > 0 ? selected : pFonts;
			};

			// Fonts from selected pages
			for (const pageId of selectedPageIds) {
				const pageProfileIds = profileIdsForPage(pageId);
				const selectedInPage = [...pageProfileIds].filter((pid) => selectedProfileIds.has(pid));
				const idsToUse = selectedInPage.length > 0 ? selectedInPage : [...pageProfileIds];
				for (const pid of idsToUse) {
					for (const fid of fontsForProfile(pid)) allowed.add(fid);
				}
			}

			// Fonts from directly selected profiles (not covered by selected pages)
			for (const profileId of selectedProfileIds) {
				const ownerPages = pageIdsForProfile(profileId);
				const coveredByPage = [...ownerPages].some((pid) => selectedPageIds.has(pid));
				if (coveredByPage) continue;
				for (const fid of fontsForProfile(profileId)) allowed.add(fid);
			}

			// Directly selected fonts not covered by profile or page selection
			for (const fontId of selectedFontIds) {
				if (!fontMap.has(fontId)) continue;
				const ownerProfiles = profileIdsForFont(fontId);
				const coveredByProfile = [...ownerProfiles].some((pid) => selectedProfileIds.has(pid));
				if (coveredByProfile) continue;
				const coveredByPage = [...ownerProfiles].some((pid) => {
					const pages = pageIdsForProfile(pid);
					return [...pages].some((pgid) => selectedPageIds.has(pgid));
				});
				if (coveredByPage) continue;
				allowed.add(fontId);
			}

			return allowed;
		}
	};
}
