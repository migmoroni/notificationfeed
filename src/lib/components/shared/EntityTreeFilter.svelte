<!--
  EntityTreeFilter — tree-based filter for ContentNodes.

  Uses EntityFilterStore which navigates ContentTree paths
  instead of N:N junction tables.
-->
<script lang="ts">
	import type { EntityFilterStore, NodeEntry } from '$lib/stores/entity-filter.types.js';
	import type { ContentNode } from '$lib/domain/content-node/content-node.js';
	import { isFontNode } from '$lib/domain/content-node/content-node.js';
	import * as Collapsible from '$lib/components/ui/collapsible/index.js';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import X from '@lucide/svelte/icons/x';
	import Rss from '@lucide/svelte/icons/rss';
	import Atom from '@lucide/svelte/icons/atom';
	import Zap from '@lucide/svelte/icons/zap';
	import User from '@lucide/svelte/icons/user';
	import FileText from '@lucide/svelte/icons/file-text';

	interface Props {
		store: EntityFilterStore;
	}

	let { store }: Props = $props();

	// Branch open states
	let openCreators: Record<string, boolean> = $derived.by(() => {
		const result: Record<string, boolean> = {};
		for (const c of store.getCreators()) {
			if (store.isCreatorSelected(c.id)) result[c.id] = true;
		}
		return result;
	});

	let openProfiles: Record<string, boolean> = $derived.by(() => {
		const result: Record<string, boolean> = {};
		for (const entry of store.getProfiles()) {
			if (store.isProfileSelected(entry.node.metadata.id)) result[entry.node.metadata.id] = true;
		}
		for (const n of store.getStandaloneProfiles()) {
			if (store.isProfileSelected(n.metadata.id)) result[n.metadata.id] = true;
		}
		return result;
	});

	let branchManual: Record<string, boolean> = $state({});

	function hasCreatorBranchSelection(): boolean {
		if (store.selectedCreatorIds.size > 0) return true;
		for (const c of store.getCreators()) {
			for (const p of store.getProfiles(c.id)) {
				if (store.isProfileSelected(p.node.metadata.id)) return true;
				for (const f of store.getFonts(p.node.metadata.id)) {
					if (store.isFontSelected(f.node.metadata.id)) return true;
				}
			}
		}
		return false;
	}

	function hasProfileBranchSelection(): boolean {
		for (const p of store.getStandaloneProfiles()) {
			if (store.isProfileSelected(p.metadata.id)) return true;
			for (const f of store.getFonts(p.metadata.id)) {
				if (store.isFontSelected(f.node.metadata.id)) return true;
			}
		}
		return false;
	}

	function isBranchOpen(key: string): boolean {
		if (key in branchManual) return branchManual[key];
		if (key === 'creators') return hasCreatorBranchSelection();
		if (key === 'profiles') return hasProfileBranchSelection();
		return false;
	}

	function toggleBranch(key: string) {
		branchManual[key] = !isBranchOpen(key);
	}

	let creators = $derived(store.getCreators());
	let standaloneProfiles = $derived(store.getStandaloneProfiles());
	let totalSelected = $derived(store.totalSelected);

	function fontProtocolIcon(node: ContentNode) {
		if (!isFontNode(node)) return Rss;
		const proto = node.data.body.protocol;
		if (proto === 'atom') return Atom;
		if (proto === 'nostr') return Zap;
		return Rss;
	}
</script>

