<script lang="ts">
	import type { PriorityLevel } from '$lib/domain/shared/consumer-state.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { PRIORITY_MAP } from '$lib/components/shared/priority/priority.js';

	interface Props {
		level: PriorityLevel;
	}

	let { level }: Props = $props();

	let config = $derived(PRIORITY_MAP[level]);
</script>

<Badge variant={config.badgeVariant}>{config.name}</Badge>
