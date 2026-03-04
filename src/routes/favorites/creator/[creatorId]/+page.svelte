<script lang="ts">
	import { page } from '$app/state';
	import CreatorPage from '$lib/components/shared/entity/CreatorPage.svelte';

	const creatorId = $derived(page.params.creatorId!);
</script>

<CreatorPage {creatorId} baseHref="/favorites" />
