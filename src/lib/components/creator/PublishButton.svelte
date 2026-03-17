<script lang="ts">
	import { creator } from '$lib/stores/creator.svelte.js';
	import type { TreePublication } from '$lib/domain/tree-export/tree-publication.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import ConfirmDialog from '$lib/components/shared/dialog/ConfirmDialog.svelte';
	import Upload from '@lucide/svelte/icons/upload';
	import Check from '@lucide/svelte/icons/check';

	interface Props {
		treeId: string;
	}

	let { treeId }: Props = $props();

	let showConfirm = $state(false);
	let publishing = $state(false);
	let publication = $state<TreePublication | null>(null);

	$effect(() => {
		creator.getPublication(treeId).then((p) => (publication = p));
	});

	let isPublished = $derived(publication !== null && publication.version > 0);
	let versionLabel = $derived(
		isPublished ? `v${publication!.version}` : null
	);

	async function handlePublish() {
		publishing = true;
		try {
			await creator.publishTree(treeId);
			publication = await creator.getPublication(treeId);
		} finally {
			publishing = false;
			showConfirm = false;
		}
	}
</script>

<div class="inline-flex items-center gap-2">
	{#if isPublished}
		<Badge variant="secondary" class="gap-1">
			<Check class="size-3" />
			Publicado {versionLabel}
		</Badge>
	{/if}

	<Button
		variant={isPublished ? 'outline' : 'default'}
		size="sm"
		disabled={publishing}
		onclick={() => (showConfirm = true)}
	>
		<Upload class="size-4 mr-1" />
		{#if publishing}
			Publicando…
		{:else if isPublished}
			Republicar
		{:else}
			Publicar
		{/if}
	</Button>
</div>

<ConfirmDialog
	open={showConfirm}
	title={isPublished ? 'Republicar página?' : 'Publicar página?'}
	description={isPublished
		? `A versão publicada será atualizada de v${publication!.version} para v${publication!.version + 1}.`
		: 'Um snapshot imutável será criado. Edições futuras não afetarão a versão publicada.'}
	confirmLabel={isPublished ? 'Republicar' : 'Publicar'}
	confirmVariant="default"
	onconfirm={handlePublish}
	oncancel={() => (showConfirm = false)}
/>
