<script lang="ts">
	import { layout } from '$lib/stores/layout.svelte.js';
	import { activeUser } from '$lib/stores/active-user.svelte.js';
	import FileStack from '@lucide/svelte/icons/file-stack';
</script>

<svelte:head>
	<title>Notfeed — Pages</title>
</svelte:head>

<div class="container mx-auto px-4 py-6 {layout.isExpanded ? 'max-w-4xl' : 'max-w-2xl'}">
	<h1 class="text-xl font-bold mb-4">Pages</h1>

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
	{:else}
		<div class="py-12 text-center">
			<FileStack class="size-12 mx-auto text-muted-foreground mb-3" />
			<p class="text-sm text-muted-foreground">
				CRUD de CreatorPages será implementado na Fase 6.
			</p>
		</div>
	{/if}
</div>
