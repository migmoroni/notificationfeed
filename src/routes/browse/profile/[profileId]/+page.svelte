<script lang="ts">
	import { page } from '$app/state';
	import NodeDetailPage from '$lib/components/shared/entity/NodeDetailPage.svelte';

	const nodeId = $derived(page.params.profileId!);
</script>

<NodeDetailPage {nodeId} baseHref="/browse" />