<!-- ═══ Font node snippet ═══ -->
{#snippet fontNode(entry: NodeEntry)}
	{@const node = entry.node}
	{@const isSelected = store.isFontSelected(node.metadata.id)}
	<button
		onclick={() => store.toggleFont(node.metadata.id)}
		class="ml-5 flex w-full items-stretch rounded-md overflow-hidden text-sm transition-colors text-left
			{isSelected
			? 'bg-accent text-accent-foreground font-medium'
			: 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'}"
	>
		<div class="flex items-center justify-center shrink-0 px-1 py-2">
			<svelte:component this={fontProtocolIcon(node)} class="size-3.5 shrink-0" />
		</div>
		<div class="flex items-center gap-2 flex-1 min-w-0 px-1 py-2">
			<span class="truncate">{node.data.header.title}</span>
		</div>
	</button>
{/snippet}

<!-- ═══ Profile node snippet ═══ -->
{#snippet profileNode(entry: NodeEntry)}
	{@const node = entry.node}
	{@const isOpen = openProfiles[node.metadata.id] ?? false}
	{@const isSelected = store.isProfileSelected(node.metadata.id)}
	{@const profileFonts = store.getFonts(node.metadata.id)}

	<Collapsible.Root open={isOpen}>
		<div class="flex items-center gap-0.5">
			{#if profileFonts.length > 0}
				<div class="flex items-center gap-1 px-1 py-2 shrink-0">
					<ChevronRight
						class="size-3 shrink-0 transition-transform duration-200 {isOpen ? 'rotate-90' : ''}"
					/>
				</div>
			{:else}
				<div class="w-5 shrink-0"></div>
			{/if}
			<button
				onclick={() => store.toggleProfile(node.metadata.id)}
				class="flex w-full items-stretch rounded-md overflow-hidden text-sm transition-colors text-left
					{isSelected
					? 'bg-accent text-accent-foreground font-medium'
					: 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'}"
			>
				<div class="flex items-center justify-center shrink-0 px-1 py-2">
					<User class="size-3.5 shrink-0" />
				</div>
				<div class="flex items-center gap-2 flex-1 min-w-0 px-1 py-2">
					<span class="truncate">{node.data.header.title}</span>
					{#if profileFonts.length > 0}
						<span class="ml-auto text-xs text-muted-foreground">{profileFonts.length}</span>
					{/if}
				</div>
			</button>
		</div>

		{#if profileFonts.length > 0}
			<Collapsible.Content>
				<div class="ml-4 flex flex-col gap-0.5 border-l border-border pl-2 py-0.5">
					{#if entry.section}
						<div class="rounded border mt-0.5 mb-0.5" style="border-left: 2px solid {entry.section.color};">
							<div class="flex items-center gap-1 px-1 py-0.5">
								{#if !entry.section.hideTitle}
									<span class="text-xs" style="color:{entry.section.color};">{entry.section.symbol}</span>
									<span class="text-[10px] font-medium text-muted-foreground">{entry.section.title}</span>
								{/if}
							</div>
							<div class="flex flex-col gap-0.5 px-0.5 pb-0.5">
								{#each profileFonts as fontEntry (fontEntry.node.metadata.id)}
									{@render fontNode(fontEntry)}
								{/each}
							</div>
						</div>
					{:else}
						{#each profileFonts as fontEntry (fontEntry.node.metadata.id)}
							{@render fontNode(fontEntry)}
						{/each}
					{/if}
				</div>
			</Collapsible.Content>
		{/if}
	</Collapsible.Root>
{/snippet}

<!-- ═══ Standalone profile snippet (for profiles not in any tree) ═══ -->
{#snippet standaloneProfileNode(node: ContentNode)}
	{@const isOpen = openProfiles[node.metadata.id] ?? false}
	{@const isSelected = store.isProfileSelected(node.metadata.id)}
	{@const profileFonts = store.getFonts(node.metadata.id)}

	<Collapsible.Root open={isOpen}>
		<div class="flex items-center gap-0.5">
			{#if profileFonts.length > 0}
				<div class="flex items-center gap-1 px-1 py-2 shrink-0">
					<ChevronRight class="size-3 shrink-0 transition-transform duration-200 {isOpen ? 'rotate-90' : ''}" />
				</div>
			{:else}
				<div class="w-5 shrink-0"></div>
			{/if}
			<button
				onclick={() => store.toggleProfile(node.metadata.id)}
				class="flex w-full items-stretch rounded-md overflow-hidden text-sm transition-colors text-left
					{isSelected
					? 'bg-accent text-accent-foreground font-medium'
					: 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'}"
			>
				<div class="flex items-center justify-center shrink-0 px-1 py-2">
					<User class="size-3.5 shrink-0" />
				</div>
				<div class="flex items-center gap-2 flex-1 min-w-0 px-1 py-2">
					<span class="truncate">{node.data.header.title}</span>
					{#if profileFonts.length > 0}
						<span class="ml-auto text-xs text-muted-foreground">{profileFonts.length}</span>
					{/if}
				</div>
			</button>
		</div>

		{#if profileFonts.length > 0}
			<Collapsible.Content>
				<div class="ml-4 flex flex-col gap-0.5 border-l border-border pl-2 py-0.5">
					{#each profileFonts as fontEntry (fontEntry.node.metadata.id)}
						{@render fontNode(fontEntry)}
					{/each}
				</div>
			</Collapsible.Content>
		{/if}
	</Collapsible.Root>
{/snippet}

<div class="flex flex-col gap-0.5">
	<div class="flex items-center justify-between px-2 mb-1">
		<span class="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Fontes</span>
		{#if totalSelected > 0}
			<button
				onclick={() => store.clearAll()}
				class="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
				aria-label="Limpar filtro de fontes"
			>
				<X class="size-3" />
				{totalSelected}
			</button>
		{/if}
	</div>

	<!-- Branch: Creators (replaces Pages) -->
	{#if creators.length > 0}
	<Collapsible.Root open={isBranchOpen('creators')} onOpenChange={() => toggleBranch('creators')}>
		<Collapsible.Trigger
			class="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground text-muted-foreground"
		>
			<ChevronRight
				class="size-4 shrink-0 transition-transform duration-200 {isBranchOpen('creators') ? 'rotate-90' : ''}"
			/>
			<span>Creators</span>
			<span class="ml-auto text-xs text-muted-foreground">{creators.length}</span>
		</Collapsible.Trigger>
		<Collapsible.Content>
			<div class="ml-4 flex flex-col gap-0.5 border-l border-border pl-2 py-0.5">
	{#each creators as creator (creator.id)}
		{@const isOpen = openCreators[creator.id] ?? false}
		{@const isSelected = store.isCreatorSelected(creator.id)}
		{@const creatorProfiles = store.getProfiles(creator.id)}

		<Collapsible.Root open={isOpen}>
			<div class="flex items-center gap-0.5">
				<div class="flex items-center gap-1 px-1 py-2 shrink-0">
					<ChevronRight
						class="size-3.5 shrink-0 transition-transform duration-200 {isOpen ? 'rotate-90' : ''}"
					/>
				</div>
				<button
					onclick={() => store.toggleCreator(creator.id)}
					class="flex w-full items-stretch rounded-md overflow-hidden text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground
						{isSelected ? 'bg-accent text-accent-foreground' : 'text-muted-foreground'}"
				>
					<div class="flex items-center justify-center shrink-0 px-1 py-2">
						<FileText class="size-3.5 shrink-0" />
					</div>
					<div class="flex items-center gap-2 flex-1 min-w-0 px-1 py-2">
						<span class="truncate">{creator.title}</span>
						<span class="ml-auto text-xs text-muted-foreground">{creator.profileCount}</span>
					</div>
				</button>
			</div>

			<Collapsible.Content>
				<div class="ml-4 flex flex-col gap-0.5 border-l border-border pl-2 py-0.5">
					{#each creatorProfiles as profileEntry (profileEntry.node.metadata.id)}
						{@render profileNode(profileEntry)}
					{/each}
				</div>
			</Collapsible.Content>
		</Collapsible.Root>
	{/each}
			</div>
		</Collapsible.Content>
	</Collapsible.Root>
	{/if}

	<!-- Branch: Standalone profiles -->
	{#if standaloneProfiles.length > 0}
	<Collapsible.Root open={isBranchOpen('profiles')} onOpenChange={() => toggleBranch('profiles')}>
		<Collapsible.Trigger
			class="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground text-muted-foreground"
		>
			<ChevronRight
				class="size-4 shrink-0 transition-transform duration-200 {isBranchOpen('profiles') ? 'rotate-90' : ''}"
			/>
			<span>Perfis</span>
			<span class="ml-auto text-xs text-muted-foreground">{standaloneProfiles.length}</span>
		</Collapsible.Trigger>
		<Collapsible.Content>
			<div class="ml-4 flex flex-col gap-0.5 border-l border-border pl-2 py-0.5">
				{#each standaloneProfiles as profile (profile.metadata.id)}
					{@render standaloneProfileNode(profile)}
				{/each}
			</div>
		</Collapsible.Content>
	</Collapsible.Root>
	{/if}

	{#if creators.length === 0 && standaloneProfiles.length === 0}
		<p class="px-2 text-xs text-muted-foreground">Nenhuma fonte disponível.</p>
	{/if}
</div>
