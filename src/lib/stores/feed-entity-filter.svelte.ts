/**
 * Feed Entity Filter Store — hierarchical selection of Pages/Profiles/Fonts.
 *
 * Provides a collapsible tree for the Feed sidebar:
 *   CreatorPage → Profiles → Fonts
 *
 * Only shows entities the consumer has subscribed/followed/activated.
 * Selection is hierarchical:
 *   - Selecting a Page implies all its Profiles and Fonts
 *   - Selecting a Profile implies all its Fonts
 *   - Selecting a Font filters to that single Font
 *
 * The final output is a set of allowed fontIds for FeedList filtering.
 */

import type { CreatorPage } from '$lib/domain/creator-page/creator-page.js';
import type { Profile } from '$lib/domain/profile/profile.js';
import type { Font } from '$lib/domain/font/font.js';
import { createCreatorPageStore } from '$lib/persistence/creator-page.store.js';
import { feed } from './feed.svelte.js';

// ── Internal reactive state ────────────────────────────────────────────

let selectedPageIds = $state<Set<string>>(new Set());
let selectedProfileIds = $state<Set<string>>(new Set());
let selectedFontIds = $state<Set<string>>(new Set());
let pages = $state<CreatorPage[]>([]);

// ── Derived data from feed store (only active entities) ────────────────

const pageRepo = createCreatorPageStore();

function getActiveProfiles(): Profile[] {
	const fontProfileIds = new Set(feed.fonts.map((f) => f.profileId));
	return feed.profiles.filter((p) => fontProfileIds.has(p.id));
}

function getActiveFonts(): Font[] {
	return feed.fonts;
}

// ── Exported accessor ──────────────────────────────────────────────────

export const feedEntityFilter = {
	get selectedPageIds() { return selectedPageIds; },
	get selectedProfileIds() { return selectedProfileIds; },
	get selectedFontIds() { return selectedFontIds; },

	get hasFilters(): boolean {
		return selectedPageIds.size > 0 || selectedProfileIds.size > 0 || selectedFontIds.size > 0;
	},

	/**
	 * Load CreatorPages from persistence for title display.
	 * Should be called on mount.
	 */
	async loadPages(): Promise<void> {
		pages = await pageRepo.getAll();
	},

	/**
	 * Get CreatorPages that own profiles with fonts in the feed.
	 */
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

	/**
	 * Get profiles, optionally filtered to a specific page.
	 * Only includes profiles that have fonts in the feed.
	 */
	getProfiles(pageId?: string): Profile[] {
		const profiles = getActiveProfiles();
		if (pageId) {
			return profiles
				.filter((p) => p.creatorPageId === pageId)
				.sort((a, b) => a.title.localeCompare(b.title));
		}
		return profiles.sort((a, b) => a.title.localeCompare(b.title));
	},

	/**
	 * Get fonts for a specific profile.
	 */
	getFonts(profileId: string): Font[] {
		return getActiveFonts()
			.filter((f) => f.profileId === profileId)
			.sort((a, b) => a.title.localeCompare(b.title));
	},

	/**
	 * Get standalone profiles (no creatorPageId) that have fonts.
	 */
	getStandaloneProfiles(): Profile[] {
		return getActiveProfiles()
			.filter((p) => !p.creatorPageId)
			.sort((a, b) => a.title.localeCompare(b.title));
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
			// Also deselect child profiles and fonts
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
			// Also deselect child fonts
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

	/**
	 * Compute the final set of allowed font IDs based on current selection.
	 * Returns empty set if no filters — meaning "show all".
	 *
	 * Narrowing hierarchy: each level refines the parent.
	 *   - Page selected → all fonts from that page
	 *   - Page + child Profile selected → only fonts from that profile
	 *   - Page + child Profile + child Font selected → only that font
	 *   - Profile selected (standalone) → all fonts from that profile
	 *   - Profile + child Font selected → only that font
	 */
	getAllowedFontIds(): Set<string> {
		if (!this.hasFilters) return new Set();

		const allowed = new Set<string>();
		const allFonts = getActiveFonts();
		const allProfiles = getActiveProfiles();

		// Helper: effective fonts for a profile (narrowed by selected fonts if any)
		const fontsForProfile = (profileId: string): string[] => {
			const pFonts = allFonts.filter((f) => f.profileId === profileId);
			const selected = pFonts.filter((f) => selectedFontIds.has(f.id));
			return selected.length > 0 ? selected.map((f) => f.id) : pFonts.map((f) => f.id);
		};

		// Process selected pages — narrowed by child profile/font selections
		for (const pageId of selectedPageIds) {
			const pageProfiles = allProfiles.filter((p) => p.creatorPageId === pageId);
			const selectedInPage = pageProfiles.filter((p) => selectedProfileIds.has(p.id));
			const profilesToUse = selectedInPage.length > 0 ? selectedInPage : pageProfiles;
			for (const p of profilesToUse) {
				for (const fid of fontsForProfile(p.id)) allowed.add(fid);
			}
		}

		// Process selected profiles not already covered by a selected page
		for (const profileId of selectedProfileIds) {
			const profile = allProfiles.find((p) => p.id === profileId);
			if (profile?.creatorPageId && selectedPageIds.has(profile.creatorPageId)) continue;
			for (const fid of fontsForProfile(profileId)) allowed.add(fid);
		}

		// Process selected fonts not already covered by a selected profile or page
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
