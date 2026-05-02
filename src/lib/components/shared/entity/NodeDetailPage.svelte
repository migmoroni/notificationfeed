<!--
  NodeDetailPage — node detail view.

  Loads a TreeNode by its composite ID from the containing ContentTree.
  Displays header, body, actions. For collection/profile shows child nodes,
  for font shows posts feed.
-->
<script lang="ts">
import { t } from '$lib/i18n/t.js';
import { untrack } from 'svelte';
import type { TreeNode } from '$lib/domain/content-tree/content-tree.js';
	import { isFontNode, isProfileNode, isTreeLinkNode, isCollectionNode, parseTreeId } from '$lib/domain/content-tree/content-tree.js';
	import { getFetcherState } from '$lib/persistence/fetcher-state.store.js';
	import type { FetcherState } from '$lib/domain/ingestion/fetcher-state.js';
import type { ContentTree, TreeLinkBody } from '$lib/domain/content-tree/content-tree.js';
import { consumer } from '$lib/stores/consumer.svelte.js';
import { layout } from '$lib/stores/layout.svelte.js';
import { createContentTreeStore } from '$lib/persistence/content-tree.store.js';
import { getPostsForUser } from '$lib/persistence/post.store.js';
import { activeUser } from '$lib/stores/active-user.svelte.js';
import { getMediaPreviewUrl } from '$lib/services/media.service.js';
import { createContentMediaStore } from '$lib/persistence/content-media.store.js';
import { sortByPriority, type SortedPost } from '$lib/domain/shared/feed-sorter.js';
import type { CanonicalPost } from '$lib/normalization/canonical-post.js';
import PostCard from '$lib/components/feed/PostCard.svelte';
import FavoriteButton from '$lib/components/shared/FavoriteButton.svelte';
import { Badge } from '$lib/components/ui/badge/index.js';
import { Separator } from '$lib/components/ui/separator/index.js';
import ArrowLeft from '@lucide/svelte/icons/arrow-left';
import Globe from '@lucide/svelte/icons/globe';
import User from '@lucide/svelte/icons/user';
import Rss from '@lucide/svelte/icons/rss';
import Atom from '@lucide/svelte/icons/atom';
import Zap from '@lucide/svelte/icons/zap';
import Braces from '@lucide/svelte/icons/braces';
import Link from '@lucide/svelte/icons/link';
import ConfirmUnfavoriteDialog from '$lib/components/shared/dialog/ConfirmUnfavoriteDialog.svelte';
import ConfirmUnfollowDialog from '$lib/components/shared/dialog/ConfirmUnfollowDialog.svelte';
import ConfirmUnsubscribeDialog from '$lib/components/shared/dialog/ConfirmUnsubscribeDialog.svelte';
import ConfirmUnpinDialog from '$lib/components/shared/dialog/ConfirmUnpinDialog.svelte';

interface Props {
nodeId: string;
baseHref: string;
}

let { nodeId, baseHref }: Props = $props();

let node = $state<TreeNode | null>(null);
let childNodes = $state<TreeNode[]>([]);
let linkedProfiles = $state<{ linkNode: TreeNode; tree: ContentTree; fontCount: number }[]>([]);
let posts = $state<SortedPost<CanonicalPost>[]>([]);
let fetcherState = $state<FetcherState | null>(null);
// Pipeline state machine: HEALTHY / RECOVERING / UNSTABLE / DEGRADED / OFFLINE.
// Drives the small status badge next to the title.
let pipelineState = $derived(fetcherState?.pipelineState ?? 'HEALTHY');
let avatarUrl = $state<string | null>(null);
let avatarEmoji = $state<string | null>(null);
let bannerUrl = $state<string | null>(null);
let loading = $state(true);
let showUnfavConfirm = $state(false);
let showUnfollowConfirm = $state(false);
let showUnsubscribeConfirm = $state(false);
let showUnsaveConfirm = $state(false);

const treeRepo = createContentTreeStore();
const mediaRepo = createContentMediaStore();

const roleMeta: Record<string, { label: string; icon: typeof Globe }> = {
		profile: { label: t('entity.profile'), icon: User },
		font: { label: t('entity.font'), icon: Rss },
		collection: { label: t('entity.collection'), icon: Globe },
tree: { label: 'Tree Link', icon: Link }
};

let meta = $derived(node ? roleMeta[node.role] ?? { label: node.role, icon: Globe } : null);

