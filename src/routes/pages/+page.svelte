<script lang="ts">
	import { layout } from '$lib/stores/layout.svelte.js';
	import { activeUser } from '$lib/stores/active-user.svelte.js';
	import { creator } from '$lib/stores/creator.svelte.js';
	import { createImagePreviewUrl } from '$lib/services/image.service.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import * as Card from '$lib/components/ui/card/index.js';
	import FileStack from '@lucide/svelte/icons/file-stack';
	import Plus from '@lucide/svelte/icons/plus';
	import Check from '@lucide/svelte/icons/check';
	import PenLine from '@lucide/svelte/icons/pen-line';
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
	{:else if creator.pages.length === 0}
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
			{#each creator.pages as page (page.id)}
				<a href="/pages/{page.id}" class="block group">
					<Card.Root class="overflow-hidden hover:border-primary/50 transition-colors">
						{#if page.banner}
							<div class="h-20 w-full overflow-hidden">
								<img
									src={createImagePreviewUrl(page.banner)}
									alt=""
									class="w-full h-full object-cover"
								/>
							</div>
						{/if}
						<Card.Header class="pb-2">
							<div class="flex items-start gap-3">
								{#if page.avatar}
									<img
										src={createImagePreviewUrl(page.avatar)}
										alt=""
										class="size-10 rounded-full object-cover border shrink-0"
									/>
								{:else}
									<div class="size-10 rounded-full bg-muted flex items-center justify-center shrink-0">
										<FileStack class="size-5 text-muted-foreground" />
									</div>
								{/if}
								<div class="flex-1 min-w-0">
									<Card.Title class="text-base truncate">{page.title}</Card.Title>
									{#if page.bio}
										<Card.Description class="line-clamp-2 text-xs mt-0.5">
											{page.bio}
										</Card.Description>
									{/if}
								</div>
							</div>
						</Card.Header>
						<Card.Footer class="pt-0 gap-2">
							{#if page.publishedSnapshot}
								<Badge variant="secondary" class="gap-1 text-xs">
									<Check class="size-3" />
									v{page.publishedVersion}
								</Badge>
							{:else}
								<Badge variant="outline" class="gap-1 text-xs">
									<PenLine class="size-3" />
									Rascunho
								</Badge>
							{/if}
							{@const profileCount = creator.getProfilesForPage(page.id).length}
							<span class="text-xs text-muted-foreground">
								{profileCount} profile{profileCount !== 1 ? 's' : ''}
							</span>
						</Card.Footer>
					</Card.Root>
				</a>
			{/each}
		</div>
	{/if}
</div>
