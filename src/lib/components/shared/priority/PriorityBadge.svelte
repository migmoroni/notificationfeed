<script lang="ts">
	import type { PriorityLevel } from '$lib/domain/user/priority-level.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { PRIORITY_MAP } from '$lib/components/shared/priority/priority.js';
	import { t } from '$lib/i18n/t.js';

	interface Props {
		level: PriorityLevel;
	}

	let { level }: Props = $props();

	let config = $derived(PRIORITY_MAP[level]);
</script>

<Badge variant={config.badgeVariant}>{t(config.nameKey)}</Badge>
