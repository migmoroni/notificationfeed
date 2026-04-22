/**
 * Mock Data — seeds the v2 IndexedDB with realistic test data.
 *
 * Uses embedded TreeNode inside ContentTree model. Creates:
 * - 1 consumer user (with tree activations + node activations)
 * - 1 creator user
 * - 4 profile trees (Tech Sources, Security, News Sources, Science & Health)
 *   each with root=profile and font nodes inside
 * - 2 creator trees (TechBlog, NewsDaily) with root=creator and tree-link
 *   nodes referencing the profile trees
 * - 2 creator-authored trees (Dev Curations published, News Experiment draft)
 * - 20 posts
 *
 * NOTE: Dev-only utility. Do NOT export from $lib/index.ts.
 */

import type { CanonicalPost } from '$lib/normalization/canonical-post.js';
import type {
ContentTree,
TreeNode,
NodeHeader,
NodeBody,
TreePaths,
TreeSection,
} from '$lib/domain/content-tree/content-tree.js';
import { generateNodeId } from '$lib/domain/content-tree/content-tree.js';
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

// Profile trees (each profile is its own tree)
treeProfileTech: '00000000-0000-0000-0000-000000003010',
treeProfileSecurity: '00000000-0000-0000-0000-000000003011',
treeProfileNews: '00000000-0000-0000-0000-000000003012',
treeProfileScience: '00000000-0000-0000-0000-000000003013',
treeProfileFrontend: '00000000-0000-0000-0000-000000003014',
treeProfileNewsDraft: '00000000-0000-0000-0000-000000003015',

// Creator trees (aggregate profile trees via tree-link nodes)
treeTechBlog: '00000000-0000-0000-0000-000000003001',
treeNewsDaily: '00000000-0000-0000-0000-000000003002',
treeCreatorPublished: '00000000-0000-0000-0000-000000003003',
treeCreatorDraft: '00000000-0000-0000-0000-000000003004',

// Local UUIDs for node generation
localRoot: '00000000-0000-0000-0000-000000009000',
localTreeLink1: '00000000-0000-0000-0000-00000000a001',
localTreeLink2: '00000000-0000-0000-0000-00000000a002',
localFontRss1: '00000000-0000-0000-0000-000000005001',
localFontRss2: '00000000-0000-0000-0000-000000005002',
localFontAtom1: '00000000-0000-0000-0000-000000005003',
localFontNostr1: '00000000-0000-0000-0000-000000005004',
localFontRss3: '00000000-0000-0000-0000-000000005007',
localFontAtom2: '00000000-0000-0000-0000-000000005008',
localFontCreatorRss1: '00000000-0000-0000-0000-000000005005',
localFontCreatorAtom1: '00000000-0000-0000-0000-000000005006',
} as const;

// ── Composite nodeIds ───────────────────────────────────────────────────

// Profile tree: Tech Sources
const PT = {
root: generateNodeId(IDS.treeProfileTech, IDS.localRoot),
fontRss1: generateNodeId(IDS.treeProfileTech, IDS.localFontRss1),
fontAtom1: generateNodeId(IDS.treeProfileTech, IDS.localFontAtom1),
fontNostr1: generateNodeId(IDS.treeProfileTech, IDS.localFontNostr1),
};

// Profile tree: Security & Privacy
const PS = {
root: generateNodeId(IDS.treeProfileSecurity, IDS.localRoot),
fontRss3: generateNodeId(IDS.treeProfileSecurity, IDS.localFontRss3),
};

// Profile tree: News Sources
const PN = {
root: generateNodeId(IDS.treeProfileNews, IDS.localRoot),
fontRss2: generateNodeId(IDS.treeProfileNews, IDS.localFontRss2),
};

// Profile tree: Science & Health
const PH = {
root: generateNodeId(IDS.treeProfileScience, IDS.localRoot),
fontAtom2: generateNodeId(IDS.treeProfileScience, IDS.localFontAtom2),
};

// Profile tree: Frontend Sources (creator-authored)
const PF = {
root: generateNodeId(IDS.treeProfileFrontend, IDS.localRoot),
fontRss1: generateNodeId(IDS.treeProfileFrontend, IDS.localFontCreatorRss1),
fontAtom1: generateNodeId(IDS.treeProfileFrontend, IDS.localFontCreatorAtom1),
};