/** Protocol-specific icon for font nodes; falls back to the role icon. */
function protocolIconFor(n: TreeNode | null): typeof Globe | null {
	if (!n || !isFontNode(n)) return null;
	const primary = n.data.body.protocols.find((p) => p.primary) ?? n.data.body.protocols[0];
	if (!primary) return null;
	const proto = primary.protocol;
	if (proto === 'atom') return Atom;
	if (proto === 'jsonfeed') return Braces;
	if (proto === 'nostr') return Zap;
	return Rss;
}

let protocolIcon = $derived(protocolIconFor(node));
let activation = $derived(node ? consumer.getActivation(node.metadata.id) : null);
let isActivated = $derived(!!activation);
let isFavorite = $derived(activation?.favorite ?? false);
let isEnabled = $derived(activation?.enabled ?? true);

// Role-specific terminology & styles
const roleActions: Record<string, {
activeLabel: string;
inactiveLabel: string;
activeClass: string;
inactiveClass: string;
}> = {

font: {
activeLabel: t('action.following'),
inactiveLabel: t('action.follow'),
activeClass: 'bg-emerald-600 text-white hover:bg-emerald-700',
inactiveClass: 'border-emerald-600 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950'
},
profile: {
activeLabel: t('action.subscribed'),
inactiveLabel: t('action.subscribe'),
activeClass: 'bg-sky-600 text-white hover:bg-sky-700',
inactiveClass: 'border-sky-600 text-sky-600 hover:bg-sky-50 dark:hover:bg-sky-950'
},
collection: {
activeLabel: t('action.pinned'),
inactiveLabel: t('action.pin'),
activeClass: 'bg-amber-600 text-white hover:bg-amber-700',
inactiveClass: 'border-amber-600 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950'
}
};

let actionMeta = $derived(node ? roleActions[node.role] ?? roleActions.font : null);

async function loadNode(id: string) {
	loading = true;
	node = null;
	childNodes = [];
	linkedProfiles = [];
	posts = [];
	avatarUrl = null;
	avatarEmoji = null;
	bannerUrl = null;
	try {
		const treeId = parseTreeId(id);
		const tree = await treeRepo.getById(treeId);
		if (!tree) return;

		const loaded = tree.nodes[id];
		if (!loaded) return;
		node = loaded;

		// Load avatar
		const header = loaded.data.header;
		if (header.coverEmoji) {
			avatarEmoji = header.coverEmoji;
		} else if (header.coverMediaId) {
			const media = await mediaRepo.getById(header.coverMediaId);
			if (media) avatarUrl = getMediaPreviewUrl(media);
		}
		if (header.bannerMediaId) {
			const media = await mediaRepo.getById(header.bannerMediaId);
			if (media) bannerUrl = getMediaPreviewUrl(media);
		}

			// For collection nodes, resolve tree-link nodes to linked profile trees
			if (isCollectionNode(loaded)) {
			const links: typeof linkedProfiles = [];
			for (const [nid, treeNode] of Object.entries(tree.nodes)) {
				if (nid === id) continue;
				if (isTreeLinkNode(treeNode)) {
					const linkedTree = await treeRepo.getById(treeNode.data.body.instanceTreeId);
					if (linkedTree) {
						const fontCount = Object.values(linkedTree.nodes).filter(n => isFontNode(n)).length;
						links.push({ linkNode: treeNode, tree: linkedTree, fontCount });
					}
				}
			}
			linkedProfiles = links;
		}

		// For profile nodes, load font child nodes and their posts
		if (isProfileNode(loaded)) {
			const children: TreeNode[] = [];
			for (const [nid, treeNode] of Object.entries(tree.nodes)) {
				if (nid !== id && isFontNode(treeNode)) children.push(treeNode);
			}
			childNodes = children;

			const userId = activeUser.current?.id ?? null;
			const nodeIds = children.map((c) => c.metadata.id);
			const allPosts: CanonicalPost[] = userId && nodeIds.length
				? await getPostsForUser(userId, { nodeIds })
				: [];
			posts = sortByPriority(allPosts, {});
		}

		// For font nodes, load posts
		if (isFontNode(loaded)) {
			const userId = activeUser.current?.id ?? null;
			const allPosts = userId
				? await getPostsForUser(userId, { nodeIds: [loaded.metadata.id] })
				: [];
			posts = sortByPriority(allPosts, {});
			fetcherState = await getFetcherState(loaded.metadata.id);
		} else {
			fetcherState = null;
		}
	} finally {
		loading = false;
	}
}

