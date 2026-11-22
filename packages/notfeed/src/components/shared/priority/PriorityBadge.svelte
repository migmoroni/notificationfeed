<script lang="ts">
	import type { PriorityLevel } from '../../../domain/user/priority-level.js';
	import { Badge } from '../../ui/badge/index.js';
	import { PRIORITY_MAP } from './priority.js';
	import { t } from '../../../i18n/t.js';

	interface Props {
		level: PriorityLevel;
	}

	let { level }: Props = $props();

	let config = $derived(PRIORITY_MAP[level]);
</script>

<Badge variant={config.badgeVariant}>{t(config.nameKey)}</Badge>
