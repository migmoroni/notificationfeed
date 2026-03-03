<script lang="ts">
	import type { ImageAsset } from '$lib/domain/shared/image-asset.js';
	import type { CategoryAssignment } from '$lib/domain/shared/category-assignment.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Textarea } from '$lib/components/ui/textarea/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import ImageUpload from './ImageUpload.svelte';
	import TagInput from './TagInput.svelte';
	import CategoryTreePicker from './CategoryTreePicker.svelte';

	interface PageFormData {
		title: string;
		bio: string;
		tags: string[];
		avatar: ImageAsset | null;
		banner: ImageAsset | null;
		categoryAssignments: CategoryAssignment[];
	}

	interface Props {
		mode: 'create' | 'edit';
		initial?: PageFormData;
		/** Inherited categories from child profiles/fonts (shown read-only) */
		inheritedCategories?: CategoryAssignment[];
		onsave: (data: PageFormData) => void;
		oncancel: () => void;
		saving?: boolean;
	}

	let { mode, initial, inheritedCategories = [], onsave, oncancel, saving = false }: Props = $props();

	let title = $state(initial?.title ?? '');
	let bio = $state(initial?.bio ?? '');
	let tags = $state<string[]>(initial?.tags ?? []);
	let avatar = $state<ImageAsset | null>(initial?.avatar ?? null);
	let banner = $state<ImageAsset | null>(initial?.banner ?? null);
	let categoryAssignments = $state<CategoryAssignment[]>(initial?.categoryAssignments ?? []);

	let isValid = $derived(title.trim().length > 0);

	function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		if (!isValid || saving) return;

		onsave({
			title: title.trim(),
			bio: bio.trim(),
			tags,
			avatar,
			banner,
			categoryAssignments
		});
	}
</script>

<form onsubmit={handleSubmit} class="space-y-6">
	<div class="space-y-2">
		<Label for="page-title">Título *</Label>
		<Input
			id="page-title"
			bind:value={title}
			placeholder="Nome da sua página"
			required
		/>
	</div>

	<div class="space-y-2">
		<Label for="page-bio">Bio</Label>
		<Textarea
			id="page-bio"
			bind:value={bio}
			placeholder="Descreva sua página…"
			rows={3}
		/>
	</div>

	<div class="space-y-2">
		<Label>Tags</Label>
		<TagInput {tags} onchange={(v) => (tags = v)} />
	</div>

	<div class="grid grid-cols-2 gap-6">
		<ImageUpload
			slot="avatar"
			value={avatar}
			onchange={(v) => (avatar = v)}
			label="Avatar"
		/>
		<ImageUpload
			slot="banner"
			value={banner}
			onchange={(v) => (banner = v)}
			label="Banner"
		/>
	</div>

	<CategoryTreePicker
		assignments={categoryAssignments}
		onchange={(v) => (categoryAssignments = v)}
		inherited={inheritedCategories}
	/>

	<div class="flex gap-2 justify-end">
		<Button variant="outline" type="button" onclick={oncancel} disabled={saving}>
			Cancelar
		</Button>
		<Button type="submit" disabled={!isValid || saving}>
			{#if saving}
				Salvando…
			{:else if mode === 'create'}
				Criar Page
			{:else}
				Salvar
			{/if}
		</Button>
	</div>
</form>
