<script lang="ts">
	import type { PriorityLevel } from '$lib/domain/shared/consumer-state.js';
	import * as Tabs from '$lib/components/ui/tabs/index.js';

	export type PriorityFilterValue = PriorityLevel | 'all';

	interface Props {
		value: PriorityFilterValue;
		onchange: (value: PriorityFilterValue) => void;
	}

	let { value, onchange }: Props = $props();

	const options: { value: PriorityFilterValue; label: string }[] = [
		{ value: 'all', label: 'Todos' },
		{ value: 1, label: 'Alta' },
		{ value: 2, label: 'Média' },
		{ value: 3, label: 'Baixa' }
	];

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
