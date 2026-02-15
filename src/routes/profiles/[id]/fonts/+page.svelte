<script lang="ts">
	import { page } from '$app/stores';

	const profileId = $derived($page.params.id);
</script>

<svelte:head>
	<title>Notfeed — Fonts</title>
</svelte:head>

<main class="container mx-auto max-w-2xl px-4 py-6">
	<div class="flex items-center justify-between mb-4">
		<h1 class="text-2xl font-bold">Fonts</h1>
	</div>
	<p class="text-muted-foreground">Data sources for profile {profileId}.</p>
</main>