$effect(() => {
	const id = nodeId; // track the prop
	untrack(() => { loadNode(id); });
});

async function handleFavorite() {
if (!node) return;
if (isFavorite) {
showUnfavConfirm = true;
return;
}
await consumer.setFavorite(node.metadata.id, true);
}

async function confirmUnfavorite() {
if (!node) return;
await consumer.setFavorite(node.metadata.id, false);
showUnfavConfirm = false;
}

async function handleMainAction() {
if (!node) return;

if (node.role === 'font') {
if (isActivated && isEnabled) {
showUnfollowConfirm = true;
return;
}
if (isActivated) {
await consumer.toggleNodeEnabled(node.metadata.id);
} else {
await consumer.activateNode(node.metadata.id);
}
		} else if (node.role === 'collection') {
if (isActivated) {
showUnsaveConfirm = true;
return;
}
await consumer.activateNode(node.metadata.id);
} else if (node.role === 'profile') {
if (isActivated) {
showUnsubscribeConfirm = true;
return;
}
await consumer.activateNode(node.metadata.id);
}
}

async function confirmUnfollow() {
if (!node) return;
await consumer.toggleNodeEnabled(node.metadata.id);
showUnfollowConfirm = false;
}

async function confirmUnsubscribe() {
if (!node) return;
await consumer.deactivateNode(node.metadata.id);
showUnsubscribeConfirm = false;
}

async function confirmUnsave() {
if (!node) return;
await consumer.deactivateNode(node.metadata.id);
showUnsaveConfirm = false;
}
</script>

<svelte:head>
<title>Notfeed — {node?.data.header.title ?? t('node_detail.loading')}</title>
</svelte:head>

<div class="mx-auto w-full px-4 py-4 {layout.isExpanded ? 'max-w-3xl' : 'max-w-xl'}">
<!-- Back button -->
<button
onclick={() => history.back()}
class="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4"
>
<ArrowLeft class="size-4" />
<span>{t('btn.back')}</span>
</button>