// Profile tree: News Draft (creator-authored)
const PD = {
root: generateNodeId(IDS.treeProfileNewsDraft, IDS.localRoot),
};

// Creator tree: TechBlog (links to PT + PS)
const TB = {
root: generateNodeId(IDS.treeTechBlog, IDS.localRoot),
linkTech: generateNodeId(IDS.treeTechBlog, IDS.localTreeLink1),
linkSecurity: generateNodeId(IDS.treeTechBlog, IDS.localTreeLink2),
};

// Creator tree: NewsDaily (links to PN + PH)
const ND = {
root: generateNodeId(IDS.treeNewsDaily, IDS.localRoot),
linkNews: generateNodeId(IDS.treeNewsDaily, IDS.localTreeLink1),
linkScience: generateNodeId(IDS.treeNewsDaily, IDS.localTreeLink2),
};

// Creator tree: Dev Curations (published, links to PF)
const CP = {
root: generateNodeId(IDS.treeCreatorPublished, IDS.localRoot),
linkFrontend: generateNodeId(IDS.treeCreatorPublished, IDS.localTreeLink1),
};

// Creator tree: News Experiment (draft, links to PD)
const CD = {
root: generateNodeId(IDS.treeCreatorDraft, IDS.localRoot),
linkNews: generateNodeId(IDS.treeCreatorDraft, IDS.localTreeLink1),
};

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
nodeId: string,
role: TreeNode['role'],
header: Partial<NodeHeader>,
body: NodeBody
): TreeNode {
const now = new Date();
return {
role,
data: {
header: {
title: header.title ?? '',
categoryAssignments: header.categoryAssignments ?? [],
subtitle: header.subtitle,
summary: header.summary,
coverMediaId: header.coverMediaId,
bannerMediaId: header.bannerMediaId,
},
body
},
metadata: { id: nodeId, versionSchema: 1, createdAt: now, updatedAt: now }
};
}

