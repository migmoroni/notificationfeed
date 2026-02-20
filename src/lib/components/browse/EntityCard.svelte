<script lang="ts">
	import type { BrowseEntity } from '$lib/stores/browse.svelte.js';
	import type { ConsumerEntityType, PriorityLevel } from '$lib/domain/shared/consumer-state.js';
	import { consumer } from '$lib/stores/consumer.svelte.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import Globe from '@lucide/svelte/icons/globe';
	import User from '@lucide/svelte/icons/user';
	import Rss from '@lucide/svelte/icons/rss';
	import Star from '@lucide/svelte/icons/star';
	import StarOff from '@lucide/svelte/icons/star-off';
	import ArrowUpRight from '@lucide/svelte/icons/arrow-up-right';
	import ConfirmUnfavoriteDialog from '$lib/components/shared/ConfirmUnfavoriteDialog.svelte';

	interface Props {
		entity: BrowseEntity;
		href?: string | null;
	}

	let { entity, href = null }: Props = $props();

	let showUnfavConfirm = $state(false);

	const typeConfig: Record<BrowseEntity['type'], { label: string; icon: typeof Globe; consumerType: ConsumerEntityType }> = {
		creator_page: { label: 'Page', icon: Globe, consumerType: 'creator_page' },
		profile: { label: 'Profile', icon: User, consumerType: 'profile' },
		font: { label: 'Font', icon: Rss, consumerType: 'font' }
	};

	const priorityConfig: Record<PriorityLevel, { label: string; variant: 'destructive' | 'secondary' | 'outline' }> = {
		1: { label: '1', variant: 'destructive' },
		2: { label: '2', variant: 'secondary' },
		3: { label: '3', variant: 'outline' }
	};

	let config = $derived(typeConfig[entity.type]);
	let entityState = $derived(consumer.stateMap.get(entity.data.id));
	let currentPriority = $derived(entityState?.priority ?? null);
	let isFavorite = $derived(entityState?.favorite ?? false);
	let isEnabled = $derived(entityState?.enabled ?? true);

	async function handlePriority(level: PriorityLevel) {
		const newLevel = currentPriority === level ? null : level;
		await consumer.setPriority(entity.data.id, config.consumerType, newLevel);
	}

	async function handleFavorite(e: MouseEvent) {
		e.preventDefault();
		e.stopPropagation();
		if (isFavorite) {
			showUnfavConfirm = true;
			return;
		}
		await consumer.setFavorite(entity.data.id, config.consumerType, true);
	}

	async function confirmUnfavorite() {
		await consumer.setFavorite(entity.data.id, config.consumerType, false);
		showUnfavConfirm = false;
	}

	async function handleToggleEnabled(e: MouseEvent) {
		e.preventDefault();
		e.stopPropagation();
		await consumer.toggleEnabled(entity.data.id, config.consumerType);
	}

	function stopPropagation(e: MouseEvent) {
		e.preventDefault();
		e.stopPropagation();
	}
</script>

{#snippet cardContent()}
	<div class="flex items-start gap-3 p-3 {!isEnabled ? 'opacity-50' : ''}">
		<!-- Icon -->
		<div class="flex items-center justify-center size-10 shrink-0 rounded-md bg-muted text-muted-foreground">
			<config.icon class="size-5" />
		</div>

		<!-- Body -->
		<div class="flex-1 min-w-0">
			<div class="flex items-center gap-2 mb-0.5">
				<h3 class="text-sm font-semibold truncate">{entity.data.title}</h3>
				<Badge variant="outline" class="text-[10px] px-1.5 py-0 shrink-0">{config.label}</Badge>
			</div>

			{#if entity.data.tags.length > 0}
				<div class="flex flex-wrap gap-1 mt-1">
					{#each entity.data.tags.slice(0, 4) as tag}
						<span class="text-[10px] text-muted-foreground bg-muted rounded px-1.5 py-0.5">{tag}</span>
					{/each}
				</div>
			{/if}

			<!-- Actions row -->
			<!-- svelte-ignore a11y_no_static_element_interactions -->
			<div class="flex items-center gap-2 mt-2" onclick={stopPropagation} onkeydown={() => {}}>
				<!-- Priority buttons -->
				<div class="flex gap-0.5">
					{#each [1, 2, 3] as level}
						{@const pConfig = priorityConfig[level as PriorityLevel]}
						<button
							onclick={(e) => { e.stopPropagation(); handlePriority(level as PriorityLevel); }}
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

				<!-- Favorite toggle -->
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

				<!-- Enabled toggle -->
				<button
					onclick={handleToggleEnabled}
					class="ml-auto text-[10px] px-1.5 py-0.5 rounded transition-colors
						{isEnabled ? 'text-muted-foreground hover:text-foreground' : 'text-destructive'}"
					aria-label={isEnabled ? 'Desativar' : 'Ativar'}
				>
					{isEnabled ? 'Ativo' : 'Inativo'}
				</button>
			</div>
		</div>

		{#if href}
			<ArrowUpRight class="size-4 shrink-0 text-muted-foreground mt-1" />
		{/if}
	</div>
{/snippet}

{#if href}
	<a
		{href}
		class="block rounded-lg border border-border bg-card text-card-foreground transition-colors hover:bg-accent/50"
	>
		{@render cardContent()}
	</a>
{:else}
	<div class="rounded-lg border border-border bg-card text-card-foreground">
		{@render cardContent()}
	</div>
{/if}

<ConfirmUnfavoriteDialog bind:open={showUnfavConfirm} onconfirm={confirmUnfavorite} oncancel={() => (showUnfavConfirm = false)} />
