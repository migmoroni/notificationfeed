/**
 * Mock Data — seeds the v2 IndexedDB with realistic test data.
 *
 * Uses ContentNode/ContentTree model. Creates:
 * - 1 consumer user (with tree activations + node activations)
 * - 1 creator user
 * - 2 consumer trees (TechBlog, NewsDaily) with profiles + fonts
 * - 2 creator trees (Dev Curations published, News Experiment draft)
 * - 20 posts
 *
 * NOTE: Dev-only utility. Do NOT export from $lib/index.ts.
 */

import type { CanonicalPost } from '$lib/normalization/canonical-post.js';
import type { ContentNode } from '$lib/domain/content-node/content-node.js';
import type { ContentTree } from '$lib/domain/content-tree/content-tree.js';
import type { UserConsumer, TreeActivation, NodeActivation } from '$lib/domain/user/user-consumer.js';
import type { UserCreator } from '$lib/domain/user/user-creator.js';
import type { TreePublication } from '$lib/domain/tree-export/tree-publication.js';
import { getDatabase } from '$lib/persistence/db.js';
import { savePosts } from '$lib/persistence/post.store.js';

// ── Stable IDs ─────────────────────────────────────────────────────────

const IDS = {
	// Users
	consumer: '00000000-0000-0000-0000-000000000001',
	creator: '00000000-0000-0000-0000-000000000002',

	// Consumer trees
	treeTechBlog: '00000000-0000-0000-0000-000000003001',
	treeNewsDaily: '00000000-0000-0000-0000-000000003002',

	// Creator trees
	treeCreatorPublished: '00000000-0000-0000-0000-000000003003',
	treeCreatorDraft: '00000000-0000-0000-0000-000000003004',

	// Creator (root) nodes
	nodeCreatorTechBlog: '00000000-0000-0000-0000-000000009001',
	nodeCreatorNewsDaily: '00000000-0000-0000-0000-000000009002',
	nodeCreatorPublished: '00000000-0000-0000-0000-000000009003',
	nodeCreatorDraft: '00000000-0000-0000-0000-000000009004',

	// Profile nodes
	nodeProfileTech: '00000000-0000-0000-0000-000000004001',
	nodeProfileNews: '00000000-0000-0000-0000-000000004002',
	nodeProfileSecurity: '00000000-0000-0000-0000-000000004005',
	nodeProfileScienceNews: '00000000-0000-0000-0000-000000004006',
	nodeProfileCreator1: '00000000-0000-0000-0000-000000004003',
	nodeProfileCreator2: '00000000-0000-0000-0000-000000004004',

	// Font nodes
	nodeFontRss1: '00000000-0000-0000-0000-000000005001',
	nodeFontRss2: '00000000-0000-0000-0000-000000005002',
	nodeFontAtom1: '00000000-0000-0000-0000-000000005003',
	nodeFontNostr1: '00000000-0000-0000-0000-000000005004',
	nodeFontCreatorRss1: '00000000-0000-0000-0000-000000005005',
	nodeFontCreatorAtom1: '00000000-0000-0000-0000-000000005006',
	nodeFontRss3: '00000000-0000-0000-0000-000000005007',
	nodeFontAtom2: '00000000-0000-0000-0000-000000005008',

	// Tree-path node refs (simple incrementing for unique path names)
	tnRefTech: 'tn-001',
	tnRefNews: 'tn-002',
	tnRefSecurity: 'tn-003',
	tnRefScience: 'tn-004',
	tnRefCreator1: 'tn-005',
	tnRefCreator2: 'tn-006',
	tnRefRss1: 'tn-f01',
	tnRefRss2: 'tn-f02',
	tnRefAtom1: 'tn-f03',
	tnRefNostr1: 'tn-f04',
	tnRefCreatorRss1: 'tn-f05',
	tnRefCreatorAtom1: 'tn-f06',
	tnRefRss3: 'tn-f07',
	tnRefAtom2: 'tn-f08',

	// Root path refs
	tnRefRootTechBlog: 'tn-r01',
	tnRefRootNewsDaily: 'tn-r02',
	tnRefRootPublished: 'tn-r03',
	tnRefRootDraft: 'tn-r04'
} as const;

