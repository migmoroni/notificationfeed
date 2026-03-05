<script lang="ts">
	import type { EntityFilterStore } from '$lib/stores/entity-filter.types.js';
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

	// Open state derived from selection — selected items stay expanded across remounts
	let openPages: Record<string, boolean> = $derived.by(() => {
		const result: Record<string, boolean> = {};
		for (const page of store.getPages()) {
			if (store.isPageSelected(page.id)) result[page.id] = true;
		}
		return result;
	});
	let openProfiles: Record<string, boolean> = $derived.by(() => {
		const result: Record<string, boolean> = {};
		for (const p of [...store.getProfiles(), ...store.getStandaloneProfiles()]) {
			if (store.isProfileSelected(p.id)) result[p.id] = true;
		}
		return result;
	});

	// Branch-level open: auto-open when there are selections, collapsed otherwise.
	// Manual override respected until selection state changes.
	let branchManual: Record<string, boolean> = $state({});

	function hasPageBranchSelection(): boolean {
		if (store.selectedPageIds.size > 0) return true;
		for (const page of store.getPages()) {
			for (const p of store.getProfiles(page.id)) {
				if (store.isProfileSelected(p.id)) return true;
				for (const f of store.getFonts(p.id)) {
					if (store.isFontSelected(f.id)) return true;
				}
			}
		}
		return false;
	}

	function hasProfileBranchSelection(): boolean {
		for (const p of store.getStandaloneProfiles()) {
			if (store.isProfileSelected(p.id)) return true;
			for (const f of store.getFonts(p.id)) {
				if (store.isFontSelected(f.id)) return true;
			}
		}
		return false;
	}

	function isBranchOpen(key: string): boolean {
		if (key in branchManual) return branchManual[key];
		if (key === 'pages') return hasPageBranchSelection();
		if (key === 'profiles') return hasProfileBranchSelection();
		return false;
	}
	function toggleBranch(key: string) {
		branchManual[key] = !isBranchOpen(key);
	}

	let pages = $derived(store.getPages());
	let standaloneProfiles = $derived(store.getStandaloneProfiles());
	let totalSelected = $derived(store.totalSelected);
</script>

