<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { createProfileStore } from '$lib/persistence/profile.store.js';
	import ProfilePage from '$lib/components/shared/entity/ProfilePage.svelte';

	const profileId = $derived(page.params.profileId!);

	// If profile belongs to a creator page, redirect to canonical URL
	onMount(async () => {
		const profileStore = createProfileStore();
		const profile = await profileStore.getById(profileId);
		if (profile?.creatorPageId) {
			goto(`/favorites/creator/${profile.creatorPageId}/profile/${profile.id}`, { replaceState: true });
		}
	});
</script>

<ProfilePage {profileId} baseHref="/favorites" />
