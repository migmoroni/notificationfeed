<script lang="ts">
	import { goto } from '$app/navigation';
	import { layout } from '$lib/stores/layout.svelte.js';
	import { activeUser } from '$lib/stores/active-user.svelte.js';
	import { creator } from '$lib/stores/creator.svelte.js';
	import { PageForm } from '$lib/components/creator/index.js';
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';

	let saving = $state(false);

	async function handleSave(data: { title: string; bio: string; tags: string[]; avatar: any; banner: any }) {
		if (!activeUser.isCreator) return;
		saving = true;
		try {
			const page = await creator.createPage(data);
			goto(`/pages/${page.id}`);
		} finally {
			saving = false;
		}
	}
</script>

<svelte:head>
	<title>Notfeed — Nova Page</title>
</svelte:head>

<div class="container mx-auto px-4 py-6 {layout.isExpanded ? 'max-w-2xl' : 'max-w-lg'}">
	<a href="/pages" class="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
		<ArrowLeft class="size-4" />
		Voltar
	</a>

	<h1 class="text-xl font-bold mb-6">Nova Page</h1>

	<PageForm
		mode="create"
		onsave={handleSave}
		oncancel={() => goto('/pages')}
		{saving}
	/>
</div>
