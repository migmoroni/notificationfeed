<script lang="ts">
	import { page } from '$app/state';
	import FontPage from '$lib/components/browse/FontPage.svelte';

	const creatorId = $derived(page.params.creatorId);
	const profileId = $derived(page.params.profileId);
</script>

<FontPage
	backHref={`/favorites/creator/${creatorId}/profile/${profileId}`}
	backLabel="Profile"
/>
