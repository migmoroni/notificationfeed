<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { layout } from '$lib/stores/layout.svelte.js';
	import { activeUser } from '$lib/stores/active-user.svelte.js';
	import { creator } from '$lib/stores/creator.svelte.js';
	import { NodeForm, TreeEditor, PublishButton, ExportButton, CopyFromConsumerDialog } from '$lib/components/creator/index.js';
	import { getMediaPreviewUrl } from '$lib/services/media.service.js';
	import { getRootNode as domainGetRootNode } from '$lib/domain/content-tree/content-tree.js';
	import type { CollectionBody, ProfileBody, ExternalLink } from '$lib/domain/content-tree/content-tree.js';
	import type { Category } from '$lib/domain/category/category.js';
	import { createCategoryStore } from '$lib/persistence/category.store.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { Separator } from '$lib/components/ui/separator/index.js';
	import ConfirmDeletePageDialog from '$lib/components/shared/dialog/ConfirmDeletePageDialog.svelte';
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import ArchiveRestore from '@lucide/svelte/icons/archive-restore';
	import Copy from '@lucide/svelte/icons/copy';
	import Globe from '@lucide/svelte/icons/globe';
	import PenLine from '@lucide/svelte/icons/pen-line';
	import ExternalLinkIcon from '@lucide/svelte/icons/external-link';
	import { t } from '$lib/i18n/t.js';
	import { tCat } from '$lib/i18n/category.js';

	let treeId = $derived(page.params.id!);
	let tree = $derived(creator.allTrees.find((t) => t.metadata.id === treeId));
	let rootNode = $derived(treeId ? creator.getRootNode(treeId) : null);
	let isRemoved = $derived(!!tree?.metadata.removedAt);

	// Author signing
	let authorCandidateTrees = $derived(creator.getCollectionTrees());
	let currentAuthorTreeId = $derived(tree?.metadata.authorTreeId ?? '');

	async function handleAuthorChange(e: Event) {
		const value = (e.currentTarget as HTMLSelectElement).value;
		await creator.setAuthorTreeId(treeId, value || null);
	}

	let bannerMedia = $derived(rootNode?.data.header.bannerMediaId ? creator.getMediaById(rootNode.data.header.bannerMediaId) : null);
	let avatarMedia = $derived(rootNode?.data.header.coverMediaId ? creator.getMediaById(rootNode.data.header.coverMediaId) : null);

	let editing = $state(false);
	let saving = $state(false);
	let showDeleteConfirm = $state(false);
	let showCopyDialog = $state(false);

	// Categories
	let allCategories = $state<Category[]>([]);
	const categoryRepo = createCategoryStore();
	onMount(async () => {
		allCategories = await categoryRepo.getAll();
	});

	function getCategoryLabel(catId: string): string {
		return tCat(catId);
	}

	const TREE_LABELS: Record<string, string> = {
		subject: t('category_tree.subject'),
		content: t('category_tree.content'),
		media: t('category_tree.media'),
		region: t('category_tree.region'),
		language: t('category_tree.language')
	};

	/** Get external links from body (only collection/profile have them) */
	let bodyLinks = $derived.by((): ExternalLink[] => {
		const body = rootNode?.data.body;
		if (!body) return [];
		if (body.role === 'collection' || body.role === 'profile') return (body as CollectionBody | ProfileBody).links ?? [];
		return [];
	});

	async function handleSave(data: { header: import('$lib/domain/content-tree/content-tree.js').NodeHeader; body: import('$lib/domain/content-tree/content-tree.js').NodeBody }) {
		if (!rootNode) return;
		saving = true;
		try {
			await creator.updateNodeHeader(treeId, rootNode.metadata.id, data.header);
			await creator.updateNodeBody(treeId, rootNode.metadata.id, data.body);
			editing = false;
		} finally {
			saving = false;
		}
	}

	async function handleDelete() {
		if (!treeId) return;
		showDeleteConfirm = false;
		await creator.deleteTree(treeId);
		goto('/pages');
	}

	async function handleRestore() {
		if (!treeId) return;
		await creator.restoreTree(treeId);
		goto('/pages');
	}
