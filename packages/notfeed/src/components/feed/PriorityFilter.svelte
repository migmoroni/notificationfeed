<script lang="ts">
	import type { PriorityLevel } from '../../domain/user/priority-level.js';
	import { PRIORITY_LEVELS } from '../shared/priority/priority.js';
	import * as Tabs from '../ui/tabs/index.js';
	import { t } from '../../i18n/t.js';

	export type PriorityFilterValue = PriorityLevel | 'all';

	interface Props {
		value: PriorityFilterValue;
		onchange: (value: PriorityFilterValue) => void;
	}

	let { value, onchange }: Props = $props();

	const options: { value: PriorityFilterValue; label: string }[] = $derived([
		{ value: 'all', label: t('feed.priority_all') },
		...PRIORITY_LEVELS.map((p) => ({ value: p.level, label: t(p.nameKey) }))
	]);

	function handleChange(newValue: string) {
		onchange(newValue as PriorityFilterValue);
	}
</script>

<Tabs.Root {value} onValueChange={handleChange}>
	<Tabs.List class="h-9">
		{#each options as opt}
			<Tabs.Trigger value={opt.value} class="text-xs px-3">
				{opt.label}
			</Tabs.Trigger>
		{/each}
	</Tabs.List>
</Tabs.Root>
