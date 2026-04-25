<script lang="ts">
	import { page } from '$app/state';
	import { onMount } from 'svelte';
	import NodeDetailPage from '$lib/components/shared/entity/NodeDetailPage.svelte';
	import { activityService } from '$lib/services/activity.service.js';

	const nodeId = $derived(page.params.nodeId!);

	onMount(() => {
		void activityService.record({ type: 'open', targetType: 'node', targetId: nodeId, context: 'library' });
	});
</script>

<NodeDetailPage {nodeId} baseHref="/library" />
