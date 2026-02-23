<script lang="ts">
	import { layout } from '$lib/stores/layout.svelte.js';
	import { activeUser } from '$lib/stores/active-user.svelte.js';
	import Library from '@lucide/svelte/icons/library';
</script>

<svelte:head>
	<title>Notfeed — Library</title>
</svelte:head>

<div class="container mx-auto px-4 py-6 {layout.isExpanded ? 'max-w-4xl' : 'max-w-2xl'}">
	<h1 class="text-xl font-bold mb-4">Library</h1>

	{#if !activeUser.isCreator}
		<div class="py-12 text-center">
			<Library class="size-12 mx-auto text-muted-foreground mb-3" />
			<p class="text-sm text-muted-foreground mb-2">
				Acesse com um usuário Creator para gerenciar profiles e fonts.
			</p>
			<a href="/user" class="text-sm text-primary hover:underline">
				Trocar de usuário →
			</a>
		</div>
	{:else}
		<div class="py-12 text-center">
			<Library class="size-12 mx-auto text-muted-foreground mb-3" />
			<p class="text-sm text-muted-foreground">
				Gerenciamento de Profiles e Fonts do Creator será implementado na Fase 6.
			</p>
		</div>
	{/if}
</div>
