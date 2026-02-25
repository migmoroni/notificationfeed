<script lang="ts">
	import { activeUser } from '$lib/stores/active-user.svelte.js';
	import { consumer } from '$lib/stores/consumer.svelte.js';
	import { creator } from '$lib/stores/creator.svelte.js';
	import { feed } from '$lib/stores/feed.svelte.js';
	import { layout } from '$lib/stores/layout.svelte.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Separator } from '$lib/components/ui/separator/index.js';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import CircleUser from '@lucide/svelte/icons/circle-user';
	import Plus from '@lucide/svelte/icons/plus';
	import Pencil from '@lucide/svelte/icons/pencil';
	import Check from '@lucide/svelte/icons/check';
	import Newspaper from '@lucide/svelte/icons/newspaper';
	import FileStack from '@lucide/svelte/icons/file-stack';
	import type { UserRole } from '$lib/domain/user/user.js';

	// ── Create user dialog ─────────────────────────────────────────────

	let showCreateDialog = $state(false);
	let createRole = $state<UserRole>('consumer');
	let createName = $state('');

	function openCreateDialog(role: UserRole) {
		createRole = role;
		createName = '';
		showCreateDialog = true;
	}

	async function handleCreate() {
		const name = createName.trim();
		if (!name) return;

		if (createRole === 'consumer') {
			const user = await activeUser.createConsumer(name);
			activeUser.switchTo(user.id);
			await consumer.init();
			await feed.loadFeed();
		} else {
			const user = await activeUser.createCreator(name);
			activeUser.switchTo(user.id);
			await creator.init(user);
		}
		showCreateDialog = false;
	}

	// ── Edit display name ──────────────────────────────────────────────

	let editingUserId = $state<string | null>(null);
	let editName = $state('');

	function startEdit(userId: string, currentName: string) {
		editingUserId = userId;
		editName = currentName;
	}

	async function saveEdit() {
		if (!editingUserId || !editName.trim()) return;
		await activeUser.updateDisplayName(editingUserId, editName.trim());
		editingUserId = null;
	}

	function cancelEdit() {
		editingUserId = null;
	}

	// ── Switch user ────────────────────────────────────────────────────

	async function switchUser(userId: string) {
		activeUser.switchTo(userId);

		const user = activeUser.allUsers.find(u => u.id === userId);
		if (user?.role === 'consumer') {
			await consumer.init();
			await feed.loadFeed();
		} else if (user?.role === 'creator') {
			await creator.init(user as any);
		}
	}
</script>

<svelte:head>
	<title>Notfeed — Usuário</title>
</svelte:head>

