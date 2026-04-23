<script lang="ts">
	import { page } from '$app/state';
	import NodeDetailPage from '$lib/components/shared/entity/NodeDetailPage.svelte';

	const nodeId = $derived(page.params.nodeId!);
</script>

<NodeDetailPage {nodeId} baseHref="/library" />
