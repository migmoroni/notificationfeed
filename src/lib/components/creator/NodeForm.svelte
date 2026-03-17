<script lang="ts">
	import type {
		NodeRole,
		ContentNodeHeader,
		ContentNodeBody,
		CreatorBody,
		ProfileBody,
		FontBody
	} from '$lib/domain/content-node/content-node.js';
	import type { CategoryAssignment } from '$lib/domain/shared/category-assignment.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import NodeHeaderForm from './NodeHeaderForm.svelte';
	import CreatorBodyForm from './CreatorBodyForm.svelte';
	import ProfileBodyForm from './ProfileBodyForm.svelte';
	import FontBodyForm from './FontBodyForm.svelte';

	interface Props {
		mode: 'create' | 'edit';
		role: NodeRole;
		initialHeader?: ContentNodeHeader;
		initialBody?: ContentNodeBody;
		/** Inherited category assignments shown dimmed */
		inheritedCategories?: CategoryAssignment[];
		onsave: (data: { header: ContentNodeHeader; body: ContentNodeBody }) => void;
		oncancel?: () => void;
		saving?: boolean;
	}

	let {
		mode,
		role,
		initialHeader,
		initialBody,
		inheritedCategories = [],
		onsave,
		oncancel,
		saving = false
	}: Props = $props();

	// Initialize header with defaults or from initial prop
	let header = $state<ContentNodeHeader>(
		initialHeader ?? {
			title: '',
			tags: [],
			categoryAssignments: []
		}
	);

	// Initialize body based on role
	function defaultBody(r: NodeRole): ContentNodeBody {
		switch (r) {
			case 'creator':
				return { role: 'creator' };
			case 'profile':
				return { role: 'profile', defaultEnabled: true };
			case 'font':
				return { role: 'font', protocol: 'rss', config: { url: '' }, defaultEnabled: true };
		}
	}

	let body = $state<ContentNodeBody>(initialBody ?? defaultBody(role));

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
		font: { create: 'Adicionar Font', save: 'Salvar' }
	};
</script>

<form onsubmit={handleSubmit} class="space-y-6">
	<NodeHeaderForm
		{header}
		onchange={(h) => (header = h)}
		showBanner={role === 'creator'}
		{inheritedCategories}
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
	{/if}

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
