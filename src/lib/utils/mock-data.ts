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
import { createUserSettings } from '$lib/domain/user/user.js';
import type { TreePublication } from '$lib/domain/tree-export/tree-publication.js';
import { getStorageBackend } from '$lib/persistence/db.js';

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
// Profile tree dedicated to ingestion testing — one font per protocol.
treeProfileTest: '00000000-0000-0000-0000-000000003016',

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
localFontNostr2: '00000000-0000-0000-0000-00000000500a',
localFontRss3: '00000000-0000-0000-0000-000000005007',
localFontAtom2: '00000000-0000-0000-0000-000000005008',
localFontJsonfeed1: '00000000-0000-0000-0000-000000005009',
localFontCreatorRss1: '00000000-0000-0000-0000-000000005005',
localFontCreatorAtom1: '00000000-0000-0000-0000-000000005006',
// Test profile fonts — one per protocol.
localFontTestRss: '00000000-0000-0000-0000-00000000500b',
localFontTestAtom: '00000000-0000-0000-0000-00000000500c',
localFontTestNostr: '00000000-0000-0000-0000-00000000500d',
localFontTestJsonfeed: '00000000-0000-0000-0000-00000000500e',
} as const;

// ── Composite nodeIds ───────────────────────────────────────────────────

// Profile tree: Tech Sources
const PT = {
root: generateNodeId(IDS.treeProfileTech, IDS.localRoot),
fontRss1: generateNodeId(IDS.treeProfileTech, IDS.localFontRss1),
fontAtom1: generateNodeId(IDS.treeProfileTech, IDS.localFontAtom1),
fontNostr1: generateNodeId(IDS.treeProfileTech, IDS.localFontNostr1),
fontNostr2: generateNodeId(IDS.treeProfileTech, IDS.localFontNostr2),
fontJsonfeed1: generateNodeId(IDS.treeProfileTech, IDS.localFontJsonfeed1),
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

// Profile tree: Test Sources — one font per supported protocol.
const PX = {
root: generateNodeId(IDS.treeProfileTest, IDS.localRoot),
fontRss: generateNodeId(IDS.treeProfileTest, IDS.localFontTestRss),
fontAtom: generateNodeId(IDS.treeProfileTest, IDS.localFontTestAtom),
fontNostr: generateNodeId(IDS.treeProfileTest, IDS.localFontTestNostr),
fontJsonfeed: generateNodeId(IDS.treeProfileTest, IDS.localFontTestJsonfeed),
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
const db = await getStorageBackend();
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

const db = await getStorageBackend();
const now = new Date();

// ── Users ────────────────────────────────────────────────────────

const consumerUser: UserConsumer = {
id: IDS.consumer,
role: 'consumer',
displayName: 'Dev User',
profileImage: null,
profileEmoji: null,
removedAt: null,
settingsUser: createUserSettings('en-US'),
activateTrees: [],
activateNodes: [],
libraryTabs: [],
feedMacros: [],
interactedAt: now,
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
settingsUser: createUserSettings('en-US'),
ownedTreeIds: [IDS.treeProfileFrontend, IDS.treeProfileNewsDraft, IDS.treeCreatorPublished, IDS.treeCreatorDraft],
ownedMediaIds: [],
interactedAt: now,
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
categoryAssignments: [{ treeId: 'content', categoryIds: ['baaac'] }]
}, { role: 'font', protocols: [{ id: 'p1', protocol: 'rss', config: { url: 'https://hnrss.org/frontpage' }, primary: true }], defaultEnabled: true }),

[PT.fontAtom1]: makeNode(PT.fontAtom1, 'font', {
title: 'Svelte Blog (Atom)',
categoryAssignments: [{ treeId: 'content', categoryIds: ['baaac'] }]
}, { role: 'font', protocols: [{ id: 'p1', protocol: 'atom', config: { url: 'https://svelte.dev/blog/rss.xml' }, primary: true }], defaultEnabled: true }),

[PT.fontNostr1]: makeNode(PT.fontNostr1, 'font', {
title: 'fiatjaf (Nostr)',
}, { role: 'font', protocols: [{ id: 'p1', protocol: 'nostr', config: { pubkey: 'npub180cvv07tjdrrgpa0j7j7tmnyl2yr6yr7l8j4s3evf6u64th6gkwsyjh6w6', relays: ['wss://relay.damus.io', 'wss://nos.lol', 'wss://relay.primal.net'] }, primary: true }], defaultEnabled: true }),

[PT.fontNostr2]: makeNode(PT.fontNostr2, 'font', {
title: 'Nostr (bot de teste — alta frequência)',
}, { role: 'font', protocols: [{ id: 'p1', protocol: 'nostr', config: { pubkey: '32e1827635450ebb3c5a7d12c1f8e7b2b514439ac10a67eef3d9fd9c5c68e245', relays: ['wss://relay.damus.io', 'wss://nos.lol', 'wss://relay.primal.net', 'wss://nostr.wine'] }, primary: true }], defaultEnabled: true }),

[PT.fontJsonfeed1]: makeNode(PT.fontJsonfeed1, 'font', {
title: 'JSON Feed Spec Blog',
categoryAssignments: [{ treeId: 'content', categoryIds: ['baaac'] }]
}, { role: 'font', protocols: [{ id: 'p1', protocol: 'jsonfeed', config: { url: 'https://www.jsonfeed.org/feed.json' }, primary: true }], defaultEnabled: true }),
},
{ '/': PT.root, '*': [PT.fontRss1, PT.fontAtom1, PT.fontNostr1, PT.fontNostr2, PT.fontJsonfeed1] },
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
{ treeId: 'content', categoryIds: ['baaac', 'baaad'] }
]
}, { role: 'profile', links: [] }),

