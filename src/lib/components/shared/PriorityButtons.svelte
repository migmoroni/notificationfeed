<script lang="ts">
	import type { PriorityLevel } from '$lib/domain/shared/consumer-state.js';
	import { PRIORITY_LEVELS, PRIORITY_INACTIVE_CLASS } from '$lib/components/shared/priority.js';

	interface Props {
		/** Currently active priority level, or null if none. */
		current: PriorityLevel | null;
		/** Button size class. Defaults to 'size-6 text-[10px]' (compact). */
		size?: 'sm' | 'md';
		onchange: (level: PriorityLevel | null) => void;
	}

	let { current, size = 'sm', onchange }: Props = $props();

	const sizeClass = $derived(size === 'md' ? 'size-7 text-xs' : 'size-6 text-[10px]');

	function handleClick(level: PriorityLevel, e: MouseEvent) {
		e.stopPropagation();
		e.preventDefault();
		onchange(current === level ? null : level);
	}
</script>

<div class="flex gap-0.5">
	{#each PRIORITY_LEVELS as p (p.level)}
		<button
			onclick={(e) => handleClick(p.level, e)}
			class="inline-flex items-center justify-center {sizeClass} rounded font-bold transition-colors border
				{current === p.level ? p.activeClass : PRIORITY_INACTIVE_CLASS}"
			aria-label="Prioridade {p.name}"
		>
			{p.label}
		</button>
	{/each}
</div>
