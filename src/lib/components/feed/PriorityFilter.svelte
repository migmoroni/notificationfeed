<script lang="ts">
	import type { PriorityLevel } from '$lib/domain/user/priority-level.js';
	import { PRIORITY_LEVELS } from '$lib/components/shared/priority/priority.js';
	import * as Tabs from '$lib/components/ui/tabs/index.js';
	import { t } from '$lib/i18n/t.js';

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
		const parsed = newValue === 'all' ? 'all' : (Number(newValue) as PriorityLevel);
		onchange(parsed);
	}
</script>

<Tabs.Root value={String(value)} onValueChange={handleChange}>
	<Tabs.List class="h-9">
		{#each options as opt}
			<Tabs.Trigger value={String(opt.value)} class="text-xs px-3">
				{opt.label}
			</Tabs.Trigger>
		{/each}
	</Tabs.List>
</Tabs.Root>
