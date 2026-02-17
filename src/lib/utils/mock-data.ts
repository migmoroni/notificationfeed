/**
 * Mock Data — fake entities for development and testing.
 *
 * Provides `seedMockData()` to populate IndexedDB with realistic test data
 * and `hasMockData()` to prevent re-seeding.
 *
 * NOTE: Dev-only utility. Do NOT export from $lib/index.ts.
 */

import type { Category } from '$lib/domain/category/category.js';
import type { CanonicalPost } from '$lib/normalization/canonical-post.js';
import { createCategoryStore } from '$lib/persistence/category.store.js';
import { createCreatorPageStore } from '$lib/persistence/creator-page.store.js';
import { createProfileStore } from '$lib/persistence/profile.store.js';
import { createFontStore } from '$lib/persistence/font.store.js';
import { createUserConsumerStore } from '$lib/persistence/user-consumer.store.js';
import { savePosts } from '$lib/persistence/post.store.js';

// ── Stable IDs ─────────────────────────────────────────────────────────

const IDS = {
	consumer: '00000000-0000-0000-0000-000000000001',
	catTech: '00000000-0000-0000-0000-000000001001',
	catTechWeb: '00000000-0000-0000-0000-000000001002',
	catTechAI: '00000000-0000-0000-0000-000000001003',
	catNews: '00000000-0000-0000-0000-000000002001',
	catNewsWorld: '00000000-0000-0000-0000-000000002002',
	catNewsBrazil: '00000000-0000-0000-0000-000000002003',
	pageTechBlog: '00000000-0000-0000-0000-000000003001',
	pageNewsDaily: '00000000-0000-0000-0000-000000003002',
	profileTech: '00000000-0000-0000-0000-000000004001',
	profileNews: '00000000-0000-0000-0000-000000004002',
	fontRss1: '00000000-0000-0000-0000-000000005001',
	fontRss2: '00000000-0000-0000-0000-000000005002',
	fontAtom1: '00000000-0000-0000-0000-000000005003',
	fontNostr1: '00000000-0000-0000-0000-000000005004'
} as const;

// ── Seed check ─────────────────────────────────────────────────────────

export async function hasMockData(): Promise<boolean> {
	const categoryStore = createCategoryStore();
	const cats = await categoryStore.getAll();
	return cats.some((c: Category) => c.id === IDS.catTech);
}

// ── Seed function ──────────────────────────────────────────────────────

