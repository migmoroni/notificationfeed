<script lang="ts">
	import { page } from '$app/stores';

	const profileId = $derived($page.params.id);
</script>

<svelte:head>
	<title>Notfeed — Profile</title>
</svelte:head>

<main class="container mx-auto max-w-2xl px-4 py-6">
	<h1 class="text-2xl font-bold mb-4">Profile Details</h1>
	<p class="text-muted-foreground">Profile ID: {profileId}</p>
</main>
