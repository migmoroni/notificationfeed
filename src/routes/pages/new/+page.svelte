<script lang="ts">
	import { goto } from '$app/navigation';
	import { layout } from '$lib/stores/layout.svelte.js';
	import { activeUser } from '$lib/stores/active-user.svelte.js';
	import { creator } from '$lib/stores/creator.svelte.js';
	import type { NodeRole } from '$lib/domain/content-tree/content-tree.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';
	import Newspaper from '@lucide/svelte/icons/newspaper';
	import Library from '@lucide/svelte/icons/library';
	import { t } from '$lib/i18n/t.js';

	type RootRole = 'profile' | 'collection';

	const rootRoleOptions = $derived([{
		value: 'profile' as RootRole,
		label: t('role.profile'),
		description: t('role.profile_description'),
		icon: Newspaper
	}, {
		value: 'collection' as RootRole,
		label: t('role.collection'),
		description: t('role.collection_description'),
		icon: Library
	}]);

	let selectedRole = $state<RootRole>('collection');
	let title = $state('');
	let saving = $state(false);
	let error = $state('');

	let isValid = $derived(title.trim().length > 0);

	async function handleCreate() {
		if (!activeUser.isCreator || !isValid) return;
		saving = true;
		error = '';
		try {
			const tree = await creator.createTree(selectedRole, title.trim());
			goto(`/pages/${tree.metadata.id}`, { replaceState: true });
		} catch (e) {
			// Tree may have been created — check if we can navigate anyway
			const lastTree = creator.trees.at(-1);
			if (lastTree) {
				goto(`/pages/${lastTree.metadata.id}`, { replaceState: true });
			} else {
				error = t('error.create_page');
				saving = false;
			}
		}
	}
</script>

<svelte:head>
	<title>{t('page_title.new_page')}</title>
</svelte:head>

<div class="container mx-auto px-4 py-6 {layout.isExpanded ? 'max-w-xl' : 'max-w-md'}">
	<button onclick={() => history.back()} class="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
		<ArrowLeft class="size-4" />
		{t('btn.back')}
	</button>

	<h1 class="text-xl font-bold mb-2">{t('title.new_page')}</h1>
	<p class="text-sm text-muted-foreground mb-6">{t('new_page.choose_hint')}</p>

	<!-- Step 1: Role selection -->
	<div class="space-y-2 mb-6">
		<Label>{t('new_page.page_type')}</Label>
		<div class="grid gap-2">
			{#each rootRoleOptions as opt}
				{@const Icon = opt.icon}
				<button
					type="button"
					class="flex items-center gap-3 p-3 rounded-lg border text-left transition-colors {selectedRole === opt.value ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'border-border hover:bg-muted/50'}"
					onclick={() => (selectedRole = opt.value)}
				>
					<div class="shrink-0 size-9 rounded-md flex items-center justify-center {selectedRole === opt.value ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}">
						<Icon class="size-4" />
					</div>
					<div class="flex-1 min-w-0">
						<div class="text-sm font-medium">{opt.label}</div>
						<div class="text-xs text-muted-foreground">{opt.description}</div>
					</div>
				</button>
			{/each}
		</div>
	</div>

	<!-- Step 2: Title -->
	<form onsubmit={(e) => { e.preventDefault(); handleCreate(); }} class="space-y-4">
		<div class="space-y-2">
			<Label for="page-title">{t('pages.page_name_label')} *</Label>
			<Input
				id="page-title"
				bind:value={title}
				placeholder={t('new_page.name_placeholder')}
				required
				autofocus
			/>
		</div>

		{#if error}
			<p class="text-sm text-destructive">{error}</p>
		{/if}

		<div class="flex gap-2 justify-end pt-2">
			<Button variant="outline" type="button" onclick={() => history.back()} disabled={saving}>
				{t('btn.cancel')}
			</Button>
			<Button type="submit" disabled={!isValid || saving}>
				{saving ? t('new_page.creating') : t('new_page.create_and_configure')}
			</Button>
		</div>
	</form>
</div>
