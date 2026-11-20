<script lang="ts">
	import { page } from '$app/state';
	import NodeDetailPage from '@notfeed/product/components/shared/entity/NodeDetailPage.svelte';
	import { activityService } from '@notfeed/product/services/activity.service.js';

	const nodeId = $derived(page.params.nodeId!);

	$effect(() => {
		void activityService.record({ type: 'open', targetType: 'node', targetId: nodeId, context: 'library' });
	});
</script>

<NodeDetailPage {nodeId} baseHref="/library" />
