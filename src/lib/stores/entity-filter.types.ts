/**
 * EntityFilterStore — shared interface for hierarchical Page/Profile/Font filters.
 *
 * All three filter instances (feed, browse, preview) satisfy this interface,
 * allowing EntityTreeFilter component to be reused across pages.
 */

import type { Profile } from '$lib/domain/profile/profile.js';
import type { Font } from '$lib/domain/font/font.js';
import type { Section, SectionContainerType, SectionContainer } from '$lib/domain/section/section.js';

export interface EntityFilterStore {
	readonly selectedPageIds: Set<string>;
	readonly selectedProfileIds: Set<string>;
	readonly selectedFontIds: Set<string>;
	readonly hasFilters: boolean;
	readonly totalSelected: number;

	loadPages(): Promise<void>;
	getPages(): { id: string; title: string; avatarData: string | null; profileCount: number }[];
	getProfiles(pageId?: string): (Profile & { sectionId: string | null })[];
	getFonts(profileId: string): (Font & { sectionId: string | null })[];
	getStandaloneProfiles(): Profile[];
	getStandaloneFonts(): Font[];
	getSections(containerType: SectionContainerType, containerId: string): Section[];

	isPageSelected(pageId: string): boolean;
	isProfileSelected(profileId: string): boolean;
	isFontSelected(fontId: string): boolean;

	togglePage(pageId: string): void;
	toggleProfile(profileId: string): void;
	toggleFont(fontId: string): void;
	clearAll(): void;

	getAllowedProfileIds(): Set<string>;
	getAllowedFontIds(): Set<string>;
}
