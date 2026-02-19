<script lang="ts">
	import { page } from '$app/state';
	import FontPage from '$lib/components/browse/FontPage.svelte';

	const profileId = $derived(page.params.profileId);
</script>

<FontPage
	backHref={`/browse/profile/${profileId}`}
	backLabel="Profile"
/>
