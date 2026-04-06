<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { layout } from '$lib/stores/layout.svelte.js';
	import { activeUser } from '$lib/stores/active-user.svelte.js';
	import { creator } from '$lib/stores/creator.svelte.js';
	import { NodeForm, TreeEditor, PublishButton, ExportButton, CopyFromConsumerDialog } from '$lib/components/creator/index.js';
	import { getMediaPreviewUrl } from '$lib/services/media.service.js';
	import { getRootNode as domainGetRootNode } from '$lib/domain/content-tree/content-tree.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { Separator } from '$lib/components/ui/separator/index.js';
	import ConfirmDialog from '$lib/components/shared/dialog/ConfirmDialog.svelte';
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import Copy from '@lucide/svelte/icons/copy';
	import Globe from '@lucide/svelte/icons/globe';
	import PenLine from '@lucide/svelte/icons/pen-line';

	let treeId = $derived(page.params.id!);
	let tree = $derived(creator.trees.find((t) => t.metadata.id === treeId));
	let rootNode = $derived(treeId ? creator.getRootNode(treeId) : null);

	// Author signing
	let creatorTrees = $derived(creator.getCreatorTrees());
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
		await creator.deleteTree(treeId);
		goto('/pages');
	}
</script>

<svelte:head>
	<title>Notfeed — {rootNode?.data.header.title ?? 'Page'}</title>
</svelte:head>

<div class="container mx-auto px-4 py-6 {layout.isExpanded ? 'max-w-3xl' : 'max-w-2xl'}">
	<button onclick={() => history.back()} class="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
		<ArrowLeft class="size-4" />
		Voltar
	</button>

	{#if !tree}
		<div class="py-12 text-center">
			<p class="text-sm text-muted-foreground">Página não encontrada.</p>
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
				{:else}
					<div class="shrink-0 w-14 h-14 rounded-lg bg-muted flex items-center justify-center text-muted-foreground">
						<Globe class="size-7" />
					</div>
				{/if}
				<div class="flex-1 min-w-0">
					<h1 class="text-xl font-bold truncate">{rootNode?.data.header.title ?? ''}</h1>
					{#if rootNode?.data.header.subtitle}
						<p class="text-sm font-medium mt-0.5">{rootNode.data.header.subtitle}</p>
					{/if}
					{#if rootNode?.data.header.summary}
						<p class="text-sm text-muted-foreground mt-1 line-clamp-2">{rootNode.data.header.summary}</p>
					{/if}
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
				<h2 class="text-sm font-semibold">Dados da Página</h2>
				<Button variant="ghost" size="sm" onclick={() => (editing = !editing)}>
					{editing ? 'Cancelar' : 'Editar'}
				</Button>
			</div>

			{#if editing}
				<div class="border rounded-lg p-4 bg-muted/30">
					<NodeForm
						mode="edit"
						role={rootNode?.role ?? 'creator'}
						isRoot={true}
						initialHeader={rootNode?.data.header}
						initialBody={rootNode?.data.body}
						onsave={handleSave}
						oncancel={() => (editing = false)}
						{saving}
					/>
				</div>
			{:else}
				<div class="border rounded-lg p-4 space-y-2">
					{#if rootNode?.data.header.tags && rootNode.data.header.tags.length > 0}
						<div class="flex flex-wrap gap-1">
							{#each rootNode.data.header.tags as tag}
								<span class="text-xs px-2 py-0.5 rounded-md bg-secondary text-secondary-foreground">{tag}</span>
							{/each}
						</div>
					{/if}
					{#if !rootNode?.data.header.summary && !rootNode?.data.header.subtitle && (!rootNode?.data.header.tags || rootNode.data.header.tags.length === 0)}
						<p class="text-xs text-muted-foreground italic">Nenhuma informação adicional.</p>
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
				<h2 class="text-sm font-semibold">Assinatura</h2>
			</div>
			<p class="text-xs text-muted-foreground">
				Vincule esta página a uma creator page para assinar seu conteúdo.
			</p>
			<div class="space-y-2">
				<Label for="author-tree">Creator page</Label>
				<select
					id="author-tree"
					class="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
					value={currentAuthorTreeId}
					onchange={handleAuthorChange}
				>
					<option value="">Nenhuma (sem assinatura)</option>
					{#each creatorTrees as ct}
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
				Copiar do Consumer
			</Button>

			<Button
				variant="ghost"
				size="sm"
				class="text-destructive hover:text-destructive"
				onclick={() => (showDeleteConfirm = true)}
			>
				<Trash2 class="size-4 mr-1" />
				Excluir Page
			</Button>
		</div>

		<!-- Dialogs -->
		{#if showDeleteConfirm}
			<ConfirmDialog
				open={showDeleteConfirm}
				title="Excluir página?"
				description="Tem certeza que deseja excluir &quot;{rootNode?.data.header.title ?? ''}&quot;? Todos os profiles e fonts desta página também serão excluídos."
				confirmLabel="Excluir"
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
