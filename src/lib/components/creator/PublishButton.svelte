<script lang="ts">
	import type { CreatorPage } from '$lib/domain/creator-page/creator-page.js';
	import { creator } from '$lib/stores/creator.svelte.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import ConfirmDialog from '$lib/components/shared/ConfirmDialog.svelte';
	import Upload from '@lucide/svelte/icons/upload';
	import Check from '@lucide/svelte/icons/check';

	interface Props {
		page: CreatorPage;
	}

	let { page }: Props = $props();

	let showConfirm = $state(false);
	let publishing = $state(false);

	let isPublished = $derived(page.publishedSnapshot !== null);
	let versionLabel = $derived(
		isPublished ? `v${page.publishedVersion}` : null
	);

	async function handlePublish() {
		publishing = true;
		try {
			await creator.publishPage(page.id);
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
		? `A versão publicada será atualizada de v${page.publishedVersion} para v${page.publishedVersion + 1}.`
		: 'Um snapshot imutável será criado. Edições futuras não afetarão a versão publicada.'}
	confirmLabel={isPublished ? 'Republicar' : 'Publicar'}
	confirmVariant="default"
	onconfirm={handlePublish}
	oncancel={() => (showConfirm = false)}
/>