// ── Seed check ─────────────────────────────────────────────────────────

export async function hasMockData(): Promise<boolean> {
	const db = await getDatabase();
	const users = await db.users.getAll<{ id: string }>();
	if (!users.some((u) => u.id === IDS.creator)) return false;
	const trees = await db.contentTrees.getAll<{ metadata: { id: string } }>();
	if (!trees.some((t) => t.metadata.id === IDS.treeTechBlog)) return false;
	return true;
}

// ── Helpers ─────────────────────────────────────────────────────────────

function makeNode(
	id: string,
	role: ContentNode['role'],
	header: Partial<ContentNode['data']['header']>,
	body: ContentNode['data']['body'],
	author?: string
): ContentNode {
	const now = new Date();
	return {
		role,
		data: {
			header: {
				title: header.title ?? '',
				tags: header.tags ?? [],
				categoryAssignments: header.categoryAssignments ?? [],
				subtitle: header.subtitle,
				summary: header.summary,
				coverMediaId: header.coverMediaId,
				bannerMediaId: header.bannerMediaId,
			},
			body
		},
		metadata: { id, versionSchema: 1, createdAt: now, updatedAt: now, author }
	};
}

function makeTree(
	id: string,
	pathsObj: ContentTree['root']['paths'],
	nodesObj: ContentTree['root']['nodes'],
	sections: ContentTree['sections'],
	author?: string
): ContentTree {
	const now = new Date();
	return {
		root: { paths: pathsObj, nodes: nodesObj },
		sections,
		metadata: { id, versionSchema: 1, createdAt: now, updatedAt: now, author }
	};
}

// ── Seed function ──────────────────────────────────────────────────────

