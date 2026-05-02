<script lang="ts">
	import { untrack } from 'svelte';
	import type {
		NodeRole,
		NodeHeader,
		NodeBody,
		CollectionBody,
		ProfileBody,
		FontBody,
		TreeLinkBody,
		ContentTree
	} from '$lib/domain/content-tree/content-tree.js';
	import type { CategoryAssignment } from '$lib/domain/shared/category-assignment.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import NodeHeaderForm from './NodeHeaderForm.svelte';
	import CollectionBodyForm from './CollectionBodyForm.svelte';
	import ProfileBodyForm from './ProfileBodyForm.svelte';
	import FontBodyForm from './FontBodyForm.svelte';
	import TreeLinkBodyForm from './TreeLinkBodyForm.svelte';
	import CategoryTreePicker from './CategoryTreePicker.svelte';
	import AvatarPicker from './AvatarPicker.svelte';
	import MediaUpload from './MediaUpload.svelte';
	import { t } from '$lib/i18n/t.js';

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
		untrack(() =>
			initialHeader ?? {
				title: '',
				categoryAssignments: []
			}
		)
	);

	// Initialize body based on role
	function defaultBody(r: NodeRole): NodeBody {
		switch (r) {
			case 'profile':
				return { role: 'profile', links: [] };
			case 'font':
				return {
					role: 'font',
					protocols: [
						{ id: crypto.randomUUID(), protocol: 'rss', config: { url: '' }, primary: true }
					],
					defaultEnabled: true
				};
			case 'collection':
				return { role: 'collection', links: [] };
			case 'tree':
				return { role: 'tree', instanceTreeId: '' };
		}
	}

	let body = $state<NodeBody>(untrack(() => initialBody ?? defaultBody(role)));

	let isValid = $derived.by(() => {
		if (!header.title.trim()) return false;

		if (body.role === 'font') {
			const fb = body as FontBody;
			if (fb.protocols.length === 0) return false;
			const primaries = fb.protocols.filter((p) => p.primary).length;
			if (primaries !== 1) return false;
			for (const entry of fb.protocols) {
				switch (entry.protocol) {
					case 'rss':
					case 'atom':
					case 'jsonfeed':
						if (!(entry.config as { url: string }).url?.trim()) return false;
						break;
					case 'nostr':
						if (!(entry.config as { pubkey: string }).pubkey?.trim()) return false;
						break;
				}
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
		profile: { create: t('node_form.create_profile'), save: t('btn.save') },
		font: { create: t('node_form.create_font'), save: t('btn.save') },
		collection: { create: t('node_form.create_collection'), save: t('btn.save') },
		tree: { create: t('node_form.create_tree_link'), save: t('btn.save') }
	};
</script>

<form onsubmit={handleSubmit} class="space-y-6">
	<NodeHeaderForm
		{header}
		onchange={(h) => (header = h)}
	/>

	{#if body.role === 'collection'}
		<CollectionBodyForm
			body={body as CollectionBody}
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

	<CategoryTreePicker
		assignments={header.categoryAssignments}
		inherited={inheritedCategories}
		onchange={(categoryAssignments) => (header = { ...header, categoryAssignments })}
	/>

	<div class="rounded-lg border p-4 space-y-4">
		<div>
			<p class="text-sm font-semibold">{t('node_form.images')}</p>
			<p class="text-xs text-muted-foreground mt-0.5">{t('node_form.images_hint')}</p>
		</div>

		<div class="space-y-1.5">
			<span class="text-sm font-medium">{t('node_form.avatar')}</span>
			<AvatarPicker
				mediaId={header.coverMediaId}
				emoji={header.coverEmoji}
				onchange={({ mediaId, emoji }) => (header = { ...header, coverMediaId: mediaId, coverEmoji: emoji })}
			/>
		</div>

		{#if isRoot}
			<MediaUpload
				slot="banner"
				label={t('node_form.banner_hint')}
				mediaId={header.bannerMediaId}
				onchange={(id) => (header = { ...header, bannerMediaId: id })}
			/>
		{/if}
	</div>

	<div class="flex gap-2 justify-end">
		{#if oncancel}
			<Button variant="outline" type="button" onclick={oncancel} disabled={saving}>
				{t('btn.cancel')}
			</Button>
		{/if}
		<Button type="submit" disabled={!isValid || saving}>
			{#if saving}
				{t('node_form.saving')}
			{:else}
				{roleLabels[role][mode === 'create' ? 'create' : 'save']}
			{/if}
		</Button>
	</div>
</form>