<div class="container mx-auto px-4 py-6 {layout.isExpanded ? 'max-w-2xl' : 'max-w-lg'}">
	<h1 class="text-xl font-bold mb-6">Usuário</h1>

	<!-- Active user banner -->
	{#if activeUser.current}
		<div class="rounded-lg border border-primary/30 bg-primary/5 p-4 mb-6">
			<div class="flex items-center gap-3">
				<div class="flex items-center justify-center size-12 rounded-full bg-primary/10 text-primary">
					<CircleUser class="size-7" />
				</div>
				<div class="flex-1 min-w-0">
					<p class="text-sm font-semibold truncate">{activeUser.current.displayName}</p>
					<Badge variant={activeUser.isConsumer ? 'secondary' : 'outline'} class="text-[10px] mt-0.5">
						{activeUser.isConsumer ? 'Consumer' : 'Creator'}
					</Badge>
				</div>
			</div>
		</div>
	{/if}

	<!-- Consumer accounts -->
	<section class="mb-6">
		<div class="flex items-center justify-between mb-3">
			<h2 class="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
				Consumers
			</h2>
			<Button variant="ghost" size="sm" class="h-7 gap-1 text-xs" onclick={() => openCreateDialog('consumer')}>
				<Plus class="size-3.5" />
				Criar
			</Button>
		</div>

		{#if activeUser.consumers.length === 0}
			<p class="text-sm text-muted-foreground py-2">Nenhum consumer criado.</p>
		{:else}
			<div class="flex flex-col gap-2">
				{#each activeUser.consumers as user (user.id)}
					{@const isActive = activeUser.current?.id === user.id}
					<div class="flex items-center gap-3 rounded-lg border p-3 transition-colors
						{isActive ? 'border-primary/50 bg-primary/5' : 'border-border bg-card hover:bg-accent/50'}">

						<button
							onclick={() => switchUser(user.id)}
							class="flex items-center gap-3 flex-1 min-w-0 text-left"
							disabled={isActive}
						>
							<Newspaper class="size-5 shrink-0 {isActive ? 'text-primary' : 'text-muted-foreground'}" />

							{#if editingUserId === user.id}
								<!-- svelte-ignore a11y_no_static_element_interactions -->
								<div class="flex items-center gap-1 flex-1" onclick={(e) => e.stopPropagation()} onkeydown={() => {}}>
									<Input
										bind:value={editName}
										class="h-7 text-sm"
										onkeydown={(e: KeyboardEvent) => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') cancelEdit(); }}
									/>
									<Button variant="ghost" size="sm" class="h-7 w-7 p-0" onclick={saveEdit}>
										<Check class="size-3.5" />
									</Button>
								</div>
							{:else}
								<span class="text-sm font-medium truncate flex-1">{user.displayName}</span>
							{/if}

							{#if isActive}
								<Badge variant="default" class="text-[10px] shrink-0">Ativo</Badge>
							{/if}
						</button>

						{#if editingUserId !== user.id}
							<Button
								variant="ghost"
								size="sm"
								class="h-7 w-7 p-0 shrink-0"
								onclick={() => startEdit(user.id, user.displayName)}
							>
								<Pencil class="size-3.5" />
							</Button>
						{/if}
					</div>
				{/each}
			</div>
		{/if}
	</section>

	<Separator class="mb-6" />

	<!-- Creator accounts -->
	<section class="mb-6">
		<div class="flex items-center justify-between mb-3">
			<h2 class="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
				Creators
			</h2>
			<Button variant="ghost" size="sm" class="h-7 gap-1 text-xs" onclick={() => openCreateDialog('creator')}>
				<Plus class="size-3.5" />
				Criar
			</Button>
		</div>

		{#if activeUser.creators.length === 0}
			<p class="text-sm text-muted-foreground py-2">Nenhum creator criado.</p>
		{:else}
			<div class="flex flex-col gap-2">
				{#each activeUser.creators as user (user.id)}
					{@const isActive = activeUser.current?.id === user.id}
					<div class="flex items-center gap-3 rounded-lg border p-3 transition-colors
						{isActive ? 'border-primary/50 bg-primary/5' : 'border-border bg-card hover:bg-accent/50'}">

						<button
							onclick={() => switchUser(user.id)}
							class="flex items-center gap-3 flex-1 min-w-0 text-left"
							disabled={isActive}
						>
							<FileStack class="size-5 shrink-0 {isActive ? 'text-primary' : 'text-muted-foreground'}" />

							{#if editingUserId === user.id}
								<!-- svelte-ignore a11y_no_static_element_interactions -->
								<div class="flex items-center gap-1 flex-1" onclick={(e) => e.stopPropagation()} onkeydown={() => {}}>
									<Input
										bind:value={editName}
										class="h-7 text-sm"
										onkeydown={(e: KeyboardEvent) => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') cancelEdit(); }}
									/>
									<Button variant="ghost" size="sm" class="h-7 w-7 p-0" onclick={saveEdit}>
										<Check class="size-3.5" />
									</Button>
								</div>
							{:else}
								<span class="text-sm font-medium truncate flex-1">{user.displayName}</span>
							{/if}

							{#if isActive}
								<Badge variant="default" class="text-[10px] shrink-0">Ativo</Badge>
							{/if}

							{#if user.syncStatus === 'local'}
								<Badge variant="outline" class="text-[10px] shrink-0">Local</Badge>
							{/if}
						</button>

						{#if editingUserId !== user.id}
							<Button
								variant="ghost"
								size="sm"
								class="h-7 w-7 p-0 shrink-0"
								onclick={() => startEdit(user.id, user.displayName)}
							>
								<Pencil class="size-3.5" />
							</Button>
						{/if}
					</div>
				{/each}
			</div>
		{/if}
	</section>

	<Separator class="mb-6" />

	<!-- App settings -->
	<section>
		<h2 class="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
			Configurações do App
		</h2>

		<div class="flex flex-col gap-2">
			<p class="text-sm text-muted-foreground">
				Configurações globais do aplicativo aparecerão aqui em futuras versões.
			</p>
		</div>
	</section>
</div>

<!-- Create user dialog -->
<Dialog.Root bind:open={showCreateDialog}>
	<Dialog.Content class="sm:max-w-sm">
		<Dialog.Header>
			<Dialog.Title>Criar {createRole === 'consumer' ? 'Consumer' : 'Creator'}</Dialog.Title>
			<Dialog.Description>
				{createRole === 'consumer'
					? 'Consumer consome e organiza feeds. Inscreve-se, segue, favorita e personaliza prioridades.'
					: 'Creator cria e exporta páginas editoriais com profiles e fonts. Pode ser local ou vinculado a Nostr (futuro).'}
			</Dialog.Description>
		</Dialog.Header>

		<div class="py-2">
			<Input
				bind:value={createName}
				placeholder="Nome de exibição"
				class="w-full"
				onkeydown={(e: KeyboardEvent) => { if (e.key === 'Enter') handleCreate(); }}
			/>
		</div>

		<Dialog.Footer>
			<Button variant="outline" onclick={() => (showCreateDialog = false)}>Cancelar</Button>
			<Button onclick={handleCreate} disabled={!createName.trim()}>Criar</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
