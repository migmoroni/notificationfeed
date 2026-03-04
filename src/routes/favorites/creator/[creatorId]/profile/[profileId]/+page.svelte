<script lang="ts">
	import { page } from '$app/state';
	import ProfilePage from '$lib/components/shared/entity/ProfilePage.svelte';

	const profileId = $derived(page.params.profileId!);
</script>

<ProfilePage
	{profileId}
	baseHref="/favorites"
/>
