<script lang="ts">
	import type { Profile } from '$lib/domain/profile/profile.js';
	import type { Font } from '$lib/domain/font/font.js';
	import type { PriorityLevel } from '$lib/domain/shared/consumer-state.js';
	import { consumer } from '$lib/stores/consumer.svelte.js';
	import { createFontStore } from '$lib/persistence/font.store.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import * as Collapsible from '$lib/components/ui/collapsible/index.js';
	import FontCard from '$lib/components/browse/FontCard.svelte';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import User from '@lucide/svelte/icons/user';
	import Star from '@lucide/svelte/icons/star';
	import StarOff from '@lucide/svelte/icons/star-off';
	import ArrowUpRight from '@lucide/svelte/icons/arrow-up-right';

	interface Props {
		profile: Profile;
		profilePageHref: string;
		/** Computes the font page href given a font id */
		fontPageHref: (fontId: string) => string;
	}

	let { profile, profilePageHref, fontPageHref }: Props = $props();

	let open = $state(false);
	let fonts: Font[] = $state([]);
	let loadingFonts = $state(false);
	let loaded = $state(false);

	let entityState = $derived(consumer.stateMap.get(profile.id));
	let currentPriority = $derived(entityState?.priority ?? null);
	let isFavorite = $derived(entityState?.favorite ?? false);
	let isEnabled = $derived(entityState?.enabled ?? true);

	const priorityConfig: Record<PriorityLevel, { label: string }> = {
		1: { label: '1' },
		2: { label: '2' },
		3: { label: '3' }
	};

	async function loadFonts() {
		if (loaded) return;
		loadingFonts = true;
		try {
			const fontStore = createFontStore();
			fonts = await fontStore.getByProfileId(profile.id);
			loaded = true;
		} finally {
			loadingFonts = false;
		}
	}

	function handleOpenChange() {
		open = !open;
		if (open && !loaded) {
			loadFonts();
		}
	}

	async function handlePriority(level: PriorityLevel, e: MouseEvent) {
		e.stopPropagation();
		const newLevel = currentPriority === level ? null : level;
		await consumer.setPriority(profile.id, 'profile', newLevel);
	}

	async function handleFavorite(e: MouseEvent) {
		e.stopPropagation();
		await consumer.setFavorite(profile.id, 'profile', !isFavorite);
	}
</script>

<Collapsible.Root {open} onOpenChange={handleOpenChange}>
	<div class="rounded-lg border border-border bg-card {!isEnabled ? 'opacity-50' : ''}">
		<!-- Header (trigger) -->
		<div class="flex items-center gap-3 p-3">
			<Collapsible.Trigger
				class="flex flex-1 items-center gap-3 text-left transition-colors hover:bg-accent/30 -m-1.5 p-1.5 rounded-md"
			>
				<div class="flex items-center justify-center size-9 shrink-0 rounded-md bg-muted text-muted-foreground">
					<User class="size-4" />
				</div>

				<div class="flex-1 min-w-0">
					<div class="flex items-center gap-2">
						<span class="text-sm font-medium truncate">{profile.title}</span>
						<Badge variant="outline" class="text-[10px] px-1.5 py-0 shrink-0">Profile</Badge>
					</div>
					{#if profile.tags.length > 0}
						<div class="flex flex-wrap gap-1 mt-0.5">
							{#each profile.tags.slice(0, 3) as tag}
								<span class="text-[10px] text-muted-foreground bg-muted rounded px-1.5 py-0.5">{tag}</span>
							{/each}
						</div>
					{/if}
				</div>

				<ChevronRight
					class="size-4 shrink-0 text-muted-foreground transition-transform duration-200 {open ? 'rotate-90' : ''}"
				/>
			</Collapsible.Trigger>

			<!-- Actions inline in header -->
			<!-- svelte-ignore a11y_no_static_element_interactions -->
			<div class="flex items-center gap-1" onclick={(e) => e.stopPropagation()} onkeydown={() => {}}>
				<div class="flex gap-0.5">
					{#each [1, 2, 3] as level}
						{@const pConfig = priorityConfig[level as PriorityLevel]}
						<button
							onclick={(e) => handlePriority(level as PriorityLevel, e)}
							class="inline-flex items-center justify-center size-6 rounded text-[10px] font-bold transition-colors border
								{currentPriority === level
								? level === 1 ? 'bg-destructive text-destructive-foreground border-destructive'
									: level === 2 ? 'bg-secondary text-secondary-foreground border-secondary'
									: 'bg-accent text-accent-foreground border-accent'
								: 'border-border text-muted-foreground hover:bg-accent hover:text-accent-foreground'}"
							aria-label="Prioridade {pConfig.label}"
						>
							{pConfig.label}
						</button>
					{/each}
				</div>

				<button
					onclick={handleFavorite}
					class="inline-flex items-center justify-center size-6 rounded transition-colors
						{isFavorite ? 'text-yellow-500' : 'text-muted-foreground hover:text-foreground'}"
					aria-label={isFavorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
				>
					{#if isFavorite}
						<Star class="size-4 fill-current" />
					{:else}
						<StarOff class="size-4" />
					{/if}
				</button>
			</div>
		</div>

		<!-- Collapsible content -->
		<Collapsible.Content>
			<div class="border-t border-border px-3 py-3">
				<!-- Fonts -->
				{#if loadingFonts}
					<div class="flex flex-col gap-2">
						{#each { length: 2 } as _}
							<div class="animate-pulse rounded border border-border p-3">
								<div class="h-3 w-40 bg-muted rounded mb-1"></div>
								<div class="h-2 w-24 bg-muted rounded"></div>
							</div>
						{/each}
					</div>
				{:else if fonts.length === 0 && loaded}
					<p class="text-xs text-muted-foreground">Nenhuma font neste profile.</p>
				{:else if loaded}
					<div class="flex flex-col gap-2">
						{#each fonts as font (font.id)}
							<FontCard {font} fontPageHref={fontPageHref(font.id)} />
						{/each}
					</div>
				{/if}

				<!-- Redirect button -->
				<a
					href={profilePageHref}
					class="mt-3 flex items-center justify-center gap-2 w-full rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/10 hover:border-primary/50"
				>
					Abrir página do profile
					<ArrowUpRight class="size-4" />
				</a>
			</div>
		</Collapsible.Content>
	</div>
</Collapsible.Root>
