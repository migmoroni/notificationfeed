<script lang="ts">
	import type { CreatorPage } from '$lib/domain/creator-page/creator-page.js';
	import { exportPage } from '$lib/services/export.service.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import Download from '@lucide/svelte/icons/download';

	interface Props {
		page: CreatorPage;
	}

	let { page }: Props = $props();

	let exporting = $state(false);

	let isPublished = $derived(page.publishedVersion > 0);

	async function handleExport() {
		exporting = true;
		try {
			await exportPage(page.id);
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
