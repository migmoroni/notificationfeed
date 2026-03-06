/**
 * Creator Store — reactive state for the active UserCreator.
 *
 * Manages CreatorPages and their child Profiles/Fonts.
 * Provides publish flow that creates immutable PageExport snapshots.
 *
 * Pattern: module-level $state + exported read-only accessor + init() lifecycle.
 * Analogous to consumer.svelte.ts but for the creator role.
 */

import type { UserCreator } from '$lib/domain/user/user-creator.js';
import type { CreatorPage, NewCreatorPage } from '$lib/domain/creator-page/creator-page.js';
import type { PageExport, ProfileSnapshot, FontSnapshot, SectionSnapshot } from '$lib/domain/creator-page/page-export.js';
import type { Profile, NewProfile } from '$lib/domain/profile/profile.js';
import type { Font, NewFont } from '$lib/domain/font/font.js';
import type { Section, NewSection, SectionContainerType, SectionContainer } from '$lib/domain/section/section.js';
import { createCreatorPageStore } from '$lib/persistence/creator-page.store.js';
import { createProfileStore } from '$lib/persistence/profile.store.js';
import { createFontStore } from '$lib/persistence/font.store.js';
import { createSectionStore } from '$lib/persistence/section.store.js';
import { getDatabase } from '$lib/persistence/db.js';

// ── Internal reactive state ────────────────────────────────────────────

interface CreatorStoreState {
	user: UserCreator | null;
	pages: CreatorPage[];
	/** All profiles owned by this creator (across all pages) */
	profiles: Profile[];
	/** All fonts owned by this creator (across all pages) */
	fonts: Font[];
	/** All section containers owned by this creator */
	sectionContainers: SectionContainer[];
	loading: boolean;
}

let state = $state<CreatorStoreState>({
	user: null,
	pages: [],
	profiles: [],
	fonts: [],
	sectionContainers: [],
	loading: false
});

const pageRepo = createCreatorPageStore();
const profileRepo = createProfileStore();
const fontRepo = createFontStore();
const sectionRepo = createSectionStore();

// ── Helpers ────────────────────────────────────────────────────────────

async function loadCreatorData(userId: string): Promise<void> {
	const pages = await pageRepo.getByOwnerId(userId);
	const profiles = await profileRepo.getByOwnerId(userId, 'creator');
	const allFonts = await fontRepo.getAll();
	const profileIds = new Set(profiles.map((p) => p.id));
	const fonts = allFonts.filter((f) => profileIds.has(f.profileId));
	const sectionContainers = await sectionRepo.getAll();

	state.pages = pages;
	state.profiles = profiles;
	state.fonts = fonts;
	state.sectionContainers = sectionContainers;
}

function getProfilesForPage(pageId: string): Profile[] {
	return state.profiles.filter((p) => p.creatorPageId === pageId);
}

function getFontsForProfile(profileId: string): Font[] {
	return state.fonts.filter((f) => f.profileId === profileId);
}

function getSectionsForContainer(containerType: SectionContainerType, containerId: string): Section[] {
	const container = state.sectionContainers.find((c) => c.containerId === containerId);
	if (!container) return [];
	return [...container.sections].sort((a, b) => a.order - b.order);
}

/** Find which container holds a given sectionId. Returns [container, sectionIndex] or null. */
function findSectionLocation(sectionId: string): { container: SectionContainer; index: number } | null {
	for (const c of state.sectionContainers) {
		const idx = c.sections.findIndex((s) => s.id === sectionId);
		if (idx >= 0) return { container: c, index: idx };
	}
	return null;
}

// ── Exported accessor ──────────────────────────────────────────────────

