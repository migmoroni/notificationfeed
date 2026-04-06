<script lang="ts">
	import type {
		NodeRole,
		NodeHeader,
		NodeBody,
		CreatorBody,
		ProfileBody,
		FontBody,
		TreeLinkBody,
		ContentTree
	} from '$lib/domain/content-tree/content-tree.js';
	import type { CategoryAssignment } from '$lib/domain/shared/category-assignment.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import NodeHeaderForm from './NodeHeaderForm.svelte';
	import CreatorBodyForm from './CreatorBodyForm.svelte';
	import ProfileBodyForm from './ProfileBodyForm.svelte';
	import FontBodyForm from './FontBodyForm.svelte';
	import TreeLinkBodyForm from './TreeLinkBodyForm.svelte';
	import TagInput from './TagInput.svelte';
	import CategoryTreePicker from './CategoryTreePicker.svelte';
	import AvatarPicker from './AvatarPicker.svelte';
	import MediaUpload from './MediaUpload.svelte';

	interface Props {
		mode: 'create' | 'edit';
		role: NodeRole;
		/** Whether this form is editing a root node (controls banner, tags visibility) */
		isRoot?: boolean;
		initialHeader?: NodeHeader;
		initialBody?: NodeBody;
		/** Inherited category assignments shown dimmed */
		inheritedCategories?: CategoryAssignment[];
		/** Available trees for tree-link selection (only needed when role='tree') */
		availableTrees?: ContentTree[];
		onsave: (data: { header: NodeHeader; body: NodeBody }) => void;
		oncancel?: () => void;
		saving?: boolean;
	}

	let {
		mode,
		role,
		isRoot = false,
		initialHeader,
		initialBody,
		inheritedCategories = [],
		availableTrees = [],
		onsave,
		oncancel,
		saving = false
	}: Props = $props();

	// Initialize header with defaults or from initial prop
	let header = $state<NodeHeader>(
		initialHeader ?? {
			title: '',
			tags: [],
			categoryAssignments: []
		}
	);

	// Initialize body based on role
	function defaultBody(r: NodeRole): NodeBody {
		switch (r) {
			case 'creator':
				return { role: 'creator', links: [] };
			case 'profile':
				return { role: 'profile', links: [] };
			case 'font':
				return { role: 'font', protocol: 'rss', config: { url: '' }, defaultEnabled: true };
			case 'collection':
				return { role: 'collection' };
			case 'tree':
				return { role: 'tree', instanceTreeId: '' };
		}
	}

	let body = $state<NodeBody>(initialBody ?? defaultBody(role));

	let isValid = $derived.by(() => {
		if (!header.title.trim()) return false;

		if (body.role === 'font') {
			const fb = body as FontBody;
			switch (fb.protocol) {
				case 'rss':
					return !!(fb.config as { url: string }).url?.trim();
				case 'atom':
					return !!(fb.config as { url: string }).url?.trim();
				case 'nostr':
					return !!(fb.config as { pubkey: string }).pubkey?.trim();
			}
		}

		if (body.role === 'tree') {
			return !!(body as TreeLinkBody).instanceTreeId;
		}

		return true;
	});

	function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		if (!isValid) return;
		onsave({ header, body });
	}

	const roleLabels: Record<NodeRole, { create: string; save: string }> = {
		creator: { create: 'Criar Página', save: 'Salvar' },
		profile: { create: 'Adicionar Profile', save: 'Salvar' },
		font: { create: 'Adicionar Font', save: 'Salvar' },
		collection: { create: 'Criar Collection', save: 'Salvar' },
		tree: { create: 'Criar Tree Link', save: 'Salvar' }
	};
</script>

<form onsubmit={handleSubmit} class="space-y-6">
	<NodeHeaderForm
		{header}
		onchange={(h) => (header = h)}
	/>

	{#if body.role === 'creator'}
		<CreatorBodyForm
			body={body as CreatorBody}
			onchange={(b) => (body = b)}
		/>
	{:else if body.role === 'profile'}
		<ProfileBodyForm
			body={body as ProfileBody}
			onchange={(b) => (body = b)}
		/>
	{:else if body.role === 'font'}
		<FontBodyForm
			body={body as FontBody}
			onchange={(b) => (body = b)}
		/>
	{:else if body.role === 'tree'}
		<TreeLinkBodyForm
			body={body as TreeLinkBody}
			onchange={(b) => (body = b)}
			{availableTrees}
		/>
	{/if}

	{#if isRoot}
		<TagInput
			tags={header.tags}
			onchange={(tags) => (header = { ...header, tags })}
		/>
	{/if}

	<CategoryTreePicker
		assignments={header.categoryAssignments}
		inherited={inheritedCategories}
		onchange={(categoryAssignments) => (header = { ...header, categoryAssignments })}
	/>

	<div class="rounded-lg border p-4 space-y-4">
		<div>
			<p class="text-sm font-semibold">Imagens</p>
			<p class="text-xs text-muted-foreground mt-0.5">Escolha imagens que representem esta página.</p>
		</div>

		<div class="space-y-1.5">
			<span class="text-sm font-medium">Avatar</span>
			<AvatarPicker
				mediaId={header.coverMediaId}
				emoji={header.coverEmoji}
				onchange={({ mediaId, emoji }) => (header = { ...header, coverMediaId: mediaId, coverEmoji: emoji })}
			/>
		</div>

		{#if isRoot}
			<MediaUpload
				slot="banner"
				label="Banner — capa exibida no topo"
				mediaId={header.bannerMediaId}
				onchange={(id) => (header = { ...header, bannerMediaId: id })}
			/>
		{/if}
	</div>

	<div class="flex gap-2 justify-end">
		{#if oncancel}
			<Button variant="outline" type="button" onclick={oncancel} disabled={saving}>
				Cancelar
			</Button>
		{/if}
		<Button type="submit" disabled={!isValid || saving}>
			{#if saving}
				Salvando…
			{:else}
				{roleLabels[role][mode === 'create' ? 'create' : 'save']}
			{/if}
		</Button>
	</div>
</form>
