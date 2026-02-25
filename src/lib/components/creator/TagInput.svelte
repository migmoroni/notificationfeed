<script lang="ts">
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import X from '@lucide/svelte/icons/x';

	interface Props {
		tags: string[];
		onchange: (tags: string[]) => void;
		placeholder?: string;
	}

	let { tags, onchange, placeholder = 'Adicionar tag…' }: Props = $props();

	let inputValue = $state('');

	function addTag() {
		const trimmed = inputValue.trim().toLowerCase();
		if (trimmed && !tags.includes(trimmed)) {
			onchange([...tags, trimmed]);
		}
		inputValue = '';
	}

	function removeTag(tag: string) {
		onchange(tags.filter((t) => t !== tag));
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter') {
			e.preventDefault();
			addTag();
		} else if (e.key === 'Backspace' && inputValue === '' && tags.length > 0) {
			onchange(tags.slice(0, -1));
		}
	}
</script>

<div class="space-y-2">
	{#if tags.length > 0}
		<div class="flex flex-wrap gap-1">
			{#each tags as tag}
				<Badge variant="secondary" class="gap-1 pr-1">
					{tag}
					<button
						type="button"
						class="ml-0.5 rounded-full hover:bg-muted-foreground/20 p-0.5"
						onclick={() => removeTag(tag)}
					>
						<X class="size-3" />
					</button>
				</Badge>
			{/each}
		</div>
	{/if}
	<Input
		bind:value={inputValue}
		{placeholder}
		onkeydown={handleKeydown}
		onblur={addTag}
	/>
</div>