</script>

<svelte:head>
	<title>{t('page_title.detail', { title: rootNode?.data.header.title ?? 'Page' })}</title>
</svelte:head>

<div class="container mx-auto px-4 py-6 {layout.isExpanded ? 'max-w-3xl' : 'max-w-2xl'}">
	<button onclick={() => history.back()} class="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
		<ArrowLeft class="size-4" />
		{t('btn.back')}
	</button>

	{#if !tree}
		<div class="py-12 text-center">
			<p class="text-sm text-muted-foreground">{t('pages.not_found')}</p>
		</div>
	{:else}
		<!-- Header -->
		{#if bannerMedia}
			<div class="rounded-lg overflow-hidden mb-4" style="aspect-ratio: 3.6 / 1;">
				<img src={getMediaPreviewUrl(bannerMedia)} alt="" class="w-full h-full object-cover" />
			</div>
		{/if}
		<div class="flex items-start justify-between gap-4 mb-6">
			<div class="flex items-start gap-3 flex-1 min-w-0">
				{#if avatarMedia}
					<div class="shrink-0 w-14 h-14 rounded-lg overflow-hidden bg-muted">
						<img src={getMediaPreviewUrl(avatarMedia)} alt="" class="w-full h-full object-cover" />
					</div>
				{:else if rootNode?.data.header.coverEmoji}
					<div class="shrink-0 w-14 h-14 rounded-lg bg-muted flex items-center justify-center text-3xl">
						{rootNode.data.header.coverEmoji}
					</div>
				{:else}
					<div class="shrink-0 w-14 h-14 rounded-lg bg-muted flex items-center justify-center text-muted-foreground">
						<Globe class="size-7" />
					</div>
				{/if}
				<div class="flex-1 min-w-0">
					<h1 class="text-xl font-bold truncate">{rootNode?.data.header.title ?? ''}</h1>
				</div>
			</div>
			<div class="flex items-center gap-2 shrink-0">
				<PublishButton treeId={treeId} />
				<ExportButton treeId={treeId} />
			</div>
		</div>

		<!-- Page metadata section -->
		<div class="space-y-4 mb-6">
			<div class="flex items-center justify-between">
			<h2 class="text-sm font-semibold">{t('pages.page_data')}</h2>
			<Button variant="ghost" size="sm" onclick={() => (editing = !editing)}>
				{editing ? t('btn.cancel') : t('btn.edit')}
				</Button>
			</div>

			{#if editing}
				<div class="border rounded-lg p-4 bg-muted/30">
					<NodeForm
						mode="edit"
						role={rootNode?.role ?? 'collection'}
						isRoot={true}
						initialHeader={rootNode?.data.header}
						initialBody={rootNode?.data.body}
						onsave={handleSave}
						oncancel={() => (editing = false)}
						{saving}
					/>
				</div>
			{:else}
				{@const h = rootNode?.data.header}
				{@const cats = h?.categoryAssignments ?? []}
				{@const hasContent = !!(h?.subtitle || h?.summary || cats.length > 0 || bodyLinks.length > 0)}

				<div class="border rounded-lg divide-y">
					{#if !hasContent}
						<div class="px-4 py-6 text-center">
						<p class="text-sm text-muted-foreground italic">{t('pages.no_additional_info')}</p>
						</div>
					{/if}

					{#if h?.subtitle}
						<div class="px-4 py-3">
							<span class="text-xs font-medium text-muted-foreground uppercase tracking-wider">{t('pages.subtitle_label')}</span>
							<p class="text-sm mt-0.5">{h.subtitle}</p>
						</div>
					{/if}

					{#if h?.summary}
						<div class="px-4 py-3">
							<span class="text-xs font-medium text-muted-foreground uppercase tracking-wider">{t('pages.description_label')}</span>
							<p class="text-sm mt-0.5 whitespace-pre-line">{h.summary}</p>
						</div>
					{/if}

					{#if bodyLinks.length > 0}
						<div class="px-4 py-3">
							<div class="flex items-center gap-1.5 mb-1.5">
								<ExternalLinkIcon class="size-3 text-muted-foreground" />
								<span class="text-xs font-medium text-muted-foreground uppercase tracking-wider">{t('pages.links_label')}</span>
							</div>
							<div class="space-y-1.5">
								{#each bodyLinks as link}
									<div class="flex items-start gap-2 text-sm">
										<ExternalLinkIcon class="size-3 shrink-0 mt-1 text-muted-foreground" />
										<div class="min-w-0">
											{#if link.title}
												<span class="font-medium">{link.title}</span>
											{/if}
											<a
												href={link.url}
												target="_blank"
												rel="noopener noreferrer"
												class="block text-xs text-primary hover:underline truncate"
											>{link.url}</a>
										</div>
									</div>
								{/each}
							</div>
						</div>
					{/if}

					{#if cats.length > 0}
						<div class="px-4 py-3">
							<span class="text-xs font-medium text-muted-foreground uppercase tracking-wider">{t('pages.categories_label')}</span>
							<div class="mt-1.5 space-y-1.5">
								{#each cats as assignment}
									<div>
										<span class="text-[11px] text-muted-foreground">{TREE_LABELS[assignment.treeId] ?? assignment.treeId}:</span>
										<div class="flex flex-wrap gap-1 mt-0.5">
											{#each assignment.categoryIds as catId}
												<Badge variant="outline" class="text-xs">{getCategoryLabel(catId)}</Badge>
											{/each}
										</div>
									</div>
								{/each}
							</div>
						</div>
					{/if}
				</div>
			{/if}
		</div>

		<Separator class="my-6" />

		<!-- Tree Editor -->
		<div class="mb-6">
			<TreeEditor treeId={treeId} />
		</div>

		<Separator class="my-6" />

		<!-- Author Signing -->
		<div class="space-y-3 mb-6">
			<div class="flex items-center gap-2">
				<PenLine class="size-4 text-muted-foreground" />
				<h2 class="text-sm font-semibold">{t('pages.author_signing')}</h2>
			</div>
			<p class="text-xs text-muted-foreground">
				{t('pages.link_hint')}
			</p>
			<div class="space-y-2">
				<Label for="author-tree">{t('pages.creator_page_label')}</Label>
				<select
					id="author-tree"
					class="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
					value={currentAuthorTreeId}
					onchange={handleAuthorChange}
				>
					<option value="">{t('pages.no_subscription')}</option>
					{#each authorCandidateTrees as ct}
						{@const ctRoot = domainGetRootNode(ct)}
						{#if ct.metadata.id !== treeId}
							<option value={ct.metadata.id}>{ctRoot?.data.header.title ?? ct.metadata.id}</option>
						{/if}
					{/each}
				</select>
			</div>
		</div>

		<Separator class="my-6" />

		<!-- Actions -->
		<div class="flex items-center justify-between">
			<Button
				variant="outline"
				size="sm"
				onclick={() => (showCopyDialog = true)}
			>
				<Copy class="size-4 mr-1" />
				{t('pages.copy_from_consumer')}
			</Button>

			{#if isRemoved}
				<Button
					variant="default"
					size="sm"
					onclick={handleRestore}
				>
					<ArchiveRestore class="size-4 mr-1" />
					{t('pages.restore_page')}
				</Button>
			{:else}
				<Button
					variant="ghost"
					size="sm"
					class="text-destructive hover:text-destructive"
					onclick={() => (showDeleteConfirm = true)}
				>
					<Trash2 class="size-4 mr-1" />
					{t('pages.delete_page')}
				</Button>
			{/if}
		</div>

		<!-- Dialogs -->
		{#if showDeleteConfirm}
			<ConfirmDeletePageDialog
				open={showDeleteConfirm}
				pageTitle={rootNode?.data.header.title ?? ''}
				onconfirm={handleDelete}
				oncancel={() => (showDeleteConfirm = false)}
			/>
		{/if}

		{#if showCopyDialog && activeUser.current}
			<CopyFromConsumerDialog
				open={showCopyDialog}
				treeId={treeId}
				onclose={() => (showCopyDialog = false)}
			/>
		{/if}
	{/if}
</div>