<!-- ═══ Font node snippet ═══ -->
{#snippet fontNode(font: import('$lib/domain/font/font.js').Font)}
	{@const isFontSelected = store.isFontSelected(font.id)}
	<button
		onclick={() => store.toggleFont(font.id)}
		class="ml-5 flex w-full items-stretch rounded-md overflow-hidden text-sm transition-colors text-left
			{isFontSelected
			? 'bg-accent text-accent-foreground font-medium'
			: 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'}"
	>
		{#if font.avatar?.data}
			<div class="shrink-0 w-10">
				<img src="data:image/webp;base64,{font.avatar.data}" alt="" class="w-full h-full object-cover" />
			</div>
		{:else}
			<div class="flex items-center justify-center shrink-0 px-1 py-2">
				{#if font.protocol === 'atom'}
					<Atom class="size-3.5 shrink-0" />
				{:else if font.protocol === 'nostr'}
					<Zap class="size-3.5 shrink-0" />
				{:else}
					<Rss class="size-3.5 shrink-0" />
				{/if}
			</div>
		{/if}
		<div class="flex items-center gap-2 flex-1 min-w-0 px-1 py-2">
			<span class="truncate">{font.title}</span>
		</div>
	</button>
{/snippet}

<!-- ═══ Profile node snippet (with fonts) ═══ -->
{#snippet profileNode(profile: import('$lib/domain/profile/profile.js').Profile)}
	{@const isProfileOpen = openProfiles[profile.id] ?? false}
	{@const isProfileSelected = store.isProfileSelected(profile.id)}
	{@const profileFonts = store.getFonts(profile.id)}

	<Collapsible.Root open={isProfileOpen}>
		<div class="flex items-center gap-0.5">
			{#if profileFonts.length > 0}
				<div class="flex items-center gap-1 px-1 py-2 shrink-0">
					<ChevronRight
						class="size-3 shrink-0 transition-transform duration-200 {isProfileOpen ? 'rotate-90' : ''}"
					/>
				</div>
			{:else}
				<div class="w-5 shrink-0"></div>
			{/if}
			<button
				onclick={() => store.toggleProfile(profile.id)}
				class="flex w-full items-stretch rounded-md overflow-hidden text-sm transition-colors text-left
					{isProfileSelected
					? 'bg-accent text-accent-foreground font-medium'
					: 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'}"
			>
				{#if profile.avatar?.data}
					<div class="shrink-0 w-10">
						<img src="data:image/webp;base64,{profile.avatar.data}" alt="" class="w-full h-full object-cover" />
					</div>
				{:else}
					<div class="flex items-center justify-center shrink-0 px-1 py-2">
						<User class="size-3.5 shrink-0" />
					</div>
				{/if}
				<div class="flex items-center gap-2 flex-1 min-w-0 px-1 py-2">
					<span class="truncate">{profile.title}</span>
					{#if profileFonts.length > 0}
						<span class="ml-auto text-xs text-muted-foreground">{profileFonts.length}</span>
					{/if}
				</div>
			</button>
		</div>

		{#if profileFonts.length > 0}
			<Collapsible.Content>
				{@const profSections = store.getSections('profile', profile.id)}
				<div class="ml-4 flex flex-col gap-0.5 border-l border-border pl-2 py-0.5">
					{#if profSections.length > 0}
						{#each profSections as section (section.id)}
							{@const sectionFonts = profileFonts.filter((f) => f.sectionId === section.id)}
							{#if sectionFonts.length > 0}
								<div class="rounded border mt-0.5 mb-0.5" style="border-left: 2px solid {section.color};">
									<div class="flex items-center gap-1 px-1 py-0.5">
										{#if !section.hideTitle}
											<span class="text-xs" style="color:{section.color};">{section.emoji}</span>
											<span class="text-[10px] font-medium text-muted-foreground">{section.title}</span>
										{/if}
									</div>
									<div class="flex flex-col gap-0.5 px-0.5 pb-0.5">
										{#each sectionFonts as font (font.id)}
											{@render fontNode(font)}
										{/each}
									</div>
								</div>
							{/if}
						{/each}
						{#each profileFonts.filter((f) => f.sectionId === null) as font (font.id)}
							{@render fontNode(font)}
						{/each}
					{:else}
						{#each profileFonts as font (font.id)}
							{@render fontNode(font)}
						{/each}
					{/if}
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

	<!-- Branch: Pages -->
	{#if pages.length > 0}
	<Collapsible.Root open={isBranchOpen('pages')} onOpenChange={() => toggleBranch('pages')}>
		<Collapsible.Trigger
			class="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground text-muted-foreground"
		>
			<ChevronRight
				class="size-4 shrink-0 transition-transform duration-200 {isBranchOpen('pages') ? 'rotate-90' : ''}"
			/>
			<span>Páginas</span>
			<span class="ml-auto text-xs text-muted-foreground">{pages.length}</span>
		</Collapsible.Trigger>
		<Collapsible.Content>
			<div class="ml-4 flex flex-col gap-0.5 border-l border-border pl-2 py-0.5">
	{#each pages as page (page.id)}
		{@const isPageOpen = openPages[page.id] ?? false}
		{@const isPageSelected = store.isPageSelected(page.id)}
		{@const pageProfiles = store.getProfiles(page.id)}

		<Collapsible.Root open={isPageOpen}>
			<div class="flex items-center gap-0.5">
				<div class="flex items-center gap-1 px-1 py-2 shrink-0">
					<ChevronRight
						class="size-3.5 shrink-0 transition-transform duration-200 {isPageOpen ? 'rotate-90' : ''}"
					/>
				</div>
				<button
					onclick={() => store.togglePage(page.id)}
					class="flex w-full items-stretch rounded-md overflow-hidden text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground
						{isPageSelected ? 'bg-accent text-accent-foreground' : 'text-muted-foreground'}"
				>
					{#if page.avatarData}
						<div class="shrink-0 w-10">
							<img src="data:image/webp;base64,{page.avatarData}" alt="" class="w-full h-full object-cover" />
						</div>
					{:else}
						<div class="flex items-center justify-center shrink-0 px-1 py-2">
							<FileText class="size-3.5 shrink-0" />
						</div>
					{/if}
					<div class="flex items-center gap-2 flex-1 min-w-0 px-1 py-2">
						<span class="truncate">{page.title}</span>
						<span class="ml-auto text-xs text-muted-foreground">{page.profileCount}</span>
					</div>
				</button>
			</div>

			<Collapsible.Content>
				{@const pageSections = store.getSections('creator', page.id)}
				<div class="ml-4 flex flex-col gap-0.5 border-l border-border pl-2 py-0.5">
					{#if pageSections.length > 0}
						<!-- Sectioned layout -->
						{#each pageSections as section (section.id)}
							{@const sectionProfiles = pageProfiles.filter((p) => p.sectionId === section.id)}
							{#if sectionProfiles.length > 0}
								<div class="rounded border mt-1 mb-0.5" style="border-left: 3px solid {section.color};">
									<div class="flex items-center gap-1.5 px-1.5 py-1">
										{#if !section.hideTitle}
											<span class="text-sm" style="color:{section.color};">{section.emoji}</span>
											<span class="text-[11px] font-medium text-muted-foreground flex-1">{section.title}</span>
										{:else}
											<span class="flex-1"></span>
										{/if}
									</div>
									<div class="flex flex-col gap-0.5 px-0.5 pb-0.5">
										{#each sectionProfiles as profile (profile.id)}
											{@render profileNode(profile)}
										{/each}
									</div>
								</div>
							{/if}
						{/each}
						<!-- Unsectioned profiles -->
						{#each pageProfiles.filter((p) => p.sectionId === null) as profile (profile.id)}
							{@render profileNode(profile)}
						{/each}
					{:else}
						{#each pageProfiles as profile (profile.id)}
							{@render profileNode(profile)}
						{/each}
					{/if}
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
	{#each standaloneProfiles as profile (profile.id)}
		{@render profileNode(profile)}
	{/each}
			</div>
		</Collapsible.Content>
	</Collapsible.Root>
	{/if}

	{#if pages.length === 0 && standaloneProfiles.length === 0}
		<p class="px-2 text-xs text-muted-foreground">Nenhuma fonte no feed.</p>
	{/if}
</div>
