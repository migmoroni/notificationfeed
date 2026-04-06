<script lang="ts">
	import { layout } from '$lib/stores/layout.svelte.js';
	import { activeUser } from '$lib/stores/active-user.svelte.js';
	import { creator } from '$lib/stores/creator.svelte.js';
	import { getMediaPreviewUrl } from '$lib/services/media.service.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import * as Card from '$lib/components/ui/card/index.js';
	import FileStack from '@lucide/svelte/icons/file-stack';
	import Plus from '@lucide/svelte/icons/plus';
	import Check from '@lucide/svelte/icons/check';
	import PenLine from '@lucide/svelte/icons/pen-line';
	import Users from '@lucide/svelte/icons/users';
	import Newspaper from '@lucide/svelte/icons/newspaper';
	import Library from '@lucide/svelte/icons/library';

	const roleMeta: Record<string, { label: string; icon: typeof Users }> = {
		creator: { label: 'Creator', icon: Users },
		profile: { label: 'Profile', icon: Newspaper },
		collection: { label: 'Collection', icon: Library },
	};
</script>

<svelte:head>
	<title>Notfeed — Pages</title>
</svelte:head>

<div class="container mx-auto px-4 py-6 {layout.isExpanded ? 'max-w-4xl' : 'max-w-2xl'}">
	<div class="flex items-center justify-between mb-6">
		<h1 class="text-xl font-bold">Pages</h1>

		{#if activeUser.isCreator}
			<Button href="/pages/new">
				<Plus class="size-4 mr-1" />
				Nova Page
			</Button>
		{/if}
	</div>

	{#if !activeUser.isCreator}
		<div class="py-12 text-center">
			<FileStack class="size-12 mx-auto text-muted-foreground mb-3" />
			<p class="text-sm text-muted-foreground mb-2">
				Acesse com um usuário Creator para gerenciar suas páginas.
			</p>
			<a href="/user" class="text-sm text-primary hover:underline">
				Trocar de usuário →
			</a>
		</div>
	{:else if creator.trees.length === 0}
		<div class="py-12 text-center">
			<FileStack class="size-12 mx-auto text-muted-foreground mb-3" />
			<p class="text-sm text-muted-foreground mb-2">
				Nenhuma página ainda. Crie sua primeira!
			</p>
			<Button href="/pages/new" variant="outline">
				<Plus class="size-4 mr-1" />
				Criar Page
			</Button>
		</div>
	{:else}
		<div class="grid gap-4 {layout.isExpanded ? 'grid-cols-2' : 'grid-cols-1'}">
			{#each creator.trees as tree (tree.metadata.id)}
				{@const rootNode = creator.getRootNode(tree.metadata.id)}
				{@const profileCount = creator.getProfileCount(tree.metadata.id)}
				{@const bannerMediaId = rootNode?.data.header.bannerMediaId}
				{@const avatarMediaId = rootNode?.data.header.coverMediaId}
				{@const bannerMedia = bannerMediaId ? creator.getMediaById(bannerMediaId) : null}
				{@const avatarMedia = avatarMediaId ? creator.getMediaById(avatarMediaId) : null}
				<a href="/pages/{tree.metadata.id}" class="block group">
					<Card.Root class="overflow-hidden hover:border-primary/50 transition-colors">
						{#if bannerMedia}
							<div class="w-full overflow-hidden" style="aspect-ratio: 3.6 / 1;">
								<img
									src={getMediaPreviewUrl(bannerMedia)}
									alt=""
									class="w-full h-full object-cover"
								/>
							</div>
						{/if}
						<Card.Header class="pb-2">
							<div class="flex items-start gap-3">
								{#if avatarMedia}
									<div class="size-10 rounded-lg overflow-hidden bg-muted border shrink-0">
										<img
											src={getMediaPreviewUrl(avatarMedia)}
											alt=""
											class="w-full h-full object-cover"
										/>
									</div>
								{:else}
									<div class="size-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
										<FileStack class="size-5 text-muted-foreground" />
									</div>
								{/if}
								<div class="flex-1 min-w-0">
									<Card.Title class="text-base truncate">{rootNode?.data.header.title ?? 'Sem título'}</Card.Title>
									{#if rootNode?.data.header.subtitle}
										<p class="text-xs font-medium mt-0.5 truncate">{rootNode.data.header.subtitle}</p>
									{/if}
									{#if rootNode?.data.header.summary}
										<Card.Description class="line-clamp-2 text-xs mt-0.5">
											{rootNode.data.header.summary}
										</Card.Description>
									{/if}
								</div>
							</div>
						</Card.Header>
						<Card.Footer class="pt-0 gap-2">
							{@const meta = roleMeta[rootNode?.role ?? 'creator'] ?? roleMeta.creator}
							{@const RoleIcon = meta.icon}
							<Badge variant="outline" class="gap-1 text-xs">
								<RoleIcon class="size-3" />
								{meta.label}
							</Badge>
							{#if rootNode?.role === 'creator'}
								<span class="text-xs text-muted-foreground">
									{profileCount} profile{profileCount !== 1 ? 's' : ''}
								</span>
							{/if}
						</Card.Footer>
					</Card.Root>
				</a>
			{/each}
		</div>
	{/if}
</div>
