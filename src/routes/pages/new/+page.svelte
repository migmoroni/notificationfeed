<script lang="ts">
	import { goto } from '$app/navigation';
	import { layout } from '$lib/stores/layout.svelte.js';
	import { activeUser } from '$lib/stores/active-user.svelte.js';
	import { creator } from '$lib/stores/creator.svelte.js';
	import { NodeForm } from '$lib/components/creator/index.js';
	import type { NodeHeader, NodeBody } from '$lib/domain/content-tree/content-tree.js';
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';

	let saving = $state(false);

	async function handleSave(data: { header: NodeHeader; body: NodeBody }) {
		if (!activeUser.isCreator) return;
		saving = true;
		try {
			const tree = await creator.createTree('creator', data.header.title);
			// Update the root node with full header data
			const rootNode = creator.getRootNode(tree.metadata.id);
			if (rootNode) {
				await creator.updateNodeHeader(tree.metadata.id, rootNode.metadata.id, data.header);
				await creator.updateNodeBody(tree.metadata.id, rootNode.metadata.id, data.body);
			}
			goto(`/pages/${tree.metadata.id}`);
		} finally {
			saving = false;
		}
	}
</script>

<svelte:head>
	<title>Notfeed — Nova Page</title>
</svelte:head>

<div class="container mx-auto px-4 py-6 {layout.isExpanded ? 'max-w-2xl' : 'max-w-lg'}">
	<button onclick={() => history.back()} class="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
		<ArrowLeft class="size-4" />
		Voltar
	</button>

	<h1 class="text-xl font-bold mb-6">Nova Page</h1>

	<NodeForm
		mode="create"
		role="creator"
		onsave={handleSave}
		oncancel={() => history.back()}
		{saving}
	/>
</div>
