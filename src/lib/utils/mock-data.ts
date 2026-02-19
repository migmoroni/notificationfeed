/**
 * Mock Data — fake entities for development and testing.
 *
 * Provides `seedMockData()` to populate IndexedDB with realistic test data
 * and `hasMockData()` to prevent re-seeding.
 *
 * NOTE: Dev-only utility. Do NOT export from $lib/index.ts.
 */

import type { CanonicalPost } from '$lib/normalization/canonical-post.js';
import { savePosts } from '$lib/persistence/post.store.js';

// ── Stable IDs ─────────────────────────────────────────────────────────

const IDS = {
	consumer: '00000000-0000-0000-0000-000000000001',
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
	const { getDatabase } = await import('$lib/persistence/db.js');
	const db = await getDatabase();
	const pages = await db.creatorPages.getAll();
	const hasPage = pages.some((p: any) => p.id === IDS.pageTechBlog);
	if (!hasPage) return false;

	// Detect stale data from before categoryAssignments migration
	const profiles = await db.profiles.getAll();
	const techProfile = profiles.find((p: any) => p.id === IDS.profileTech) as any;
	if (techProfile && !techProfile.categoryAssignments) {
		// Purge stale mock data so it can be re-seeded
		for (const p of profiles) await db.profiles.delete((p as any).id);
		for (const pg of pages) await db.creatorPages.delete((pg as any).id);
		const fonts = await db.fonts.getAll();
		for (const f of fonts) await db.fonts.delete((f as any).id);
		const states = await db.consumerStates.getAll();
		for (const s of states) await db.consumerStates.delete((s as any).entityId);
		const posts = await db.posts.getAll();
		for (const post of posts) await db.posts.delete((post as any).id);
		const users = await db.users.getAll();
		for (const u of users) await db.users.delete((u as any).id);
		return false;
	}

	return true;
}

// ── Seed function ──────────────────────────────────────────────────────

export async function seedMockData(): Promise<void> {
	if (await hasMockData()) return;

	const { getDatabase } = await import('$lib/persistence/db.js');
	const db = await getDatabase();

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
		categoryAssignments: [
			{ treeId: 'subject', categoryIds: ['subj-tech-webdev', 'subj-tech-ai'] },
			{ treeId: 'content_type', categoryIds: ['ct-format-news', 'ct-format-tutorial'] }
		],
		defaultEnabled: true,
		createdAt: now,
		updatedAt: now
	});

	await db.profiles.put({
		id: IDS.profileNews,
		ownerType: 'consumer',
		ownerId: IDS.consumer,
		creatorPageId: null,
		title: 'News Sources',
		tags: ['news', 'world'],
		avatar: null,
		categoryAssignments: [
			{ treeId: 'subject', categoryIds: ['subj-politics-intl'] },
			{ treeId: 'content_type', categoryIds: ['ct-format-news'] }
		],
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
			favoriteFolderId: null,
			priority: 1 as const,
			favorite: true,
			overriddenAt: now
		},
		{
			userId: IDS.consumer,
			entityType: 'profile' as const,
			entityId: IDS.profileTech,
			enabled: true,
			favoriteFolderId: null,
			priority: 2 as const,
			favorite: false,
			overriddenAt: now
		},
		{
			userId: IDS.consumer,
			entityType: 'font' as const,
			entityId: IDS.fontRss2,
			enabled: true,
			favoriteFolderId: null,
			priority: null,
			favorite: false,
			overriddenAt: now
		},
		{
			userId: IDS.consumer,
			entityType: 'font' as const,
			entityId: IDS.fontAtom1,
			enabled: true,
			favoriteFolderId: null,
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
