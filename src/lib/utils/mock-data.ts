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
	creator: '00000000-0000-0000-0000-000000000002',
	pageTechBlog: '00000000-0000-0000-0000-000000003001',
	pageNewsDaily: '00000000-0000-0000-0000-000000003002',
	pageCreatorPublished: '00000000-0000-0000-0000-000000003003',
	pageCreatorDraft: '00000000-0000-0000-0000-000000003004',
	profileTech: '00000000-0000-0000-0000-000000004001',
	profileNews: '00000000-0000-0000-0000-000000004002',
	profileCreator1: '00000000-0000-0000-0000-000000004003',
	profileCreator2: '00000000-0000-0000-0000-000000004004',
	fontRss1: '00000000-0000-0000-0000-000000005001',
	fontRss2: '00000000-0000-0000-0000-000000005002',
	fontAtom1: '00000000-0000-0000-0000-000000005003',
	fontNostr1: '00000000-0000-0000-0000-000000005004',
	fontCreatorRss1: '00000000-0000-0000-0000-000000005005',
	fontCreatorAtom1: '00000000-0000-0000-0000-000000005006',
	profileSecurity: '00000000-0000-0000-0000-000000004005',
	profileScienceNews: '00000000-0000-0000-0000-000000004006',
	fontRss3: '00000000-0000-0000-0000-000000005007',
	fontAtom2: '00000000-0000-0000-0000-000000005008'
} as const;

// ── Seed check ─────────────────────────────────────────────────────────