export const creator = {
	get user() { return state.user; },
	get pages() { return state.pages; },
	get profiles() { return state.profiles; },
	get fonts() { return state.fonts; },
	get sectionContainers() { return state.sectionContainers; },
	get loading() { return state.loading; },
	get isReady() { return state.user !== null && !state.loading; },

	// ── Lifecycle ────────────────────────────────────────────────────

	async init(user: UserCreator): Promise<void> {
		if (state.loading) return;
		state.loading = true;

		try {
			state.user = user;
			await loadCreatorData(user.id);
		} finally {
			state.loading = false;
		}
	},

	async reload(): Promise<void> {
		if (!state.user) return;
		await loadCreatorData(state.user.id);
	},

	// ── Page Tree Accessors ──────────────────────────────────────────

	getProfilesForPage,
	getFontsForProfile,
	getSectionsForContainer,

	getPageTree(pageId: string): { page: CreatorPage; sections: Section[]; profiles: (Profile & { fonts: Font[]; sections: Section[] })[] } | null {
		const page = state.pages.find((p) => p.id === pageId);
		if (!page) return null;

		const pageSections = getSectionsForContainer('creator', pageId);
		const profiles = getProfilesForPage(pageId).map((profile) => ({
			...profile,
			fonts: getFontsForProfile(profile.id),
			sections: getSectionsForContainer('profile', profile.id)
		}));

		return { page, sections: pageSections, profiles };
	},

	// ── Page CRUD ────────────────────────────────────────────────────

	async createPage(data: Omit<NewCreatorPage, 'ownerId'>): Promise<CreatorPage> {
		if (!state.user) throw new Error('No active creator');

		const page = await pageRepo.create({
			...$state.snapshot(data),
			ownerId: state.user.id
		});
		state.pages = [...state.pages, page];
		return page;
	},

	async updatePage(pageId: string, data: Partial<NewCreatorPage>): Promise<CreatorPage> {
		const updated = await pageRepo.update(pageId, $state.snapshot(data));
		state.pages = state.pages.map((p) => (p.id === pageId ? updated : p));
		return updated;
	},

	async deletePage(pageId: string): Promise<void> {
		// Delete all fonts of profiles under this page
		const profiles = getProfilesForPage(pageId);
		for (const profile of profiles) {
			await fontRepo.deleteByProfileId(profile.id);
			await sectionRepo.deleteContainer(profile.id);
			await profileRepo.delete(profile.id);
		}
		await sectionRepo.deleteContainer(pageId);
		await pageRepo.delete(pageId);

		const profileIds = new Set(profiles.map((p) => p.id));
		state.fonts = state.fonts.filter((f) => !profileIds.has(f.profileId));
		state.sectionContainers = state.sectionContainers.filter(
			(c) => c.containerId !== pageId && !profileIds.has(c.containerId)
		);
		state.profiles = state.profiles.filter((p) => p.creatorPageId !== pageId);
		state.pages = state.pages.filter((p) => p.id !== pageId);
	},

	// ── Profile CRUD ─────────────────────────────────────────────────

	async createProfile(data: Omit<NewProfile, 'ownerType' | 'ownerId'>): Promise<Profile> {
		if (!state.user) throw new Error('No active creator');

		const profile = await profileRepo.create({
			...$state.snapshot(data),
			ownerType: 'creator',
			ownerId: state.user.id
		});
		state.profiles = [...state.profiles, profile];
		return profile;
	},

	async updateProfile(profileId: string, data: Partial<NewProfile>): Promise<Profile> {
		const updated = await profileRepo.update(profileId, $state.snapshot(data));
		state.profiles = state.profiles.map((p) => (p.id === profileId ? updated : p));
		return updated;
	},

	async deleteProfile(profileId: string): Promise<void> {
		await fontRepo.deleteByProfileId(profileId);
		await sectionRepo.deleteContainer(profileId);
		await profileRepo.delete(profileId);

		state.fonts = state.fonts.filter((f) => f.profileId !== profileId);
		state.sectionContainers = state.sectionContainers.filter(
			(c) => c.containerId !== profileId
		);
		state.profiles = state.profiles.filter((p) => p.id !== profileId);
	},

	// ── Font CRUD ────────────────────────────────────────────────────

	async createFont(data: NewFont): Promise<Font> {
		const font = await fontRepo.create($state.snapshot(data));
		state.fonts = [...state.fonts, font];
		return font;
	},

	async updateFont(fontId: string, data: Partial<NewFont>): Promise<Font> {
		const updated = await fontRepo.update(fontId, $state.snapshot(data));
		state.fonts = state.fonts.map((f) => (f.id === fontId ? updated : f));
		return updated;
	},

	async deleteFont(fontId: string): Promise<void> {
		await fontRepo.delete(fontId);
		state.fonts = state.fonts.filter((f) => f.id !== fontId);
	},

	// ── Section CRUD ──────────────────────────────────────────────────────────

	async createSection(containerType: SectionContainerType, containerId: string, data: NewSection): Promise<Section> {
		const section: Section = {
			id: crypto.randomUUID(),
			...data,
			createdAt: new Date()
		};

		let container = state.sectionContainers.find((c) => c.containerId === containerId);
		if (container) {
			container = { ...container, sections: [...container.sections, section] };
		} else {
			container = { containerId, containerType, sections: [section] };
		}

		await sectionRepo.saveContainer($state.snapshot(container));
		state.sectionContainers = state.sectionContainers
			.filter((c) => c.containerId !== containerId)
			.concat(container);
		return section;
	},

	async updateSection(sectionId: string, data: Partial<Pick<Section, 'title' | 'color' | 'order' | 'emoji' | 'hideTitle'>>): Promise<Section> {
		const loc = findSectionLocation(sectionId);
		if (!loc) throw new Error(`Section not found: ${sectionId}`);

		const updated = { ...loc.container.sections[loc.index], ...data };
		const newSections = loc.container.sections.map((s) => (s.id === sectionId ? updated : s));
		const newContainer = { ...loc.container, sections: newSections };

		await sectionRepo.saveContainer($state.snapshot(newContainer));
		state.sectionContainers = state.sectionContainers.map((c) =>
			c.containerId === newContainer.containerId ? newContainer : c
		);
		return updated;
	},

	/** Delete a section and clear sectionId on all children that reference it. */
	async deleteSection(sectionId: string): Promise<void> {
		const loc = findSectionLocation(sectionId);
		if (!loc) return;

		const newSections = loc.container.sections.filter((s) => s.id !== sectionId);
		if (newSections.length > 0) {
			const newContainer = { ...loc.container, sections: newSections };
			await sectionRepo.saveContainer($state.snapshot(newContainer));
			state.sectionContainers = state.sectionContainers.map((c) =>
				c.containerId === loc.container.containerId ? newContainer : c
			);
		} else {
			await sectionRepo.deleteContainer(loc.container.containerId);
			state.sectionContainers = state.sectionContainers.filter(
				(c) => c.containerId !== loc.container.containerId
			);
		}

		// Clear sectionId on children
		for (const p of state.profiles.filter((p) => p.sectionId === sectionId)) {
			await profileRepo.update(p.id, { sectionId: null });
		}
		for (const f of state.fonts.filter((f) => f.sectionId === sectionId)) {
			await fontRepo.update(f.id, { sectionId: null });
		}

		state.profiles = state.profiles.map((p) => p.sectionId === sectionId ? { ...p, sectionId: null } : p);
		state.fonts = state.fonts.map((f) => f.sectionId === sectionId ? { ...f, sectionId: null } : f);
	},

	/** Batch-reorder sections by providing the container and ordered array of IDs. */
	async reorderSections(containerId: string, orderedIds: string[]): Promise<void> {
		const container = state.sectionContainers.find((c) => c.containerId === containerId);
		if (!container) return;

		const reordered = container.sections
			.map((s) => {
				const idx = orderedIds.indexOf(s.id);
				return idx >= 0 ? { ...s, order: idx } : s;
			})
			.sort((a, b) => a.order - b.order);

		const newContainer = { ...container, sections: reordered };
		await sectionRepo.saveContainer($state.snapshot(newContainer));
		state.sectionContainers = state.sectionContainers.map((c) =>
			c.containerId === containerId ? newContainer : c
		);
	},

	// ── Publish ──────────────────────────────────────────────────────

	/**
	 * Publish a page: creates an immutable PageExport snapshot and stores
	 * it on the CreatorPage. Edits after publish don't affect the snapshot.
	 */
	async publishPage(pageId: string): Promise<PageExport> {
		if (!state.user) throw new Error('No active creator');

		const tree = this.getPageTree(pageId);
		if (!tree) throw new Error(`CreatorPage not found: ${pageId}`);

		const { page, sections: pageSections, profiles } = tree;

		// Ensure exportId exists
		let exportId = page.exportId;
		if (!exportId) {
			exportId = crypto.randomUUID();
			const db = await getDatabase();
			const stored = await db.creatorPages.getById<CreatorPage>(pageId);
			if (stored) {
				stored.exportId = exportId;
				await db.creatorPages.put(stored);
			}
		}

		const newVersion = page.publishedVersion + 1;

		const snapshot: PageExport = {
			exportId,
			version: newVersion,
			exportedAt: new Date(),
			creatorDisplayName: state.user.displayName,
			page: {
				title: page.title,
				tagline: page.tagline,
				bio: page.bio,
				tags: [...page.tags],
				avatar: page.avatar ? { ...page.avatar } : null,
				banner: page.banner ? { ...page.banner } : null,
				categoryAssignments: (page.categoryAssignments ?? []).map((a) => ({
					treeId: a.treeId,
					categoryIds: [...a.categoryIds]
				})),
				sections: pageSections.length > 0
					? pageSections.map((s): SectionSnapshot => ({ title: s.title, color: s.color, order: s.order, emoji: s.emoji, hideTitle: s.hideTitle }))
					: undefined
			},
			profiles: profiles.map((profile): ProfileSnapshot => {
				const pageSectionIndex = profile.sectionId
					? pageSections.findIndex((s) => s.id === profile.sectionId)
					: null;
				const profileSections = profile.sections;

				return {
					title: profile.title,
					bio: profile.bio ?? '',
					tags: [...profile.tags],
					avatar: profile.avatar ? { ...profile.avatar } : null,
					categoryAssignments: profile.categoryAssignments.map((a) => ({
						treeId: a.treeId,
						categoryIds: [...a.categoryIds]
					})),
					defaultEnabled: profile.defaultEnabled,
					sectionId: pageSectionIndex !== null && pageSectionIndex >= 0 ? pageSectionIndex : null,
					sections: profileSections.length > 0
						? profileSections.map((s): SectionSnapshot => ({ title: s.title, color: s.color, order: s.order, emoji: s.emoji, hideTitle: s.hideTitle }))
						: undefined,
					fonts: profile.fonts.map((font): FontSnapshot => {
						const fontSectionIndex = font.sectionId
							? profileSections.findIndex((s) => s.id === font.sectionId)
							: null;
						return {
							title: font.title,
							bio: font.bio ?? '',
							tags: [...font.tags],
							avatar: font.avatar ? { ...font.avatar } : null,
							protocol: font.protocol,
							config: { ...font.config },
							categoryAssignments: (font.categoryAssignments ?? []).map((a) => ({
								treeId: a.treeId,
								categoryIds: [...a.categoryIds]
							})),
							defaultEnabled: font.defaultEnabled,
							sectionId: fontSectionIndex !== null && fontSectionIndex >= 0 ? fontSectionIndex : null
						};
					})
				};
			})
		};

		await pageRepo.setPublished(pageId, $state.snapshot(snapshot), newVersion);

		// Update local state
		const updatedPage = await pageRepo.getById(pageId);
		if (updatedPage) {
			state.pages = state.pages.map((p) => (p.id === pageId ? updatedPage : p));
		}

		return snapshot;
	}
};