[PS.fontRss3]: makeNode(PS.fontRss3, 'font', {
title: 'Krebs on Security',
categoryAssignments: [{ treeId: 'content', categoryIds: ['baaac'] }]
}, { role: 'font', protocols: [{ id: 'p1', protocol: 'rss', config: { url: 'https://krebsonsecurity.com/feed/' }, primary: true }], defaultEnabled: true }),
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
{ treeId: 'content', categoryIds: ['baaac'] }
]
}, { role: 'profile', links: [] }),

[PN.fontRss2]: makeNode(PN.fontRss2, 'font', {
title: 'BBC World RSS',
}, { role: 'font', protocols: [{ id: 'p1', protocol: 'rss', config: { url: 'http://feeds.bbci.co.uk/news/world/rss.xml' }, primary: true }], defaultEnabled: true }),
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
{ treeId: 'content', categoryIds: ['baaac'] }
]
}, { role: 'profile', links: [] }),

[PH.fontAtom2]: makeNode(PH.fontAtom2, 'font', {
title: 'Nature News (Atom)',
}, { role: 'font', protocols: [{ id: 'p1', protocol: 'atom', config: { url: 'https://www.nature.com/nature.rss' }, primary: true }], defaultEnabled: true }),
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
{ treeId: 'content', categoryIds: ['baaac'] }
]
}, { role: 'profile', links: [] }),

[PF.fontRss1]: makeNode(PF.fontRss1, 'font', {
title: 'Hacker News (Creator)',
}, { role: 'font', protocols: [{ id: 'p1', protocol: 'rss', config: { url: 'https://hnrss.org/frontpage' }, primary: true }], defaultEnabled: true }),

[PF.fontAtom1]: makeNode(PF.fontAtom1, 'font', {
title: 'Svelte Blog (Creator)',
}, { role: 'font', protocols: [{ id: 'p1', protocol: 'atom', config: { url: 'https://svelte.dev/blog/rss.xml' }, primary: true }], defaultEnabled: true }),
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

// Test Sources — one font per protocol, all owned by the consumer
// so they can be activated from the library page to exercise the
// ingestion pipeline state machine. Useful for verifying
// `pipelineEvents` writes: flip a URL to garbage to drive the
// HEALTHY → UNSTABLE → OFFLINE → RECOVERED transitions.
const treeProfileTest = makeTree(
IDS.treeProfileTest,
{
[PX.root]: makeNode(PX.root, 'profile', {
title: 'Test Sources',
summary: 'Ingestion test bench — one font per protocol.',
categoryAssignments: []
}, { role: 'profile', links: [] }),

[PX.fontRss]: makeNode(PX.fontRss, 'font', {
title: 'Test RSS — Hacker News',
subtitle: 'rss',
}, { role: 'font', protocols: [{ id: 'p1', protocol: 'rss', config: { url: 'https://exemple.com/exemple/rss.xml' }, primary: true }], defaultEnabled: true }),

[PX.fontAtom]: makeNode(PX.fontAtom, 'font', {
title: 'Test Atom — Svelte Blog',
subtitle: 'atom',
}, { role: 'font', protocols: [{ id: 'p1', protocol: 'atom', config: { url: 'https://exemple.com/exemple/blog/atom.xml' }, primary: true }], defaultEnabled: true }),

[PX.fontNostr]: makeNode(PX.fontNostr, 'font', {
title: 'Test Nostr — fiatjaf',
subtitle: 'nostr',
}, { role: 'font', protocols: [{ id: 'p1', protocol: 'nostr', config: { pubkey: 'npub180cvv07tjdrrgpa0j7j7tmnyl2yr6yr7l8j4s3evf6u64th6gkwsyjh6w6', relays: ['wss://relay.damus.io'] }, primary: true }], defaultEnabled: true }),

[PX.fontJsonfeed]: makeNode(PX.fontJsonfeed, 'font', {
title: 'Test JSON Feed — JSONFeed.org',
subtitle: 'jsonfeed',
}, { role: 'font', protocols: [{ id: 'p1', protocol: 'jsonfeed', config: { url: 'https://exemple.com/exemple/feed.json' }, primary: true }], defaultEnabled: true }),
},
{ '/': PX.root, '*': [PX.fontRss, PX.fontAtom, PX.fontNostr, PX.fontJsonfeed] },
[],
IDS.consumer
);

// ── Collection Trees (root=collection + tree-link nodes) ──────────────

const techSourcesSectionId = 'sec-tech';
const securitySectionId = 'sec-security';

const treeTechBlog = makeTree(
IDS.treeTechBlog,
{
[TB.root]: makeNode(TB.root, 'collection', {
title: 'TechBlog',
summary: 'A curated collection of technology feeds',
categoryAssignments: [{ treeId: 'subject', categoryIds: ['anaaa'] }]
}, { role: 'collection', links: [] }),

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
[ND.root]: makeNode(ND.root, 'collection', {
title: 'NewsDaily',
summary: 'Daily news from around the world',
categoryAssignments: [
{ treeId: 'subject', categoryIds: ['alaae'] },
{ treeId: 'content', categoryIds: ['baaac'] }
]
}, { role: 'collection', links: [] }),

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
[CP.root]: makeNode(CP.root, 'collection', {
title: 'Dev Curations',
summary: 'Hand-picked development feeds',
}, { role: 'collection', links: [] }),

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
[CD.root]: makeNode(CD.root, 'collection', {
title: 'News Experiment',
summary: 'Testing news aggregation',
}, { role: 'collection', links: [] }),

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
treeProfileFrontend, treeProfileNewsDraft, treeProfileTest,
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
}

/** Exported IDs for use in tests */
export const MOCK_NODES = { PT, PS, PN, PH, PF, PD, PX, TB, ND, CP, CD };