export async function seedMockData(): Promise<void> {
	if (await hasMockData()) return;

	const db = await getDatabase();
	const now = new Date();

	// ── Users ────────────────────────────────────────────────────────

	const consumerUser: UserConsumer = {
		id: IDS.consumer,
		role: 'consumer',
		displayName: 'Dev User',
		activateTrees: [
			{ treeId: IDS.treeTechBlog, activatedAt: now },
			{ treeId: IDS.treeNewsDaily, activatedAt: now }
		],
		activateNodes: [
			{ nodeId: IDS.nodeFontRss1, priority: 1, favorite: true, enabled: true, favoriteTabIds: [] },
			{ nodeId: IDS.nodeProfileTech, priority: 2, favorite: false, enabled: true, favoriteTabIds: [] },
			{ nodeId: IDS.nodeFontRss2, priority: null, favorite: false, enabled: true, favoriteTabIds: [] },
			{ nodeId: IDS.nodeFontAtom1, priority: null, favorite: true, enabled: true, favoriteTabIds: [] }
		],
		favoriteTabs: [],
		createdAt: now,
		updatedAt: now
	};
	await db.users.put(consumerUser);

	const creatorUser: UserCreator = {
		id: IDS.creator,
		role: 'creator',
		displayName: 'Creator Dev',
		nostrKeypair: null,
		syncStatus: 'local',
		createdAt: now,
		updatedAt: now
	};
	await db.users.put(creatorUser);

	// ── Content Nodes ────────────────────────────────────────────────

	// Root creator nodes
	const nodes: ContentNode[] = [
		makeNode(IDS.nodeCreatorTechBlog, 'creator', {
			title: 'TechBlog',
			summary: 'A curated collection of technology feeds',
			tags: ['tech', 'programming', 'web'],
			categoryAssignments: [{ treeId: 'subject', categoryIds: ['subj-tech-webdev'] }]
		}, { role: 'creator' }, IDS.consumer),

		makeNode(IDS.nodeCreatorNewsDaily, 'creator', {
			title: 'NewsDaily',
			summary: 'Daily news from around the world',
			tags: ['news', 'world', 'brazil'],
			categoryAssignments: [
				{ treeId: 'subject', categoryIds: ['subj-politics-intl'] },
				{ treeId: 'content_type', categoryIds: ['ct-format-news'] }
			]
		}, { role: 'creator' }, IDS.consumer),

		makeNode(IDS.nodeCreatorPublished, 'creator', {
			title: 'Dev Curations',
			summary: 'Hand-picked development feeds',
			tags: ['dev', 'curated']
		}, { role: 'creator' }, IDS.creator),

		makeNode(IDS.nodeCreatorDraft, 'creator', {
			title: 'News Experiment',
			summary: 'Testing news aggregation',
			tags: ['news', 'experiment']
		}, { role: 'creator' }, IDS.creator),

		// Profile nodes
		makeNode(IDS.nodeProfileTech, 'profile', {
			title: 'Tech Sources',
			tags: ['tech', 'development'],
			categoryAssignments: [
				{ treeId: 'subject', categoryIds: ['subj-tech-webdev', 'subj-tech-ai'] }
			]
		}, { role: 'profile', defaultEnabled: true }, IDS.consumer),

		makeNode(IDS.nodeProfileNews, 'profile', {
			title: 'News Sources',
			tags: ['news', 'world'],
			categoryAssignments: [
				{ treeId: 'subject', categoryIds: ['subj-politics-intl'] },
				{ treeId: 'content_type', categoryIds: ['ct-format-news'] }
			]
		}, { role: 'profile', defaultEnabled: true }, IDS.consumer),

		makeNode(IDS.nodeProfileSecurity, 'profile', {
			title: 'Security & Privacy',
			tags: ['security', 'privacy', 'infosec'],
			categoryAssignments: [
				{ treeId: 'subject', categoryIds: ['subj-tech-security'] },
				{ treeId: 'content_type', categoryIds: ['ct-format-news', 'ct-format-analysis'] }
			]
		}, { role: 'profile', defaultEnabled: true }, IDS.consumer),

		makeNode(IDS.nodeProfileScienceNews, 'profile', {
			title: 'Science & Health',
			tags: ['science', 'health', 'research'],
			categoryAssignments: [
				{ treeId: 'subject', categoryIds: ['subj-science', 'subj-health'] },
				{ treeId: 'content_type', categoryIds: ['ct-format-news'] }
			]
		}, { role: 'profile', defaultEnabled: true }, IDS.consumer),

		makeNode(IDS.nodeProfileCreator1, 'profile', {
			title: 'Frontend Sources',
			tags: ['frontend', 'web'],
			categoryAssignments: [
				{ treeId: 'subject', categoryIds: ['subj-tech-webdev'] },
				{ treeId: 'content_type', categoryIds: ['ct-format-tutorial'] }
			]
		}, { role: 'profile', defaultEnabled: true }, IDS.creator),

		makeNode(IDS.nodeProfileCreator2, 'profile', {
			title: 'News Draft Profile',
			tags: ['news'],
			categoryAssignments: [
				{ treeId: 'subject', categoryIds: ['subj-politics-intl'] }
			]
		}, { role: 'profile', defaultEnabled: true }, IDS.creator),

		// Font nodes
		makeNode(IDS.nodeFontRss1, 'font', {
			title: 'Hacker News RSS',
			tags: ['hackernews', 'tech'],
			categoryAssignments: [{ treeId: 'content_type', categoryIds: ['ct-format-news'] }]
		}, { role: 'font', protocol: 'rss', config: { url: 'https://hnrss.org/frontpage' }, defaultEnabled: true }, IDS.consumer),

		makeNode(IDS.nodeFontRss2, 'font', {
			title: 'BBC World RSS',
			tags: ['bbc', 'world']
		}, { role: 'font', protocol: 'rss', config: { url: 'http://feeds.bbci.co.uk/news/world/rss.xml' }, defaultEnabled: true }, IDS.consumer),

		makeNode(IDS.nodeFontAtom1, 'font', {
			title: 'Svelte Blog (Atom)',
			tags: ['svelte', 'framework'],
			categoryAssignments: [{ treeId: 'content_type', categoryIds: ['ct-format-tutorial'] }]
		}, { role: 'font', protocol: 'atom', config: { url: 'https://svelte.dev/blog/rss.xml' }, defaultEnabled: true }, IDS.consumer),

		makeNode(IDS.nodeFontNostr1, 'font', {
			title: 'Nostr Dev Updates',
			tags: ['nostr', 'protocol']
		}, { role: 'font', protocol: 'nostr', config: { pubkey: 'npub1mockkey000000000000000000000000000000', relays: ['wss://relay.damus.io'] }, defaultEnabled: true }, IDS.consumer),

		makeNode(IDS.nodeFontRss3, 'font', {
			title: 'Krebs on Security',
			tags: ['security', 'infosec'],
			categoryAssignments: [{ treeId: 'content_type', categoryIds: ['ct-format-analysis'] }]
		}, { role: 'font', protocol: 'rss', config: { url: 'https://krebsonsecurity.com/feed/' }, defaultEnabled: true }, IDS.consumer),

		makeNode(IDS.nodeFontAtom2, 'font', {
			title: 'Nature News (Atom)',
			tags: ['science', 'research']
		}, { role: 'font', protocol: 'atom', config: { url: 'https://www.nature.com/nature.rss' }, defaultEnabled: true }, IDS.consumer),

		makeNode(IDS.nodeFontCreatorRss1, 'font', {
			title: 'Hacker News (Creator)',
			tags: ['hackernews']
		}, { role: 'font', protocol: 'rss', config: { url: 'https://hnrss.org/frontpage' }, defaultEnabled: true }, IDS.creator),

		makeNode(IDS.nodeFontCreatorAtom1, 'font', {
			title: 'Svelte Blog (Creator)',
			tags: ['svelte']
		}, { role: 'font', protocol: 'atom', config: { url: 'https://svelte.dev/blog/rss.xml' }, defaultEnabled: true }, IDS.creator),
	];

	for (const node of nodes) {
		await db.contentNodes.put(node);
	}

	// ── Content Trees ────────────────────────────────────────────────

	// TechBlog tree (consumer): root=creatorTechBlog -> /tech-sources -> /tech-sources/hn-rss, /tech-sources/svelte-atom, /tech-sources/nostr-dev; /security -> /security/krebs
	const treeTechBlog = makeTree(
		IDS.treeTechBlog,
		{
			'/': { node: IDS.tnRefRootTechBlog },
			'/tech-sources': { node: IDS.tnRefTech },
			'/tech-sources/hn-rss': { node: IDS.tnRefRss1 },
			'/tech-sources/svelte-atom': { node: IDS.tnRefAtom1 },
			'/tech-sources/nostr-dev': { node: IDS.tnRefNostr1 },
			'/security': { node: IDS.tnRefSecurity },
			'/security/krebs': { node: IDS.tnRefRss3 }
		},
		{
			[IDS.tnRefRootTechBlog]: { '/': IDS.nodeCreatorTechBlog },
			[IDS.tnRefTech]: { '/': IDS.nodeProfileTech },
			[IDS.tnRefRss1]: { '/': IDS.nodeFontRss1 },
			[IDS.tnRefAtom1]: { '/': IDS.nodeFontAtom1 },
			[IDS.tnRefNostr1]: { '/': IDS.nodeFontNostr1 },
			[IDS.tnRefSecurity]: { '/': IDS.nodeProfileSecurity },
			[IDS.tnRefRss3]: { '/': IDS.nodeFontRss3 }
		},
		[],
		IDS.consumer
	);

	// NewsDaily tree (consumer): root=creatorNewsDaily -> /news-sources -> /news-sources/bbc-rss; /science -> /science/nature-atom
	const treeNewsDaily = makeTree(
		IDS.treeNewsDaily,
		{
			'/': { node: IDS.tnRefRootNewsDaily },
			'/news-sources': { node: IDS.tnRefNews },
			'/news-sources/bbc-rss': { node: IDS.tnRefRss2 },
			'/science': { node: IDS.tnRefScience },
			'/science/nature-atom': { node: IDS.tnRefAtom2 }
		},
		{
			[IDS.tnRefRootNewsDaily]: { '/': IDS.nodeCreatorNewsDaily },
			[IDS.tnRefNews]: { '/': IDS.nodeProfileNews },
			[IDS.tnRefRss2]: { '/': IDS.nodeFontRss2 },
			[IDS.tnRefScience]: { '/': IDS.nodeProfileScienceNews },
			[IDS.tnRefAtom2]: { '/': IDS.nodeFontAtom2 }
		},
		[],
		IDS.consumer
	);

	// Creator published tree: root=creatorPublished -> /frontend -> /frontend/hn, /frontend/svelte
	const treeCreatorPublished = makeTree(
		IDS.treeCreatorPublished,
		{
			'/': { node: IDS.tnRefRootPublished },
			'/frontend': { node: IDS.tnRefCreator1 },
			'/frontend/hn-creator': { node: IDS.tnRefCreatorRss1 },
			'/frontend/svelte-creator': { node: IDS.tnRefCreatorAtom1 }
		},
		{
			[IDS.tnRefRootPublished]: { '/': IDS.nodeCreatorPublished },
			[IDS.tnRefCreator1]: { '/': IDS.nodeProfileCreator1 },
			[IDS.tnRefCreatorRss1]: { '/': IDS.nodeFontCreatorRss1 },
			[IDS.tnRefCreatorAtom1]: { '/': IDS.nodeFontCreatorAtom1 }
		},
		[],
		IDS.creator
	);

	// Creator draft tree: root=creatorDraft -> /news-draft
	const treeCreatorDraft = makeTree(
		IDS.treeCreatorDraft,
		{
			'/': { node: IDS.tnRefRootDraft },
			'/news-draft': { node: IDS.tnRefCreator2 }
		},
		{
			[IDS.tnRefRootDraft]: { '/': IDS.nodeCreatorDraft },
			[IDS.tnRefCreator2]: { '/': IDS.nodeProfileCreator2 }
		},
		[],
		IDS.creator
	);

	for (const tree of [treeTechBlog, treeNewsDaily, treeCreatorPublished, treeCreatorDraft]) {
		await db.contentTrees.put(tree);
	}

	// ── Tree Publication (for the published creator tree) ────────────

	const publication: TreePublication = {
		treeId: IDS.treeCreatorPublished,
		version: 1,
		snapshot: {
			exportId: 'export-mock-001',
			version: 1,
			creatorDisplayName: 'Creator Dev',
			tree: treeCreatorPublished,
			nodes: nodes.filter((n) =>
				([IDS.nodeCreatorPublished, IDS.nodeProfileCreator1, IDS.nodeFontCreatorRss1, IDS.nodeFontCreatorAtom1] as string[]).includes(n.metadata.id)
			),
			medias: [],
			exportedAt: now
		},
		publishedAt: now
	};
	await db.treePublications.put(publication);

	// ── Posts (v2: nodeId instead of fontId) ─────────────────────────

	const posts: CanonicalPost[] = [
		{ id: 'post-001', nodeId: IDS.nodeFontRss1, protocol: 'rss', title: 'Show HN: A new approach to state management in Svelte 5', content: 'Runes provide fine-grained reactivity without stores.', url: 'https://news.ycombinator.com/item?id=1', author: 'svelte_dev', publishedAt: new Date('2026-02-16T10:00:00Z'), ingestedAt: now, read: false },
		{ id: 'post-002', nodeId: IDS.nodeFontRss1, protocol: 'rss', title: 'TypeScript 6.0 brings module isolation improvements', content: 'The latest TypeScript release focuses on performance.', url: 'https://news.ycombinator.com/item?id=2', author: 'ts_enthusiast', publishedAt: new Date('2026-02-15T14:30:00Z'), ingestedAt: now, read: false },
		{ id: 'post-003', nodeId: IDS.nodeFontRss2, protocol: 'rss', title: 'World leaders gather for climate summit', content: 'Representatives from 190 countries meet in Geneva.', url: 'https://bbc.co.uk/news/world-1', author: 'BBC News', publishedAt: new Date('2026-02-16T08:00:00Z'), ingestedAt: now, read: false },
		{ id: 'post-004', nodeId: IDS.nodeFontRss2, protocol: 'rss', title: 'Brazil announces new digital infrastructure plan', content: 'Government invests in broadband expansion nationwide.', url: 'https://bbc.co.uk/news/world-2', author: 'BBC News', publishedAt: new Date('2026-02-15T16:00:00Z'), ingestedAt: now, read: true },
		{ id: 'post-005', nodeId: IDS.nodeFontAtom1, protocol: 'atom', title: 'Svelte 5.1 released with improved server-side rendering', content: 'The Svelte team ships streaming SSR and better hydration.', url: 'https://svelte.dev/blog/svelte-5-1', author: 'Svelte Team', publishedAt: new Date('2026-02-14T12:00:00Z'), ingestedAt: now, read: false },
		{ id: 'post-006', nodeId: IDS.nodeFontAtom1, protocol: 'atom', title: 'Building accessible forms with Svelte and shadcn-svelte', content: 'A practical guide to form validation and accessibility.', url: 'https://svelte.dev/blog/forms', author: 'Svelte Team', publishedAt: new Date('2026-02-13T09:00:00Z'), ingestedAt: now, read: false },
		{ id: 'post-007', nodeId: IDS.nodeFontNostr1, protocol: 'nostr', title: 'NIP-29: Relay-based groups proposal finalized', content: 'The community converges on a standard for group chats.', url: '', author: 'nostr_dev', publishedAt: new Date('2026-02-16T06:00:00Z'), ingestedAt: now, read: false },
		{ id: 'post-008', nodeId: IDS.nodeFontNostr1, protocol: 'nostr', title: 'Blossom storage integration for media-rich notes', content: 'Upload images and videos using decentralized storage.', url: '', author: 'blossom_builder', publishedAt: new Date('2026-02-15T20:00:00Z'), ingestedAt: now, read: false },
		{ id: 'post-009', nodeId: IDS.nodeFontRss1, protocol: 'rss', title: 'Vite 7 ships with improved cold start performance', content: 'Build times drop by 40% thanks to new bundling strategies.', url: 'https://news.ycombinator.com/item?id=3', author: 'build_tools', publishedAt: new Date('2026-02-14T18:00:00Z'), ingestedAt: now, read: true },
		{ id: 'post-010', nodeId: IDS.nodeFontRss2, protocol: 'rss', title: 'New study reveals impact of screen time on children', content: 'Researchers find nuanced effects depending on content type.', url: 'https://bbc.co.uk/news/health-1', author: 'BBC News', publishedAt: new Date('2026-02-13T11:00:00Z'), ingestedAt: now, read: false },
		{ id: 'post-011', nodeId: IDS.nodeFontRss3, protocol: 'rss', title: 'Critical vulnerability found in widely used SSH library', content: 'Researchers disclose a remote code execution flaw affecting millions of servers.', url: 'https://krebsonsecurity.com/2026/02/ssh-vuln', author: 'Brian Krebs', publishedAt: new Date('2026-02-16T09:00:00Z'), ingestedAt: now, read: false },
		{ id: 'post-012', nodeId: IDS.nodeFontRss3, protocol: 'rss', title: 'Ransomware group dismantled by joint law enforcement operation', content: 'Europol and FBI coordinate takedown of infrastructure spanning 12 countries.', url: 'https://krebsonsecurity.com/2026/02/ransomware-takedown', author: 'Brian Krebs', publishedAt: new Date('2026-02-15T13:00:00Z'), ingestedAt: now, read: false },
		{ id: 'post-013', nodeId: IDS.nodeFontRss3, protocol: 'rss', title: 'Browser fingerprinting techniques evolve beyond cookies', content: 'New research shows canvas and GPU fingerprinting are near-impossible to block.', url: 'https://krebsonsecurity.com/2026/02/fingerprinting', author: 'Brian Krebs', publishedAt: new Date('2026-02-14T17:30:00Z'), ingestedAt: now, read: true },
		{ id: 'post-014', nodeId: IDS.nodeFontAtom2, protocol: 'atom', title: 'Breakthrough in protein folding enables faster drug discovery', content: 'AI-assisted models predict novel binding sites with 94% accuracy in trials.', url: 'https://nature.com/articles/protein-folding-2026', author: 'Nature Editorial', publishedAt: new Date('2026-02-16T07:00:00Z'), ingestedAt: now, read: false },
		{ id: 'post-015', nodeId: IDS.nodeFontAtom2, protocol: 'atom', title: 'CRISPR gene editing approved for third hereditary condition', content: 'Regulators green-light treatment targeting rare metabolic disorder.', url: 'https://nature.com/articles/crispr-approval-2026', author: 'Nature Editorial', publishedAt: new Date('2026-02-15T11:00:00Z'), ingestedAt: now, read: false },
		{ id: 'post-016', nodeId: IDS.nodeFontAtom2, protocol: 'atom', title: 'Ocean warming accelerates coral bleaching across Indo-Pacific', content: 'Satellite data confirms third mass bleaching event in six years.', url: 'https://nature.com/articles/coral-bleaching-2026', author: 'Nature Editorial', publishedAt: new Date('2026-02-14T08:00:00Z'), ingestedAt: now, read: false },
		{ id: 'post-017', nodeId: IDS.nodeFontRss1, protocol: 'rss', title: 'Ask HN: How do you manage secrets in a monorepo?', content: 'Discussion on Vault, SOPS, and environment-specific strategies.', url: 'https://news.ycombinator.com/item?id=4', author: 'repo_architect', publishedAt: new Date('2026-02-16T11:00:00Z'), ingestedAt: now, read: false },
		{ id: 'post-018', nodeId: IDS.nodeFontAtom1, protocol: 'atom', title: 'SvelteKit 3.0 testing patterns with Vitest and Playwright', content: 'End-to-end and unit testing strategies updated for the new adapter model.', url: 'https://svelte.dev/blog/testing-2026', author: 'Svelte Team', publishedAt: new Date('2026-02-12T14:00:00Z'), ingestedAt: now, read: false },
		{ id: 'post-019', nodeId: IDS.nodeFontNostr1, protocol: 'nostr', title: 'DVMs gain traction as decentralized AI inference layer', content: 'Data Vending Machines allow any relay to serve AI tasks over nostr events.', url: '', author: 'dvm_builder', publishedAt: new Date('2026-02-16T05:00:00Z'), ingestedAt: now, read: false },
		{ id: 'post-020', nodeId: IDS.nodeFontRss2, protocol: 'rss', title: 'UN report warns of rising food insecurity in West Africa', content: 'Climate shocks and conflict displace over 3 million smallholder farmers.', url: 'https://bbc.co.uk/news/world-3', author: 'BBC News', publishedAt: new Date('2026-02-12T09:30:00Z'), ingestedAt: now, read: false }
	];

	await savePosts(posts);
}

/** Exported IDs for use in tests */
export const MOCK_IDS = IDS;
