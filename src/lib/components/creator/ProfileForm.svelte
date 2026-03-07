<script lang="ts">
	import type { ImageAsset } from '$lib/domain/shared/image-asset.js';
	import type { CategoryAssignment } from '$lib/domain/shared/category-assignment.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Switch } from '$lib/components/ui/switch/index.js';
	import ImageUpload from './ImageUpload.svelte';
	import TagInput from './TagInput.svelte';
	import CategoryTreePicker from './CategoryTreePicker.svelte';

	interface ProfileFormData {
		title: string;
		tags: string[];
		avatar: ImageAsset | null;
		categoryAssignments: CategoryAssignment[];
		defaultEnabled: boolean;
	}

	interface Props {
		mode: 'create' | 'edit';
		initial?: ProfileFormData;
		/** Inherited categories from child fonts (shown read-only) */
		inheritedCategories?: CategoryAssignment[];
		onsave: (data: ProfileFormData) => void;
		oncancel: () => void;
		saving?: boolean;
	}

	let { mode, initial, inheritedCategories = [], onsave, oncancel, saving = false }: Props = $props();

	// Capture initial values once (non-reactive locals)
	// svelte-ignore state_referenced_locally
	const _init = initial;
	let title = $state(_init?.title ?? '');
	let tags = $state<string[]>(_init?.tags ?? []);
	let avatar = $state<ImageAsset | null>(_init?.avatar ?? null);
	let categoryAssignments = $state<CategoryAssignment[]>(_init?.categoryAssignments ?? []);
	let defaultEnabled = $state(_init?.defaultEnabled ?? true);

	let isValid = $derived(title.trim().length > 0);

	function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		if (!isValid || saving) return;

		onsave({
			title: title.trim(),
			tags,
			avatar,
			categoryAssignments,
			defaultEnabled
		});
	}
</script>

<form onsubmit={handleSubmit} class="space-y-4">
	<div class="space-y-2">
		<Label for="profile-title">Título *</Label>
		<Input
			id="profile-title"
			bind:value={title}
			placeholder="Nome do profile"
			required
		/>
	</div>

	<div class="space-y-2">
		<Label>Tags</Label>
		<TagInput {tags} onchange={(v) => (tags = v)} />
	</div>

	<ImageUpload
		slot="avatar"
		value={avatar}
		onchange={(v) => (avatar = v)}
		label="Avatar"
	/>

	<CategoryTreePicker
		assignments={categoryAssignments}
		onchange={(v) => (categoryAssignments = v)}
		inherited={inheritedCategories}
	/>

	<div class="flex items-center gap-2">
		<Switch id="profile-enabled" bind:checked={defaultEnabled} />
		<Label for="profile-enabled">Ativo por padrão para consumers</Label>
	</div>

	<div class="flex gap-2 justify-end">
		<Button variant="outline" type="button" onclick={oncancel} disabled={saving}>
			Cancelar
		</Button>
		<Button type="submit" disabled={!isValid || saving}>
			{#if saving}
				Salvando…
			{:else if mode === 'create'}
				Adicionar Profile
			{:else}
				Salvar
			{/if}
		</Button>
	</div>
</form>