{#if loading}
<div class="text-center py-12 text-muted-foreground text-sm">{t('node_detail.loading')}</div>
{:else if !node}
<div class="text-center py-12 text-muted-foreground text-sm">{t('node_detail.not_found')}</div>
{:else}
<!-- Banner -->
{#if bannerUrl}
<div class="w-full h-40 rounded-lg overflow-hidden mb-4">
<img src={bannerUrl} alt="" class="w-full h-full object-cover" />
</div>
{/if}

<!-- Header -->
<div class="flex items-start gap-4 mb-4">
{#if avatarUrl}
<div class="size-20 shrink-0 rounded-lg overflow-hidden">
<img src={avatarUrl} alt="" class="w-full h-full object-cover" />
</div>
{:else if avatarEmoji}
<div class="size-20 shrink-0 rounded-lg bg-muted flex items-center justify-center text-4xl">
{avatarEmoji}
</div>
{:else if meta}
{@const MetaIcon = protocolIcon ?? meta.icon}
<div class="size-20 shrink-0 flex items-center justify-center rounded-lg bg-muted text-muted-foreground">
<MetaIcon class="size-8" />
</div>
{/if}

<div class="flex-1 min-w-0">
<div class="flex items-center gap-2 flex-wrap">
<h1 class="text-xl font-bold truncate">{node.data.header.title}</h1>
{#if meta}
<Badge variant="outline" class="text-xs">{meta.label}</Badge>
{/if}
{#if pipelineState === 'OFFLINE'}
<Badge variant="destructive" class="text-xs">{t('font.state.offline')}</Badge>
{:else if pipelineState === 'UNSTABLE'}
<Badge class="text-xs bg-orange-500 text-white hover:bg-orange-500/90 border-transparent">{t('font.state.unstable')}</Badge>
{:else if pipelineState === 'DEGRADED'}
<Badge variant="secondary" class="text-xs">{t('font.state.degraded')}</Badge>
{:else if pipelineState === 'RECOVERING'}
<Badge class="text-xs bg-blue-500 text-white hover:bg-blue-500/90 border-transparent">{t('font.state.recovering')}</Badge>
{/if}
</div>

{#if node.data.header.subtitle}
<p class="text-sm text-muted-foreground mt-1">{node.data.header.subtitle}</p>
{/if}

{#if node.data.header.summary}
<p class="text-sm mt-2">{node.data.header.summary}</p>
{/if}
</div>
</div>

<!-- Actions -->
<div class="flex items-center gap-3 mb-4 p-2 rounded-lg border">
<FavoriteButton favorite={isFavorite} onclick={handleFavorite} />
{#if actionMeta}
{@const isActive = node.role === 'font' ? (isActivated && isEnabled) : isActivated}
<button
onclick={handleMainAction}
class="ml-auto text-xs font-medium px-3 py-1.5 rounded-md border transition-colors
{isActive ? actionMeta.activeClass : actionMeta.inactiveClass}"
>
{isActive ? actionMeta.activeLabel : actionMeta.inactiveLabel}
</button>
{/if}
</div>

<Separator class="my-4" />

<!-- Linked profile trees (for creator/collection) -->
		{#if linkedProfiles.length > 0}
		<section class="mb-6">
			<h2 class="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
				{t('node_detail.profiles_section', { count: linkedProfiles.length })}
			</h2>
			<div class="flex flex-col gap-2">
				{#each linkedProfiles as lp (lp.tree.metadata.id)}
					{@const rootNodeId = lp.tree.paths['/']}
					{@const rootNode = rootNodeId ? lp.tree.nodes[rootNodeId] : null}
					<a
						href="{baseHref}/node/{rootNodeId}"
						class="flex items-center gap-3 p-3 rounded-lg border hover:bg-accent/50 transition-colors"
					>
						<User class="size-5 text-muted-foreground shrink-0" />
						<div class="flex-1 min-w-0">
							<p class="text-sm font-medium truncate">{rootNode?.data.header.title ?? lp.linkNode.data.header.title}</p>
							{#if rootNode?.data.header.subtitle}
								<p class="text-xs text-muted-foreground truncate">{rootNode.data.header.subtitle}</p>
							{/if}
						</div>
						<Badge variant="outline" class="text-[10px] shrink-0">{lp.fontCount} font{lp.fontCount !== 1 ? 's' : ''}</Badge>
					</a>
				{/each}
			</div>
		</section>
		{/if}

		<!-- Font child nodes (for profile) -->
		{#if childNodes.length > 0}
		<section class="mb-6">
			<h2 class="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
				{t('node_detail.fonts_section', { count: childNodes.length })}
</h2>
<div class="flex flex-col gap-2">
{#each childNodes as child (child.metadata.id)}
{@const childMeta = roleMeta[child.role]}
{@const childProtocolIcon = protocolIconFor(child)}
<a
href="{baseHref}/node/{child.metadata.id}"
class="flex items-center gap-3 p-3 rounded-lg border hover:bg-accent/50 transition-colors"
>
{#if childMeta}
{@const ChildIcon = childProtocolIcon ?? childMeta.icon}
<ChildIcon class="size-5 text-muted-foreground shrink-0" />
{/if}
<div class="flex-1 min-w-0">
<p class="text-sm font-medium truncate">{child.data.header.title}</p>
{#if child.data.header.subtitle}
<p class="text-xs text-muted-foreground truncate">{child.data.header.subtitle}</p>
{/if}
</div>
<Badge variant="outline" class="text-[10px] shrink-0">{childMeta?.label ?? child.role}</Badge>
</a>
{/each}
</div>
</section>
{/if}

<!-- Posts (for font nodes) -->
{#if posts.length > 0}
<section>
<h2 class="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
{t('node_detail.posts_section', { count: posts.length })}
</h2>
<div class="flex flex-col gap-2">
{#each posts as sortedPost (sortedPost.post.id)}
<PostCard {sortedPost} />
{/each}
</div>
</section>
{/if}
{/if}
</div>

<ConfirmUnfavoriteDialog
bind:open={showUnfavConfirm}
onconfirm={confirmUnfavorite}
oncancel={() => (showUnfavConfirm = false)}
/>

<ConfirmUnfollowDialog
bind:open={showUnfollowConfirm}
title={node?.data.header.title}
onconfirm={confirmUnfollow}
oncancel={() => (showUnfollowConfirm = false)}
/>

<ConfirmUnsubscribeDialog
bind:open={showUnsubscribeConfirm}
title={node?.data.header.title}
onconfirm={confirmUnsubscribe}
oncancel={() => (showUnsubscribeConfirm = false)}
/>

<ConfirmUnpinDialog
bind:open={showUnsaveConfirm}
title={node?.data.header.title}
onconfirm={confirmUnsave}
oncancel={() => (showUnsaveConfirm = false)}
/>
