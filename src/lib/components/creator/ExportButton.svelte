<script lang="ts">
	import { creator } from '$lib/stores/creator.svelte.js';
	import type { TreePublication } from '$lib/domain/tree-export/tree-publication.js';
	import { TREE_EXPORT_EXTENSION, TREE_EXPORT_MIME } from '$lib/domain/tree-export/tree-export.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import Download from '@lucide/svelte/icons/download';

	interface Props {
		treeId: string;
	}

	let { treeId }: Props = $props();

	let exporting = $state(false);
	let publication = $state<TreePublication | null>(null);

	$effect(() => {
		creator.getPublication(treeId).then((p) => (publication = p));
	});

	let isPublished = $derived(publication !== null && publication.version > 0);

	async function handleExport() {
		if (!publication?.snapshot) return;
		exporting = true;
		try {
			const json = JSON.stringify(publication.snapshot, null, 2);
			const blob = new Blob([json], { type: TREE_EXPORT_MIME });
			const url = URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			const tree = creator.trees.find((t) => t.metadata.id === treeId);
			const rootNode = tree ? creator.getRootNode(treeId) : null;
			const name = rootNode?.data.header.title ?? 'export';
			const safeName = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
			a.download = `${safeName}${TREE_EXPORT_EXTENSION}`;
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
			URL.revokeObjectURL(url);
		} catch (err) {
			console.error('Export failed:', err);
		} finally {
			exporting = false;
		}
	}
</script>

<Button
	variant="outline"
	size="sm"
	disabled={!isPublished || exporting}
	onclick={handleExport}
	title={isPublished ? 'Exportar .notfeed.json' : 'Publique a página antes de exportar'}
>
	<Download class="size-4 mr-1" />
	{exporting ? 'Exportando…' : 'Exportar'}
</Button>