function makeTree(
id: string,
nodes: Record<string, TreeNode>,
paths: TreePaths,
sections: TreeSection[],
author?: string
): ContentTree {
const now = new Date();
return {
nodes,
paths,
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
profileImage: null,
profileEmoji: null,
removedAt: null,
language: 'en-US',
activateTrees: [],
activateNodes: [],
favoriteTabs: [],
feedMacros: [],
createdAt: now,
updatedAt: now
};
await db.users.put(consumerUser);

const creatorUser: UserCreator = {
id: IDS.creator,
role: 'creator',
displayName: 'Creator Dev',
profileImage: null,
profileEmoji: null,
removedAt: null,
language: 'en-US',
ownedTreeIds: [IDS.treeProfileFrontend, IDS.treeProfileNewsDraft, IDS.treeCreatorPublished, IDS.treeCreatorDraft],
ownedMediaIds: [],
createdAt: now,
updatedAt: now
};
await db.users.put(creatorUser);

// ── Profile Trees (each has root=profile + font nodes) ─────────

const treeProfileTech = makeTree(
IDS.treeProfileTech,
{
[PT.root]: makeNode(PT.root, 'profile', {
title: 'Tech Sources',
categoryAssignments: [
{ treeId: 'subject', categoryIds: ['anaaa', 'anaab'] }
]
}, { role: 'profile', links: [] }),

[PT.fontRss1]: makeNode(PT.fontRss1, 'font', {
title: 'Hacker News RSS',
categoryAssignments: [{ treeId: 'content_type', categoryIds: ['baaac'] }]
}, { role: 'font', protocol: 'rss', config: { url: 'https://hnrss.org/frontpage' }, defaultEnabled: true }),

[PT.fontAtom1]: makeNode(PT.fontAtom1, 'font', {
title: 'Svelte Blog (Atom)',
categoryAssignments: [{ treeId: 'content_type', categoryIds: ['baaac'] }]
}, { role: 'font', protocol: 'atom', config: { url: 'https://svelte.dev/blog/rss.xml' }, defaultEnabled: true }),

[PT.fontNostr1]: makeNode(PT.fontNostr1, 'font', {
title: 'Nostr Dev Updates',
}, { role: 'font', protocol: 'nostr', config: { pubkey: 'npub1mockkey000000000000000000000000000000', relays: ['wss://relay.damus.io'] }, defaultEnabled: true }),
},
{ '/': PT.root, '*': [PT.fontRss1, PT.fontAtom1, PT.fontNostr1] },
[],
IDS.consumer
);

const treeProfileSecurity = makeTree(
IDS.treeProfileSecurity,
{
[PS.root]: makeNode(PS.root, 'profile', {
title: 'Security & Privacy',
categoryAssignments: [
{ treeId: 'subject', categoryIds: ['anaak'] },
{ treeId: 'content_type', categoryIds: ['baaac', 'baaad'] }
]
}, { role: 'profile', links: [] }),

[PS.fontRss3]: makeNode(PS.fontRss3, 'font', {
title: 'Krebs on Security',
categoryAssignments: [{ treeId: 'content_type', categoryIds: ['baaac'] }]
}, { role: 'font', protocol: 'rss', config: { url: 'https://krebsonsecurity.com/feed/' }, defaultEnabled: true }),
},
{ '/': PS.root, '*': [PS.fontRss3] },
[],
IDS.consumer
);

const treeProfileNews = makeTree(
IDS.treeProfileNews,
{
[PN.root]: makeNode(PN.root, 'profile', {
title: 'News Sources',
categoryAssignments: [
{ treeId: 'subject', categoryIds: ['alaae'] },
{ treeId: 'content_type', categoryIds: ['baaac'] }
]
}, { role: 'profile', links: [] }),

[PN.fontRss2]: makeNode(PN.fontRss2, 'font', {
title: 'BBC World RSS',
}, { role: 'font', protocol: 'rss', config: { url: 'http://feeds.bbci.co.uk/news/world/rss.xml' }, defaultEnabled: true }),
},
{ '/': PN.root, '*': [PN.fontRss2] },
[],
IDS.consumer
);

const treeProfileScience = makeTree(
IDS.treeProfileScience,
{
[PH.root]: makeNode(PH.root, 'profile', {
title: 'Science & Health',
categoryAssignments: [
{ treeId: 'subject', categoryIds: ['an', 'ah'] },
{ treeId: 'content_type', categoryIds: ['baaac'] }
]
}, { role: 'profile', links: [] }),

[PH.fontAtom2]: makeNode(PH.fontAtom2, 'font', {
title: 'Nature News (Atom)',
}, { role: 'font', protocol: 'atom', config: { url: 'https://www.nature.com/nature.rss' }, defaultEnabled: true }),
},
{ '/': PH.root, '*': [PH.fontAtom2] },
[],
IDS.consumer
);

const treeProfileFrontend = makeTree(
IDS.treeProfileFrontend,
{
[PF.root]: makeNode(PF.root, 'profile', {
title: 'Frontend Sources',
categoryAssignments: [
{ treeId: 'subject', categoryIds: ['anaaa'] },
{ treeId: 'content_type', categoryIds: ['baaac'] }
]
}, { role: 'profile', links: [] }),

[PF.fontRss1]: makeNode(PF.fontRss1, 'font', {
title: 'Hacker News (Creator)',
}, { role: 'font', protocol: 'rss', config: { url: 'https://hnrss.org/frontpage' }, defaultEnabled: true }),

[PF.fontAtom1]: makeNode(PF.fontAtom1, 'font', {
title: 'Svelte Blog (Creator)',
}, { role: 'font', protocol: 'atom', config: { url: 'https://svelte.dev/blog/rss.xml' }, defaultEnabled: true }),
},
{ '/': PF.root, '*': [PF.fontRss1, PF.fontAtom1] },
[],
IDS.creator
);

const treeProfileNewsDraft = makeTree(
IDS.treeProfileNewsDraft,
{
[PD.root]: makeNode(PD.root, 'profile', {
title: 'News Draft Profile',
categoryAssignments: [
{ treeId: 'subject', categoryIds: ['alaae'] }
]
}, { role: 'profile', links: [] }),
},
{ '/': PD.root, '*': [] },
[],
IDS.creator
);

// ── Creator Trees (root=creator + tree-link nodes) ──────────────

const techSourcesSectionId = 'sec-tech';
const securitySectionId = 'sec-security';

const treeTechBlog = makeTree(
IDS.treeTechBlog,
{
[TB.root]: makeNode(TB.root, 'creator', {
title: 'TechBlog',
summary: 'A curated collection of technology feeds',
categoryAssignments: [{ treeId: 'subject', categoryIds: ['anaaa'] }]
}, { role: 'creator', links: [] }),

[TB.linkTech]: makeNode(TB.linkTech, 'tree', {
title: 'Tech Sources',
}, { role: 'tree', instanceTreeId: IDS.treeProfileTech }),

[TB.linkSecurity]: makeNode(TB.linkSecurity, 'tree', {
title: 'Security & Privacy',
}, { role: 'tree', instanceTreeId: IDS.treeProfileSecurity }),
},
{
'/': TB.root,
'*': [],
[techSourcesSectionId]: [TB.linkTech],
[securitySectionId]: [TB.linkSecurity],
},
[
{ id: techSourcesSectionId, order: 0, title: 'Tech Sources', hideTitle: false, color: '#3b82f6' },
{ id: securitySectionId, order: 1, title: 'Security', hideTitle: false, color: '#ef4444' },
],
IDS.consumer
);

const newsSectionId = 'sec-news';
const scienceSectionId = 'sec-science';

const treeNewsDaily = makeTree(
IDS.treeNewsDaily,
{
[ND.root]: makeNode(ND.root, 'creator', {
title: 'NewsDaily',
summary: 'Daily news from around the world',
categoryAssignments: [
{ treeId: 'subject', categoryIds: ['alaae'] },
{ treeId: 'content_type', categoryIds: ['baaac'] }
]
}, { role: 'creator', links: [] }),

[ND.linkNews]: makeNode(ND.linkNews, 'tree', {
title: 'News Sources',
}, { role: 'tree', instanceTreeId: IDS.treeProfileNews }),

[ND.linkScience]: makeNode(ND.linkScience, 'tree', {
title: 'Science & Health',
}, { role: 'tree', instanceTreeId: IDS.treeProfileScience }),
},
{
'/': ND.root,
'*': [],
[newsSectionId]: [ND.linkNews],
[scienceSectionId]: [ND.linkScience],
},
[
{ id: newsSectionId, order: 0, title: 'News Sources', hideTitle: false, color: '#f59e0b' },
{ id: scienceSectionId, order: 1, title: 'Science', hideTitle: false, color: '#10b981' },
],
IDS.consumer
);

const frontendSectionId = 'sec-frontend';

const treeCreatorPublished = makeTree(
IDS.treeCreatorPublished,
{
[CP.root]: makeNode(CP.root, 'creator', {
title: 'Dev Curations',
summary: 'Hand-picked development feeds',
}, { role: 'creator', links: [] }),

[CP.linkFrontend]: makeNode(CP.linkFrontend, 'tree', {
title: 'Frontend Sources',
}, { role: 'tree', instanceTreeId: IDS.treeProfileFrontend }),
},
{
'/': CP.root,
'*': [],
[frontendSectionId]: [CP.linkFrontend],
},
[
{ id: frontendSectionId, order: 0, title: 'Frontend', hideTitle: false, color: '#8b5cf6' },
],
IDS.creator
);

const treeCreatorDraft = makeTree(
IDS.treeCreatorDraft,
{
[CD.root]: makeNode(CD.root, 'creator', {
title: 'News Experiment',
summary: 'Testing news aggregation',
}, { role: 'creator', links: [] }),

[CD.linkNews]: makeNode(CD.linkNews, 'tree', {
title: 'News Draft Profile',
}, { role: 'tree', instanceTreeId: IDS.treeProfileNewsDraft }),
},
{
'/': CD.root,
'*': [CD.linkNews],
},
[],
IDS.creator
);

const allTrees = [
treeProfileTech, treeProfileSecurity, treeProfileNews, treeProfileScience,
treeProfileFrontend, treeProfileNewsDraft,
treeTechBlog, treeNewsDaily, treeCreatorPublished, treeCreatorDraft
];
for (const tree of allTrees) {
await db.contentTrees.put(tree);
}

// Also persist creator-owned trees in the editor store
const creatorOwnedTrees = allTrees.filter((t) => t.metadata.author === IDS.creator);
for (const tree of creatorOwnedTrees) {
await db.editorTrees.put(tree);
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
medias: [],
exportedAt: now
},
publishedAt: now
};
await db.treePublications.put(publication);

