<script lang="ts">
	import type { Profile } from '$lib/domain/profile/profile.js';
	import type { Font } from '$lib/domain/font/font.js';
	import { copyProfilesToCreator } from '$lib/services/copy-consumer.service.js';
	import { creator } from '$lib/stores/creator.svelte.js';
	import { createProfileStore } from '$lib/persistence/profile.store.js';
	import { createProfileFontStore } from '$lib/persistence/profile-font.store.js';
	import { createFontStore } from '$lib/persistence/font.store.js';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import Copy from '@lucide/svelte/icons/copy';
	import User from '@lucide/svelte/icons/user';
	import Rss from '@lucide/svelte/icons/rss';
	import Check from '@lucide/svelte/icons/check';
	import { onMount } from 'svelte';

	interface Props {
		open: boolean;
		pageId: string;
		creatorId: string;
		onclose: () => void;
	}

	let { open = $bindable(), pageId, creatorId, onclose }: Props = $props();

	let profiles = $state<(Profile & { fonts: Font[] })[]>([]);
	let selectedIds = $state<Set<string>>(new Set());
	let loading = $state(true);
	let copying = $state(false);

	const profileRepo = createProfileStore();
	const pfRepo = createProfileFontStore();
	const fontRepo = createFontStore();

	$effect(() => {
		if (open) loadConsumerProfiles();
	});

	async function loadConsumerProfiles() {
		loading = true;
		try {
			const allProfiles = await profileRepo.getAll();
			const consumerProfiles = allProfiles.filter((p) => p.ownerType === 'consumer');

			const withFonts = await Promise.all(
				consumerProfiles.map(async (p) => {
					const pfs = await pfRepo.getByProfileId(p.id);
					const fonts = await Promise.all(pfs.map((pf) => fontRepo.getById(pf.fontId)));
					return { ...p, fonts: fonts.filter((f): f is Font => f !== null) };
				})
			);
			profiles = withFonts;
		} finally {
			loading = false;
		}
	}

	function toggleSelect(profileId: string) {
		const next = new Set(selectedIds);
		if (next.has(profileId)) next.delete(profileId);
		else next.add(profileId);
		selectedIds = next;
	}

	async function handleCopy() {
		if (selectedIds.size === 0) return;
		copying = true;
		try {
			await copyProfilesToCreator(Array.from(selectedIds), creatorId, pageId);
			await creator.reload();
			selectedIds = new Set();
			onclose();
		} finally {
			copying = false;
		}
	}
</script>

<Dialog.Root bind:open onOpenChange={(v) => { if (!v) onclose(); }}>
	<Dialog.Content class="sm:max-w-lg max-h-[80vh] overflow-y-auto">
		<Dialog.Header>
			<Dialog.Title class="flex items-center gap-2">
				<Copy class="size-5" />
				Copiar do Consumer
			</Dialog.Title>
			<Dialog.Description>
				Selecione profiles para copiar. Uma cópia independente será criada no espaço do creator.
			</Dialog.Description>
		</Dialog.Header>

		{#if loading}
			<div class="py-8 text-center">
				<span class="text-sm text-muted-foreground animate-pulse">Carregando…</span>
			</div>
		{:else if profiles.length === 0}
			<div class="py-8 text-center">
				<p class="text-sm text-muted-foreground">Nenhum profile encontrado no ambiente consumer.</p>
			</div>
		{:else}
			<div class="space-y-2 py-2">
				{#each profiles as profile (profile.id)}
					{@const isSelected = selectedIds.has(profile.id)}
					<button
						type="button"
						class="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border text-left transition-colors {isSelected
							? 'border-primary bg-primary/5'
							: 'hover:bg-muted/50'}"
						onclick={() => toggleSelect(profile.id)}
					>
						{#if isSelected}
							<div class="size-5 rounded-full bg-primary flex items-center justify-center shrink-0">
								<Check class="size-3 text-primary-foreground" />
							</div>
						{:else}
							<div class="size-5 rounded-full border-2 shrink-0"></div>
						{/if}

						<div class="flex-1 min-w-0">
							<div class="flex items-center gap-2">
								<User class="size-3.5 text-muted-foreground" />
								<span class="font-medium text-sm truncate">{profile.title}</span>
							</div>
							<div class="flex items-center gap-1 mt-0.5">
								<Rss class="size-3 text-muted-foreground" />
								<span class="text-xs text-muted-foreground">
									{profile.fonts.length} font{profile.fonts.length !== 1 ? 's' : ''}
								</span>
								{#each profile.tags.slice(0, 3) as tag}
									<Badge variant="outline" class="text-[10px] h-4">{tag}</Badge>
								{/each}
							</div>
						</div>
					</button>
				{/each}
			</div>
		{/if}

		<Dialog.Footer>
			<Button variant="outline" onclick={onclose} disabled={copying}>Cancelar</Button>
			<Button
				disabled={selectedIds.size === 0 || copying}
				onclick={handleCopy}
			>
				{#if copying}
					Copiando…
				{:else}
					Copiar {selectedIds.size} profile{selectedIds.size !== 1 ? 's' : ''}
				{/if}
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
