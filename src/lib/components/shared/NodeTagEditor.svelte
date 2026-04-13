<script lang="ts">
	import type { UserTag } from '$lib/domain/user/user-consumer.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import X from '@lucide/svelte/icons/x';
	import Tag from '@lucide/svelte/icons/tag';

	interface Props {
		/** IDs of tags currently assigned to this node */
		assignedTagIds: string[];
		/** All tags owned by this user */
		userTags: UserTag[];
		/** Called when tag assignment changes (add/remove) */
		onassign: (tagIds: string[]) => void;
		/** Called when user creates a new tag (returns created tag for immediate assignment) */
		oncreate: (name: string) => Promise<UserTag>;
	}

	let { assignedTagIds, userTags, onassign, oncreate }: Props = $props();

	let inputValue = $state('');
	let showSuggestions = $state(false);
	let selectedIndex = $state(-1);

	let assignedTags = $derived(
		assignedTagIds
			.map((id) => userTags.find((t) => t.id === id))
			.filter((t): t is UserTag => t != null)
	);

	let suggestions = $derived.by(() => {
		const query = inputValue.trim().toLowerCase();
		if (!query) return [];
		return userTags
			.filter((t) => !assignedTagIds.includes(t.id) && t.name.includes(query))
			.slice(0, 8);
	});

	let exactMatch = $derived(
		userTags.some((t) => t.name === inputValue.trim().toLowerCase())
	);

	let canCreateNew = $derived(
		inputValue.trim().length > 0 && !exactMatch
	);

	async function addExistingTag(tag: UserTag) {
		onassign([...assignedTagIds, tag.id]);
		inputValue = '';
		showSuggestions = false;
		selectedIndex = -1;
	}

	async function createAndAssign() {
		const name = inputValue.trim().toLowerCase();
		if (!name) return;

		// Check if it already exists but isn't assigned
		const existing = userTags.find((t) => t.name === name);
		if (existing) {
			if (!assignedTagIds.includes(existing.id)) {
				onassign([...assignedTagIds, existing.id]);
			}
		} else {
			const tag = await oncreate(name);
			onassign([...assignedTagIds, tag.id]);
		}

		inputValue = '';
		showSuggestions = false;
		selectedIndex = -1;
	}

	function removeTag(tagId: string) {
		onassign(assignedTagIds.filter((id) => id !== tagId));
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter') {
			e.preventDefault();
			if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
				addExistingTag(suggestions[selectedIndex]);
			} else {
				createAndAssign();
			}
		} else if (e.key === 'ArrowDown') {
			e.preventDefault();
			selectedIndex = Math.min(selectedIndex + 1, suggestions.length - 1);
		} else if (e.key === 'ArrowUp') {
			e.preventDefault();
			selectedIndex = Math.max(selectedIndex - 1, -1);
		} else if (e.key === 'Escape') {
			showSuggestions = false;
			selectedIndex = -1;
		} else if (e.key === 'Backspace' && inputValue === '' && assignedTagIds.length > 0) {
			onassign(assignedTagIds.slice(0, -1));
		}
	}

	function handleInput() {
		showSuggestions = true;
		selectedIndex = -1;
	}

	function handleBlur() {
		// Delay to allow click on suggestion
		setTimeout(() => {
			showSuggestions = false;
			selectedIndex = -1;
		}, 150);
	}
</script>

<div class="space-y-2">
	<div class="flex items-center gap-1.5 text-xs text-muted-foreground">
		<Tag class="size-3" />
		<span>Tags</span>
	</div>

	{#if assignedTags.length > 0}
		<div class="flex flex-wrap gap-1">
			{#each assignedTags as tag (tag.id)}
				<Badge variant="secondary" class="gap-1 pr-1">
					{tag.name}
					<button
						type="button"
						class="ml-0.5 rounded-full hover:bg-muted-foreground/20 p-0.5"
						onclick={() => removeTag(tag.id)}
					>
						<X class="size-3" />
					</button>
				</Badge>
			{/each}
		</div>
	{/if}

	<div class="relative">
		<Input
			bind:value={inputValue}
			placeholder="Adicionar tag…"
			onkeydown={handleKeydown}
			oninput={handleInput}
			onblur={handleBlur}
			onfocus={() => (showSuggestions = true)}
		/>

		{#if showSuggestions && (suggestions.length > 0 || canCreateNew)}
			<div class="absolute z-50 mt-1 w-full rounded-md border bg-popover p-1 shadow-md">
				{#each suggestions as suggestion, i (suggestion.id)}
					<button
						type="button"
						class="w-full text-left px-2 py-1.5 text-sm rounded-sm transition-colors
							{i === selectedIndex ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/50'}"
						onmousedown={(e) => { e.preventDefault(); addExistingTag(suggestion); }}
					>
						{suggestion.name}
					</button>
				{/each}

				{#if canCreateNew}
					<button
						type="button"
						class="w-full text-left px-2 py-1.5 text-sm rounded-sm transition-colors text-primary
							{selectedIndex === suggestions.length ? 'bg-accent' : 'hover:bg-accent/50'}"
						onmousedown={(e) => { e.preventDefault(); createAndAssign(); }}
					>
						Criar "{inputValue.trim().toLowerCase()}"
					</button>
				{/if}
			</div>
		{/if}
	</div>
</div>