export async function seedMockData(): Promise<void> {
	if (await hasMockData()) return;

	const categoryStore = createCategoryStore();
	const pageStore = createCreatorPageStore();
	const profileStore = createProfileStore();
	const fontStore = createFontStore();
	const consumerStore = createUserConsumerStore();

	// ── Categories ──────────────────────────────────────────────────

	// We use the store's put (via create) but we want stable IDs,
	// so we'll use the lower-level approach: create then the store assigns ID.
	// Instead, we'll create with the factory and accept generated IDs,
	// but for mock data we need deterministic IDs. Let's use the DB directly.
	const { getDatabase } = await import('$lib/persistence/db.js');
	const db = await getDatabase();

	const categories: Category[] = [
		{ id: IDS.catTech, label: 'Technology', parentId: null, origin: 'standard', ownerId: null, depth: 0 },
		{ id: IDS.catTechWeb, label: 'Web Development', parentId: IDS.catTech, origin: 'standard', ownerId: null, depth: 1 },
		{ id: IDS.catTechAI, label: 'Artificial Intelligence', parentId: IDS.catTech, origin: 'standard', ownerId: null, depth: 1 },
		{ id: IDS.catNews, label: 'News', parentId: null, origin: 'standard', ownerId: null, depth: 0 },
		{ id: IDS.catNewsWorld, label: 'World News', parentId: IDS.catNews, origin: 'standard', ownerId: null, depth: 1 },
		{ id: IDS.catNewsBrazil, label: 'Brazil News', parentId: IDS.catNews, origin: 'standard', ownerId: null, depth: 1 }
	];

	for (const cat of categories) {
		await db.categories.put(cat);
	}

	// ── UserConsumer ────────────────────────────────────────────────

	await db.users.put({
		id: IDS.consumer,
		role: 'consumer',
		displayName: 'Dev User',
		follows: [
			{ targetType: 'creator_page', targetId: IDS.pageTechBlog, followedAt: new Date(), source: 'manual' },
			{ targetType: 'creator_page', targetId: IDS.pageNewsDaily, followedAt: new Date(), source: 'manual' }
		],
		createdAt: new Date(),
		updatedAt: new Date()
	});

	// ── CreatorPages ────────────────────────────────────────────────

	const now = new Date();

	await db.creatorPages.put({
		id: IDS.pageTechBlog,
		ownerId: IDS.consumer,
		title: 'TechBlog',
		bio: 'A curated collection of technology feeds',
		tags: ['tech', 'programming', 'web'],
		avatar: null,
		banner: null,
		nostrPublicKey: null,
		blossomRef: null,
		syncStatus: 'local',
		exportId: null,
		createdAt: now,
		updatedAt: now
	});

	await db.creatorPages.put({
		id: IDS.pageNewsDaily,
		ownerId: IDS.consumer,
		title: 'NewsDaily',
		bio: 'Daily news from around the world',
		tags: ['news', 'world', 'brazil'],
		avatar: null,
		banner: null,
		nostrPublicKey: null,
		blossomRef: null,
		syncStatus: 'local',
		exportId: null,
		createdAt: now,
		updatedAt: now
	});

	// ── Profiles ────────────────────────────────────────────────────

	await db.profiles.put({
		id: IDS.profileTech,
		ownerType: 'consumer',
		ownerId: IDS.consumer,
		creatorPageId: IDS.pageTechBlog,
		title: 'Tech Sources',
		tags: ['tech', 'development'],
		avatar: null,
		categoryId: IDS.catTechWeb,
		defaultEnabled: true,
		createdAt: now,
		updatedAt: now
	});

	await db.profiles.put({
		id: IDS.profileNews,
		ownerType: 'consumer',
		ownerId: IDS.consumer,
		creatorPageId: IDS.pageNewsDaily,
		title: 'News Sources',
		tags: ['news', 'world'],
		avatar: null,
		categoryId: IDS.catNewsWorld,
		defaultEnabled: true,
		createdAt: now,
		updatedAt: now
	});

	// ── Fonts ───────────────────────────────────────────────────────

	await db.fonts.put({
		id: IDS.fontRss1,
		profileId: IDS.profileTech,
		title: 'Hacker News RSS',
		tags: ['hackernews', 'tech'],
		avatar: null,
		protocol: 'rss',
		config: { url: 'https://hnrss.org/frontpage' },
		defaultEnabled: true,
		createdAt: now,
		updatedAt: now
	});

	await db.fonts.put({
		id: IDS.fontRss2,
		profileId: IDS.profileNews,
		title: 'BBC World RSS',
		tags: ['bbc', 'world'],
		avatar: null,
		protocol: 'rss',
		config: { url: 'http://feeds.bbci.co.uk/news/world/rss.xml' },
		defaultEnabled: true,
		createdAt: now,
		updatedAt: now
	});

	await db.fonts.put({
		id: IDS.fontAtom1,
		profileId: IDS.profileTech,
		title: 'Svelte Blog (Atom)',
		tags: ['svelte', 'framework'],
		avatar: null,
		protocol: 'atom',
		config: { url: 'https://svelte.dev/blog/rss.xml' },
		defaultEnabled: true,
		createdAt: now,
		updatedAt: now
	});

	await db.fonts.put({
		id: IDS.fontNostr1,
		profileId: IDS.profileTech,
		title: 'Nostr Dev Updates',
		tags: ['nostr', 'protocol'],
		avatar: null,
		protocol: 'nostr',
		config: { relays: ['wss://relay.damus.io'], pubkey: 'npub1mockkey000000000000000000000000000000' },
		defaultEnabled: true,
		createdAt: now,
		updatedAt: now
	});

	// ── ConsumerStates ──────────────────────────────────────────────

	const states = [
		{
			userId: IDS.consumer,
			entityType: 'font' as const,
			entityId: IDS.fontRss1,
			enabled: true,
			customCategoryId: null,
			priority: 1 as const,
			favorite: true,
			overriddenAt: now
		},
		{
			userId: IDS.consumer,
			entityType: 'profile' as const,
			entityId: IDS.profileTech,
			enabled: true,
			customCategoryId: null,
			priority: 2 as const,
			favorite: false,
			overriddenAt: now
		},
		{
			userId: IDS.consumer,
			entityType: 'font' as const,
			entityId: IDS.fontRss2,
			enabled: true,
			customCategoryId: null,
			priority: null,
			favorite: false,
			overriddenAt: now
		},
		{
			userId: IDS.consumer,
			entityType: 'font' as const,
			entityId: IDS.fontAtom1,
			enabled: true,
			customCategoryId: null,
			priority: null,
			favorite: true,
			overriddenAt: now
		}
	];

	for (const s of states) {
		await db.consumerStates.put(s);
	}

	// ── Posts ────────────────────────────────────────────────────────

	const posts: CanonicalPost[] = [
		{
			id: 'post-001',
			fontId: IDS.fontRss1,
			protocol: 'rss',
			title: 'Show HN: A new approach to state management in Svelte 5',
			content: 'Runes provide fine-grained reactivity without stores.',
			url: 'https://news.ycombinator.com/item?id=1',
			author: 'svelte_dev',
			publishedAt: new Date('2026-02-16T10:00:00Z'),
			ingestedAt: now,
			read: false
		},
		{
			id: 'post-002',
			fontId: IDS.fontRss1,
			protocol: 'rss',
			title: 'TypeScript 6.0 brings module isolation improvements',
			content: 'The latest TypeScript release focuses on performance.',
			url: 'https://news.ycombinator.com/item?id=2',
			author: 'ts_enthusiast',
			publishedAt: new Date('2026-02-15T14:30:00Z'),
			ingestedAt: now,
			read: false
		},
		{
			id: 'post-003',
			fontId: IDS.fontRss2,
			protocol: 'rss',
			title: 'World leaders gather for climate summit',
			content: 'Representatives from 190 countries meet in Geneva.',
			url: 'https://bbc.co.uk/news/world-1',
			author: 'BBC News',
			publishedAt: new Date('2026-02-16T08:00:00Z'),
			ingestedAt: now,
			read: false
		},
		{
			id: 'post-004',
			fontId: IDS.fontRss2,
			protocol: 'rss',
			title: 'Brazil announces new digital infrastructure plan',
			content: 'Government invests in broadband expansion nationwide.',
			url: 'https://bbc.co.uk/news/world-2',
			author: 'BBC News',
			publishedAt: new Date('2026-02-15T16:00:00Z'),
			ingestedAt: now,
			read: true
		},
		{
			id: 'post-005',
			fontId: IDS.fontAtom1,
			protocol: 'atom',
			title: 'Svelte 5.1 released with improved server-side rendering',
			content: 'The Svelte team ships streaming SSR and better hydration.',
			url: 'https://svelte.dev/blog/svelte-5-1',
			author: 'Svelte Team',
			publishedAt: new Date('2026-02-14T12:00:00Z'),
			ingestedAt: now,
			read: false
		},
		{
			id: 'post-006',
			fontId: IDS.fontAtom1,
			protocol: 'atom',
			title: 'Building accessible forms with Svelte and shadcn-svelte',
			content: 'A practical guide to form validation and accessibility.',
			url: 'https://svelte.dev/blog/forms',
			author: 'Svelte Team',
			publishedAt: new Date('2026-02-13T09:00:00Z'),
			ingestedAt: now,
			read: false
		},
		{
			id: 'post-007',
			fontId: IDS.fontNostr1,
			protocol: 'nostr',
			title: 'NIP-29: Relay-based groups proposal finalized',
			content: 'The community converges on a standard for group chats.',
			url: '',
			author: 'nostr_dev',
			publishedAt: new Date('2026-02-16T06:00:00Z'),
			ingestedAt: now,
			read: false
		},
		{
			id: 'post-008',
			fontId: IDS.fontNostr1,
			protocol: 'nostr',
			title: 'Blossom storage integration for media-rich notes',
			content: 'Upload images and videos using decentralized storage.',
			url: '',
			author: 'blossom_builder',
			publishedAt: new Date('2026-02-15T20:00:00Z'),
			ingestedAt: now,
			read: false
		},
		{
			id: 'post-009',
			fontId: IDS.fontRss1,
			protocol: 'rss',
			title: 'Vite 7 ships with improved cold start performance',
			content: 'Build times drop by 40% thanks to new bundling strategies.',
			url: 'https://news.ycombinator.com/item?id=3',
			author: 'build_tools',
			publishedAt: new Date('2026-02-14T18:00:00Z'),
			ingestedAt: now,
			read: true
		},
		{
			id: 'post-010',
			fontId: IDS.fontRss2,
			protocol: 'rss',
			title: 'New study reveals impact of screen time on children',
			content: 'Researchers find nuanced effects depending on content type.',
			url: 'https://bbc.co.uk/news/health-1',
			author: 'BBC News',
			publishedAt: new Date('2026-02-13T11:00:00Z'),
			ingestedAt: now,
			read: false
		}
	];

	await savePosts(posts);
}

/** Exported IDs for use in tests */
export const MOCK_IDS = IDS;