// ── Posts (nodeId uses font composite IDs from profile trees) ────

const posts: CanonicalPost[] = [
{ id: 'post-001', nodeId: PT.fontRss1, protocol: 'rss', title: 'Show HN: A new approach to state management in Svelte 5', content: 'Runes provide fine-grained reactivity without stores.', url: 'https://news.ycombinator.com/item?id=1', author: 'svelte_dev', publishedAt: new Date('2026-02-16T10:00:00Z'), ingestedAt: now, read: false },
{ id: 'post-002', nodeId: PT.fontRss1, protocol: 'rss', title: 'TypeScript 6.0 brings module isolation improvements', content: 'The latest TypeScript release focuses on performance.', url: 'https://news.ycombinator.com/item?id=2', author: 'ts_enthusiast', publishedAt: new Date('2026-02-15T14:30:00Z'), ingestedAt: now, read: false },
{ id: 'post-003', nodeId: PN.fontRss2, protocol: 'rss', title: 'World leaders gather for climate summit', content: 'Representatives from 190 countries meet in Geneva.', url: 'https://bbc.co.uk/news/world-1', author: 'BBC News', publishedAt: new Date('2026-02-16T08:00:00Z'), ingestedAt: now, read: false },
{ id: 'post-004', nodeId: PN.fontRss2, protocol: 'rss', title: 'Brazil announces new digital infrastructure plan', content: 'Government invests in broadband expansion nationwide.', url: 'https://bbc.co.uk/news/world-2', author: 'BBC News', publishedAt: new Date('2026-02-15T16:00:00Z'), ingestedAt: now, read: true },
{ id: 'post-005', nodeId: PT.fontAtom1, protocol: 'atom', title: 'Svelte 5.1 released with improved server-side rendering', content: 'The Svelte team ships streaming SSR and better hydration.', url: 'https://svelte.dev/blog/svelte-5-1', author: 'Svelte Team', publishedAt: new Date('2026-02-14T12:00:00Z'), ingestedAt: now, read: false },
{ id: 'post-006', nodeId: PT.fontAtom1, protocol: 'atom', title: 'Building accessible forms with Svelte and shadcn-svelte', content: 'A practical guide to form validation and accessibility.', url: 'https://svelte.dev/blog/forms', author: 'Svelte Team', publishedAt: new Date('2026-02-13T09:00:00Z'), ingestedAt: now, read: false },
{ id: 'post-007', nodeId: PT.fontNostr1, protocol: 'nostr', title: 'NIP-29: Relay-based groups proposal finalized', content: 'The community converges on a standard for group chats.', url: '', author: 'nostr_dev', publishedAt: new Date('2026-02-16T06:00:00Z'), ingestedAt: now, read: false },
{ id: 'post-008', nodeId: PT.fontNostr1, protocol: 'nostr', title: 'Blossom storage integration for media-rich notes', content: 'Upload images and videos using decentralized storage.', url: '', author: 'blossom_builder', publishedAt: new Date('2026-02-15T20:00:00Z'), ingestedAt: now, read: false },
{ id: 'post-009', nodeId: PT.fontRss1, protocol: 'rss', title: 'Vite 7 ships with improved cold start performance', content: 'Build times drop by 40% thanks to new bundling strategies.', url: 'https://news.ycombinator.com/item?id=3', author: 'build_tools', publishedAt: new Date('2026-02-14T18:00:00Z'), ingestedAt: now, read: true },
{ id: 'post-010', nodeId: PN.fontRss2, protocol: 'rss', title: 'New study reveals impact of screen time on children', content: 'Researchers find nuanced effects depending on content type.', url: 'https://bbc.co.uk/news/health-1', author: 'BBC News', publishedAt: new Date('2026-02-13T11:00:00Z'), ingestedAt: now, read: false },
{ id: 'post-011', nodeId: PS.fontRss3, protocol: 'rss', title: 'Critical vulnerability found in widely used SSH library', content: 'Researchers disclose a remote code execution flaw affecting millions of servers.', url: 'https://krebsonsecurity.com/2026/02/ssh-vuln', author: 'Brian Krebs', publishedAt: new Date('2026-02-16T09:00:00Z'), ingestedAt: now, read: false },
{ id: 'post-012', nodeId: PS.fontRss3, protocol: 'rss', title: 'Ransomware group dismantled by joint law enforcement operation', content: 'Europol and FBI coordinate takedown of infrastructure spanning 12 countries.', url: 'https://krebsonsecurity.com/2026/02/ransomware-takedown', author: 'Brian Krebs', publishedAt: new Date('2026-02-15T13:00:00Z'), ingestedAt: now, read: false },
{ id: 'post-013', nodeId: PS.fontRss3, protocol: 'rss', title: 'Browser fingerprinting techniques evolve beyond cookies', content: 'New research shows canvas and GPU fingerprinting are near-impossible to block.', url: 'https://krebsonsecurity.com/2026/02/fingerprinting', author: 'Brian Krebs', publishedAt: new Date('2026-02-14T17:30:00Z'), ingestedAt: now, read: true },
{ id: 'post-014', nodeId: PH.fontAtom2, protocol: 'atom', title: 'Breakthrough in protein folding enables faster drug discovery', content: 'AI-assisted models predict novel binding sites with 94% accuracy in trials.', url: 'https://nature.com/articles/protein-folding-2026', author: 'Nature Editorial', publishedAt: new Date('2026-02-16T07:00:00Z'), ingestedAt: now, read: false },
{ id: 'post-015', nodeId: PH.fontAtom2, protocol: 'atom', title: 'CRISPR gene editing approved for third hereditary condition', content: 'Regulators green-light treatment targeting rare metabolic disorder.', url: 'https://nature.com/articles/crispr-approval-2026', author: 'Nature Editorial', publishedAt: new Date('2026-02-15T11:00:00Z'), ingestedAt: now, read: false },
{ id: 'post-016', nodeId: PH.fontAtom2, protocol: 'atom', title: 'Ocean warming accelerates coral bleaching across Indo-Pacific', content: 'Satellite data confirms third mass bleaching event in six years.', url: 'https://nature.com/articles/coral-bleaching-2026', author: 'Nature Editorial', publishedAt: new Date('2026-02-14T08:00:00Z'), ingestedAt: now, read: false },
{ id: 'post-017', nodeId: PT.fontRss1, protocol: 'rss', title: 'Ask HN: How do you manage secrets in a monorepo?', content: 'Discussion on Vault, SOPS, and environment-specific strategies.', url: 'https://news.ycombinator.com/item?id=4', author: 'repo_architect', publishedAt: new Date('2026-02-16T11:00:00Z'), ingestedAt: now, read: false },
{ id: 'post-018', nodeId: PT.fontAtom1, protocol: 'atom', title: 'SvelteKit 3.0 testing patterns with Vitest and Playwright', content: 'End-to-end and unit testing strategies updated for the new adapter model.', url: 'https://svelte.dev/blog/testing-2026', author: 'Svelte Team', publishedAt: new Date('2026-02-12T14:00:00Z'), ingestedAt: now, read: false },
{ id: 'post-019', nodeId: PT.fontNostr1, protocol: 'nostr', title: 'DVMs gain traction as decentralized AI inference layer', content: 'Data Vending Machines allow any relay to serve AI tasks over nostr events.', url: '', author: 'dvm_builder', publishedAt: new Date('2026-02-16T05:00:00Z'), ingestedAt: now, read: false },
{ id: 'post-020', nodeId: PN.fontRss2, protocol: 'rss', title: 'UN report warns of rising food insecurity in West Africa', content: 'Climate shocks and conflict displace over 3 million smallholder farmers.', url: 'https://bbc.co.uk/news/world-3', author: 'BBC News', publishedAt: new Date('2026-02-12T09:30:00Z'), ingestedAt: now, read: false }
];

await savePosts(posts);
}

/** Exported IDs for use in tests */
export const MOCK_IDS = IDS;

/** Exported composite nodeIds for use in tests */
export const MOCK_NODES = { PT, PS, PN, PH, PF, PD, TB, ND, CP, CD };
