<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { layout } from '$lib/stores/layout.svelte.js';
	import { activeUser } from '$lib/stores/active-user.svelte.js';
	import { creator } from '$lib/stores/creator.svelte.js';
	import { PageForm, ProfileSection, PublishButton, ExportButton, CopyFromConsumerDialog } from '$lib/components/creator/index.js';
	import { createImagePreviewUrl } from '$lib/services/image.service.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Separator } from '$lib/components/ui/separator/index.js';
	import ConfirmDialog from '$lib/components/shared/ConfirmDialog.svelte';
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import Copy from '@lucide/svelte/icons/copy';
	import Globe from '@lucide/svelte/icons/globe';

	let pageId = $derived(page.params.id!);
	let creatorPage = $derived(creator.pages.find((p) => p.id === pageId));

	let editing = $state(false);
	let saving = $state(false);
	let showDeleteConfirm = $state(false);
	let showCopyDialog = $state(false);

	async function handleSave(data: { title: string; tagline: string; bio: string; tags: string[]; avatar: any; banner: any; categoryAssignments: any[] }) {
		if (!pageId) return;
		saving = true;
		try {
			await creator.updatePage(pageId, data);
			editing = false;
		} finally {
			saving = false;
		}
	}

	async function handleDelete() {
		if (!pageId) return;
		await creator.deletePage(pageId);
		goto('/pages');
	}
</script>

<svelte:head>
	<title>Notfeed — {creatorPage?.title ?? 'Page'}</title>
</svelte:head>

<div class="container mx-auto px-4 py-6 {layout.isExpanded ? 'max-w-3xl' : 'max-w-2xl'}">
	<button onclick={() => history.back()} class="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
		<ArrowLeft class="size-4" />
		Voltar
	</button>

	{#if !creatorPage}
		<div class="py-12 text-center">
			<p class="text-sm text-muted-foreground">Página não encontrada.</p>
		</div>
	{:else}
		<!-- Header -->
		{#if creatorPage.banner?.data}
			<div class="rounded-lg overflow-hidden mb-4" style="aspect-ratio: 3.6 / 1;">
				<img src={createImagePreviewUrl(creatorPage.banner)} alt="" class="w-full h-full object-cover" />
			</div>
		{/if}
		<div class="flex items-start justify-between gap-4 mb-6">
			<div class="flex items-start gap-3 flex-1 min-w-0">
				{#if creatorPage.avatar?.data}
					<div class="shrink-0 w-14 h-14 rounded-lg overflow-hidden bg-muted">
						<img src={createImagePreviewUrl(creatorPage.avatar)} alt="" class="w-full h-full object-cover" />
					</div>
				{:else}
					<div class="shrink-0 w-14 h-14 rounded-lg bg-muted flex items-center justify-center text-muted-foreground">
						<Globe class="size-7" />
					</div>
				{/if}
				<div class="flex-1 min-w-0">
					<h1 class="text-xl font-bold truncate">{creatorPage.title}</h1>
					{#if creatorPage.tagline}
						<p class="text-sm font-medium mt-0.5">{creatorPage.tagline}</p>
					{/if}
					{#if creatorPage.bio}
						<p class="text-sm text-muted-foreground mt-1 line-clamp-2">{creatorPage.bio}</p>
					{/if}
				</div>
			</div>
			<div class="flex items-center gap-2 shrink-0">
				<PublishButton page={creatorPage} />
				<ExportButton page={creatorPage} />
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
					<PageForm
						mode="edit"
						initial={{
							title: creatorPage.title,						tagline: creatorPage.tagline,							bio: creatorPage.bio,
							tags: creatorPage.tags,
							avatar: creatorPage.avatar,
							banner: creatorPage.banner,
							categoryAssignments: creatorPage.categoryAssignments ?? []
						}}
						onsave={handleSave}
						oncancel={() => (editing = false)}
						{saving}
					/>
				</div>
			{:else}
				<div class="border rounded-lg p-4 space-y-2">
					{#if creatorPage.tags.length > 0}
						<div class="flex flex-wrap gap-1">
							{#each creatorPage.tags as tag}
								<span class="text-xs px-2 py-0.5 rounded-md bg-secondary text-secondary-foreground">{tag}</span>
							{/each}
						</div>
					{/if}
					{#if !creatorPage.bio && !creatorPage.tagline && creatorPage.tags.length === 0}
						<p class="text-xs text-muted-foreground italic">Nenhuma informação adicional.</p>
					{/if}
				</div>
			{/if}
		</div>

		<Separator class="my-6" />

		<!-- Profiles + Fonts -->
		<div class="mb-6">
			<ProfileSection pageId={pageId} />
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
				description="Tem certeza que deseja excluir &quot;{creatorPage.title}&quot;? Todos os profiles e fonts desta página também serão excluídos."
				confirmLabel="Excluir"
				onconfirm={handleDelete}
				oncancel={() => (showDeleteConfirm = false)}
			/>
		{/if}

		{#if showCopyDialog && activeUser.current}
			<CopyFromConsumerDialog
				bind:open={showCopyDialog}
				{pageId}
				creatorId={activeUser.current.id}
				onclose={() => (showCopyDialog = false)}
			/>
		{/if}
	{/if}
</div>
