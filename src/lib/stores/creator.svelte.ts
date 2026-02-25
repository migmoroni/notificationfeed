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
import type { PageExport, ProfileSnapshot, FontSnapshot } from '$lib/domain/creator-page/page-export.js';
import type { Profile, NewProfile } from '$lib/domain/profile/profile.js';
import type { Font, NewFont } from '$lib/domain/font/font.js';
import { createCreatorPageStore } from '$lib/persistence/creator-page.store.js';
import { createProfileStore } from '$lib/persistence/profile.store.js';
import { createFontStore } from '$lib/persistence/font.store.js';
import { getDatabase } from '$lib/persistence/db.js';

// ── Internal reactive state ────────────────────────────────────────────

interface CreatorStoreState {
	user: UserCreator | null;
	pages: CreatorPage[];
	/** All profiles owned by this creator (across all pages) */
	profiles: Profile[];
	/** All fonts owned by this creator (across all pages) */
	fonts: Font[];
	loading: boolean;
}

let state = $state<CreatorStoreState>({
	user: null,
	pages: [],
	profiles: [],
	fonts: [],
	loading: false
});

const pageRepo = createCreatorPageStore();
const profileRepo = createProfileStore();
const fontRepo = createFontStore();

// ── Helpers ────────────────────────────────────────────────────────────

async function loadCreatorData(userId: string): Promise<void> {
	const pages = await pageRepo.getByOwnerId(userId);
	const profiles = await profileRepo.getByOwnerId(userId, 'creator');
	const allFonts = await fontRepo.getAll();
	const profileIds = new Set(profiles.map((p) => p.id));
	const fonts = allFonts.filter((f) => profileIds.has(f.profileId));

	state.pages = pages;
	state.profiles = profiles;
	state.fonts = fonts;
}

function getProfilesForPage(pageId: string): Profile[] {
	return state.profiles.filter((p) => p.creatorPageId === pageId);
}

function getFontsForProfile(profileId: string): Font[] {
	return state.fonts.filter((f) => f.profileId === profileId);
}

// ── Exported accessor ──────────────────────────────────────────────────

export const creator = {
	get user() { return state.user; },
	get pages() { return state.pages; },
	get profiles() { return state.profiles; },
	get fonts() { return state.fonts; },
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

	getPageTree(pageId: string): { page: CreatorPage; profiles: (Profile & { fonts: Font[] })[] } | null {
		const page = state.pages.find((p) => p.id === pageId);
		if (!page) return null;

		const profiles = getProfilesForPage(pageId).map((profile) => ({
			...profile,
			fonts: getFontsForProfile(profile.id)
		}));

		return { page, profiles };
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
			await profileRepo.delete(profile.id);
		}
		await pageRepo.delete(pageId);

		state.fonts = state.fonts.filter((f) => !profiles.some((p) => p.id === f.profileId));
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
		await profileRepo.delete(profileId);

		state.fonts = state.fonts.filter((f) => f.profileId !== profileId);
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

	// ── Publish ──────────────────────────────────────────────────────

	/**
	 * Publish a page: creates an immutable PageExport snapshot and stores
	 * it on the CreatorPage. Edits after publish don't affect the snapshot.
	 */
	async publishPage(pageId: string): Promise<PageExport> {
		if (!state.user) throw new Error('No active creator');

		const tree = this.getPageTree(pageId);
		if (!tree) throw new Error(`CreatorPage not found: ${pageId}`);

		const { page, profiles } = tree;

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
				bio: page.bio,
				tags: [...page.tags],
				avatar: page.avatar ? { ...page.avatar } : null,
				banner: page.banner ? { ...page.banner } : null
			},
			profiles: profiles.map((profile): ProfileSnapshot => ({
				title: profile.title,
				tags: [...profile.tags],
				avatar: profile.avatar ? { ...profile.avatar } : null,
				categoryAssignments: profile.categoryAssignments.map((a) => ({
					treeId: a.treeId,
					categoryIds: [...a.categoryIds]
				})),
				defaultEnabled: profile.defaultEnabled,
				fonts: profile.fonts.map((font): FontSnapshot => ({
					title: font.title,
					tags: [...font.tags],
					avatar: font.avatar ? { ...font.avatar } : null,
					protocol: font.protocol,
					config: { ...font.config },
					defaultEnabled: font.defaultEnabled
				}))
			}))
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