export async function hasMockData(): Promise<boolean> {
	const { getDatabase } = await import('$lib/persistence/db.js');
	const db = await getDatabase();

	const pages = await db.creatorPages.getAll();
	if (!pages.some((p: any) => p.id === IDS.pageTechBlog)) return false;

	const users = await db.users.getAll();
	if (!users.some((u: any) => u.id === IDS.creator)) return false;

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
		categoryAssignments: [
			{ treeId: 'subject', categoryIds: ['subj-tech-webdev'] }
		],
		nostrPublicKey: null,
		blossomRef: null,
		syncStatus: 'local',
		exportId: null,
		publishedSnapshot: null,
		publishedAt: null,
		publishedVersion: 0,
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
		categoryAssignments: [
			{ treeId: 'subject', categoryIds: ['subj-politics-intl'] },
			{ treeId: 'content_type', categoryIds: ['ct-format-news'] }
		],
		nostrPublicKey: null,
		blossomRef: null,
		syncStatus: 'local',
		exportId: null,
		publishedSnapshot: null,
		publishedAt: null,
		publishedVersion: 0,
		createdAt: now,
		updatedAt: now
	});

	// ── UserCreator ────────────────────────────────────────────────

	await db.users.put({
		id: IDS.creator,
		role: 'creator',
		displayName: 'Creator Dev',
		nostrKeypair: null,
		syncStatus: 'local',
		createdAt: new Date(),
		updatedAt: new Date()
	});

	// ── Creator Pages (owned by creator user) ──────────────────────

	// Published page — has a snapshot
	const publishedSnapshot = {
		exportId: 'export-mock-001',
		version: 1,
		page: {
			title: 'Dev Curations',
			bio: 'Hand-picked development feeds',
			tags: ['dev', 'curated'],
			avatar: null,
			banner: null,
			categoryAssignments: []
		},
		profiles: [
			{
				title: 'Frontend Sources',
				tags: ['frontend', 'web'],
				avatar: null,
				categoryAssignments: [
					{ treeId: 'subject', categoryIds: ['subj-tech-webdev'] },
					{ treeId: 'content_type', categoryIds: ['ct-format-tutorial'] }
				],
				fonts: [
					{
						title: 'Svelte Blog (Atom)',
						tags: ['svelte'],
						avatar: null,
						protocol: 'atom' as const,
						config: { url: 'https://svelte.dev/blog/rss.xml' },
						categoryAssignments: []
					}
				],
				defaultEnabled: true
			}
		],
		exportedAt: new Date().toISOString()
	};

	await db.creatorPages.put({
		id: IDS.pageCreatorPublished,
		ownerId: IDS.creator,
		title: 'Dev Curations',
		bio: 'Hand-picked development feeds',
		tags: ['dev', 'curated'],
		avatar: null,
		banner: null,
		categoryAssignments: [],
		nostrPublicKey: null,
		blossomRef: null,
		syncStatus: 'local',
		exportId: 'export-mock-001',
		publishedSnapshot,
		publishedAt: now,
		publishedVersion: 1,
		createdAt: now,
		updatedAt: now
	});

	// Draft page — not yet published
	await db.creatorPages.put({
		id: IDS.pageCreatorDraft,
		ownerId: IDS.creator,
		title: 'News Experiment',
		bio: 'Testing news aggregation',
		tags: ['news', 'experiment'],
		avatar: null,
		banner: null,
		categoryAssignments: [],
		nostrPublicKey: null,
		blossomRef: null,
		syncStatus: 'local',
		exportId: null,
		publishedSnapshot: null,
		publishedAt: null,
		publishedVersion: 0,
		createdAt: now,
		updatedAt: now
	});

	// ── Profiles ────────────────────────────────────────────────────

	await db.profiles.put({
		id: IDS.profileTech,
		ownerType: 'consumer',
		ownerId: IDS.consumer,
		creatorPageId: IDS.pageTechBlog,
		sectionId: null,
		title: 'Tech Sources',
		tags: ['tech', 'development'],
		avatar: null,
		categoryAssignments: [
			{ treeId: 'subject', categoryIds: ['subj-tech-webdev', 'subj-tech-ai'] }
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
		sectionId: null,
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
		sectionId: null,
		title: 'Hacker News RSS',
		tags: ['hackernews', 'tech'],
		avatar: null,
		protocol: 'rss',
		config: { url: 'https://hnrss.org/frontpage' },
		categoryAssignments: [
			{ treeId: 'content_type', categoryIds: ['ct-format-news'] }
		],
		defaultEnabled: true,
		createdAt: now,
		updatedAt: now
	});

	await db.fonts.put({
		id: IDS.fontRss2,
		profileId: IDS.profileNews,
		sectionId: null,
		title: 'BBC World RSS',
		tags: ['bbc', 'world'],
		avatar: null,
		protocol: 'rss',
		config: { url: 'http://feeds.bbci.co.uk/news/world/rss.xml' },
		categoryAssignments: [],
		defaultEnabled: true,
		createdAt: now,
		updatedAt: now
	});

	await db.fonts.put({
		id: IDS.fontAtom1,
		profileId: IDS.profileTech,
		sectionId: null,
		title: 'Svelte Blog (Atom)',
		tags: ['svelte', 'framework'],
		avatar: null,
		protocol: 'atom',
		config: { url: 'https://svelte.dev/blog/rss.xml' },
		categoryAssignments: [
			{ treeId: 'content_type', categoryIds: ['ct-format-tutorial'] }
		],
		defaultEnabled: true,
		createdAt: now,
		updatedAt: now
	});

	await db.fonts.put({
		id: IDS.fontNostr1,
		profileId: IDS.profileTech,
		sectionId: null,
		title: 'Nostr Dev Updates',
		tags: ['nostr', 'protocol'],
		avatar: null,
		protocol: 'nostr',
		config: { relays: ['wss://relay.damus.io'], pubkey: 'npub1mockkey000000000000000000000000000000' },
		categoryAssignments: [],
		defaultEnabled: true,
		createdAt: now,
		updatedAt: now
	});

	await db.profiles.put({
		id: IDS.profileSecurity,
		ownerType: 'consumer',
		ownerId: IDS.consumer,
		creatorPageId: IDS.pageTechBlog,
		sectionId: null,
		title: 'Security & Privacy',
		tags: ['security', 'privacy', 'infosec'],
		avatar: null,
		categoryAssignments: [
			{ treeId: 'subject', categoryIds: ['subj-tech-security'] },
			{ treeId: 'content_type', categoryIds: ['ct-format-news', 'ct-format-analysis'] }
		],
		defaultEnabled: true,
		createdAt: now,
		updatedAt: now
	});

	await db.profiles.put({
		id: IDS.profileScienceNews,
		ownerType: 'consumer',
		ownerId: IDS.consumer,
		creatorPageId: IDS.pageNewsDaily,
		sectionId: null,
		title: 'Science & Health',
		tags: ['science', 'health', 'research'],
		avatar: null,
		categoryAssignments: [
			{ treeId: 'subject', categoryIds: ['subj-science', 'subj-health'] },
			{ treeId: 'content_type', categoryIds: ['ct-format-news'] }
		],
		defaultEnabled: true,
		createdAt: now,
		updatedAt: now
	});

	await db.fonts.put({
		id: IDS.fontRss3,
		profileId: IDS.profileSecurity,
		sectionId: null,
		title: 'Krebs on Security',
		tags: ['security', 'infosec'],
		avatar: null,
		protocol: 'rss',
		config: { url: 'https://krebsonsecurity.com/feed/' },
		categoryAssignments: [
			{ treeId: 'content_type', categoryIds: ['ct-format-analysis'] }
		],
		defaultEnabled: true,
		createdAt: now,
		updatedAt: now
	});

	await db.fonts.put({
		id: IDS.fontAtom2,
		profileId: IDS.profileScienceNews,
		sectionId: null,
		title: 'Nature News (Atom)',
		tags: ['science', 'research'],
		avatar: null,
		protocol: 'atom',
		config: { url: 'https://www.nature.com/nature.rss' },
		categoryAssignments: [],
		defaultEnabled: true,
		createdAt: now,
		updatedAt: now
	});

	// ── Creator Profiles ────────────────────────────────────────────

	await db.profiles.put({
		id: IDS.profileCreator1,
		ownerType: 'creator',
		ownerId: IDS.creator,
		creatorPageId: IDS.pageCreatorPublished,
		sectionId: null,
		title: 'Frontend Sources',
		tags: ['frontend', 'web'],
		avatar: null,
		categoryAssignments: [
			{ treeId: 'subject', categoryIds: ['subj-tech-webdev'] },
			{ treeId: 'content_type', categoryIds: ['ct-format-tutorial'] }
		],
		defaultEnabled: true,
		createdAt: now,
		updatedAt: now
	});

	await db.profiles.put({
		id: IDS.profileCreator2,
		ownerType: 'creator',
		ownerId: IDS.creator,
		creatorPageId: IDS.pageCreatorDraft,
		sectionId: null,
		title: 'News Draft Profile',
		tags: ['news'],
		avatar: null,
		categoryAssignments: [
			{ treeId: 'subject', categoryIds: ['subj-politics-intl'] }
		],
		defaultEnabled: true,
		createdAt: now,
		updatedAt: now
	});

	// ── Creator Fonts ───────────────────────────────────────────────

	await db.fonts.put({
		id: IDS.fontCreatorRss1,
		profileId: IDS.profileCreator1,
		sectionId: null,
		title: 'Hacker News (Creator)',
		tags: ['hackernews'],
		avatar: null,
		protocol: 'rss',
		config: { url: 'https://hnrss.org/frontpage' },
		categoryAssignments: [],
		defaultEnabled: true,
		createdAt: now,
		updatedAt: now
	});

	await db.fonts.put({
		id: IDS.fontCreatorAtom1,
		profileId: IDS.profileCreator1,
		sectionId: null,
		title: 'Svelte Blog (Creator)',
		tags: ['svelte'],
		avatar: null,
		protocol: 'atom',
		config: { url: 'https://svelte.dev/blog/rss.xml' },
		categoryAssignments: [],
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
			favoriteTabIds: [] as string[],
			priority: 1 as const,
			favorite: true,
			overriddenAt: now
		},
		{
			userId: IDS.consumer,
			entityType: 'profile' as const,
			entityId: IDS.profileTech,
			enabled: true,
			favoriteTabIds: [] as string[],
			priority: 2 as const,
			favorite: false,
			overriddenAt: now
		},
		{
			userId: IDS.consumer,
			entityType: 'font' as const,
			entityId: IDS.fontRss2,
			enabled: true,
			favoriteTabIds: [] as string[],
			priority: null,
			favorite: false,
			overriddenAt: now
		},
		{
			userId: IDS.consumer,
			entityType: 'font' as const,
			entityId: IDS.fontAtom1,
			enabled: true,
			favoriteTabIds: [] as string[],
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
		},
		{
			id: 'post-011',
			fontId: IDS.fontRss3,
			protocol: 'rss',
			title: 'Critical vulnerability found in widely used SSH library',
			content: 'Researchers disclose a remote code execution flaw affecting millions of servers.',
			url: 'https://krebsonsecurity.com/2026/02/ssh-vuln',
			author: 'Brian Krebs',
			publishedAt: new Date('2026-02-16T09:00:00Z'),
			ingestedAt: now,
			read: false
		},
		{
			id: 'post-012',
			fontId: IDS.fontRss3,
			protocol: 'rss',
			title: 'Ransomware group dismantled by joint law enforcement operation',
			content: 'Europol and FBI coordinate takedown of infrastructure spanning 12 countries.',
			url: 'https://krebsonsecurity.com/2026/02/ransomware-takedown',
			author: 'Brian Krebs',
			publishedAt: new Date('2026-02-15T13:00:00Z'),
			ingestedAt: now,
			read: false
		},
		{
			id: 'post-013',
			fontId: IDS.fontRss3,
			protocol: 'rss',
			title: 'Browser fingerprinting techniques evolve beyond cookies',
			content: 'New research shows canvas and GPU fingerprinting are near-impossible to block.',
			url: 'https://krebsonsecurity.com/2026/02/fingerprinting',
			author: 'Brian Krebs',
			publishedAt: new Date('2026-02-14T17:30:00Z'),
			ingestedAt: now,
			read: true
		},
		{
			id: 'post-014',
			fontId: IDS.fontAtom2,
			protocol: 'atom',
			title: 'Breakthrough in protein folding enables faster drug discovery',
			content: 'AI-assisted models predict novel binding sites with 94% accuracy in trials.',
			url: 'https://nature.com/articles/protein-folding-2026',
			author: 'Nature Editorial',
			publishedAt: new Date('2026-02-16T07:00:00Z'),
			ingestedAt: now,
			read: false
		},
		{
			id: 'post-015',
			fontId: IDS.fontAtom2,
			protocol: 'atom',
			title: 'CRISPR gene editing approved for third hereditary condition',
			content: 'Regulators green-light treatment targeting rare metabolic disorder.',
			url: 'https://nature.com/articles/crispr-approval-2026',
			author: 'Nature Editorial',
			publishedAt: new Date('2026-02-15T11:00:00Z'),
			ingestedAt: now,
			read: false
		},
		{
			id: 'post-016',
			fontId: IDS.fontAtom2,
			protocol: 'atom',
			title: 'Ocean warming accelerates coral bleaching across Indo-Pacific',
			content: 'Satellite data confirms third mass bleaching event in six years.',
			url: 'https://nature.com/articles/coral-bleaching-2026',
			author: 'Nature Editorial',
			publishedAt: new Date('2026-02-14T08:00:00Z'),
			ingestedAt: now,
			read: false
		},
		{
			id: 'post-017',
			fontId: IDS.fontRss1,
			protocol: 'rss',
			title: 'Ask HN: How do you manage secrets in a monorepo?',
			content: 'Discussion on Vault, SOPS, and environment-specific strategies.',
			url: 'https://news.ycombinator.com/item?id=4',
			author: 'repo_architect',
			publishedAt: new Date('2026-02-16T11:00:00Z'),
			ingestedAt: now,
			read: false
		},
		{
			id: 'post-018',
			fontId: IDS.fontAtom1,
			protocol: 'atom',
			title: 'SvelteKit 3.0 testing patterns with Vitest and Playwright',
			content: 'End-to-end and unit testing strategies updated for the new adapter model.',
			url: 'https://svelte.dev/blog/testing-2026',
			author: 'Svelte Team',
			publishedAt: new Date('2026-02-12T14:00:00Z'),
			ingestedAt: now,
			read: false
		},
		{
			id: 'post-019',
			fontId: IDS.fontNostr1,
			protocol: 'nostr',
			title: 'DVMs gain traction as decentralized AI inference layer',
			content: 'Data Vending Machines allow any relay to serve AI tasks over nostr events.',
			url: '',
			author: 'dvm_builder',
			publishedAt: new Date('2026-02-16T05:00:00Z'),
			ingestedAt: now,
			read: false
		},
		{
			id: 'post-020',
			fontId: IDS.fontRss2,
			protocol: 'rss',
			title: 'UN report warns of rising food insecurity in West Africa',
			content: 'Climate shocks and conflict displace over 3 million smallholder farmers.',
			url: 'https://bbc.co.uk/news/world-3',
			author: 'BBC News',
			publishedAt: new Date('2026-02-12T09:30:00Z'),
			ingestedAt: now,
			read: false
		}
	];

	await savePosts(posts);
}

/** Exported IDs for use in tests */
export const MOCK_IDS = IDS;

// New IDs added: profileSecurity, profileScienceNews, fontRss3, fontAtom2, posts 011–020
