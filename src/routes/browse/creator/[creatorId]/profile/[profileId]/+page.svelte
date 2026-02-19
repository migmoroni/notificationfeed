<script lang="ts">
	import { page } from '$app/state';
	import ProfilePage from '$lib/components/browse/ProfilePage.svelte';

	const creatorId = $derived(page.params.creatorId!);
	const profileId = $derived(page.params.profileId!);
</script>

<ProfilePage
	{profileId}
	backHref={`/browse/creator/${creatorId}`}
	backLabel="Creator Page"
/>
