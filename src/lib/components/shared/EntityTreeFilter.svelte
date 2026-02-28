<script lang="ts">
	import type { EntityFilterStore } from '$lib/stores/entity-filter.types.js';
	import * as Collapsible from '$lib/components/ui/collapsible/index.js';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import X from '@lucide/svelte/icons/x';
	import Rss from '@lucide/svelte/icons/rss';
	import User from '@lucide/svelte/icons/user';
	import FileText from '@lucide/svelte/icons/file-text';

	interface Props {
		store: EntityFilterStore;
	}

	let { store }: Props = $props();

	// Track which nodes are open
	let openPages: Record<string, boolean> = $state({});
	let openProfiles: Record<string, boolean> = $state({});

	let pages = $derived(store.getPages());
	let standaloneProfiles = $derived(store.getStandaloneProfiles());
	let totalSelected = $derived(store.totalSelected);
</script>

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

	<!-- Pages with child profiles -->
	{#each pages as page (page.id)}
		{@const isPageOpen = openPages[page.id] ?? false}
		{@const isPageSelected = store.isPageSelected(page.id)}
		{@const pageProfiles = store.getProfiles(page.id)}

		<Collapsible.Root open={isPageOpen} onOpenChange={() => (openPages[page.id] = !openPages[page.id])}>
			<div class="flex items-center gap-0.5">
				<Collapsible.Trigger
					class="flex items-center gap-1 rounded-md px-1 py-1.5 text-sm transition-colors hover:bg-accent hover:text-accent-foreground shrink-0"
				>
					<ChevronRight
						class="size-3.5 shrink-0 transition-transform duration-200 {isPageOpen ? 'rotate-90' : ''}"
					/>
				</Collapsible.Trigger>
				<button
					onclick={() => {
						const wasSelected = store.isPageSelected(page.id);
						store.togglePage(page.id);
						if (!wasSelected) openPages[page.id] = true;
						else openPages[page.id] = false;
					}}
					class="flex w-full items-center gap-2 rounded-md px-1 py-1.5 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground
						{isPageSelected ? 'bg-accent text-accent-foreground' : 'text-muted-foreground'}"
				>
					{#if page.avatarData}
						<img src="data:image/webp;base64,{page.avatarData}" alt="" class="size-4 shrink-0 rounded-sm object-cover" />
					{:else}
						<FileText class="size-3.5 shrink-0" />
					{/if}
					<span class="truncate">{page.title}</span>
					<span class="ml-auto text-xs text-muted-foreground">{page.profileCount}</span>
				</button>
			</div>

			<Collapsible.Content>
				<div class="ml-4 flex flex-col gap-0.5 border-l border-border pl-2 py-0.5">
					{#each pageProfiles as profile (profile.id)}
						{@const isProfileOpen = openProfiles[profile.id] ?? false}
						{@const isProfileSelected = store.isProfileSelected(profile.id)}
						{@const profileFonts = store.getFonts(profile.id)}

						<Collapsible.Root open={isProfileOpen} onOpenChange={() => (openProfiles[profile.id] = !openProfiles[profile.id])}>
							<div class="flex items-center gap-0.5">
								{#if profileFonts.length > 0}
									<Collapsible.Trigger
										class="flex items-center gap-1 rounded-md px-1 py-1 text-sm transition-colors hover:bg-accent/50 shrink-0"
									>
										<ChevronRight
											class="size-3 shrink-0 transition-transform duration-200 {isProfileOpen ? 'rotate-90' : ''}"
										/>
									</Collapsible.Trigger>
								{:else}
									<div class="w-5 shrink-0"></div>
								{/if}
								<button
									onclick={() => {
										const wasSelected = store.isProfileSelected(profile.id);
										store.toggleProfile(profile.id);
										if (!wasSelected) openProfiles[profile.id] = true;
										else openProfiles[profile.id] = false;
									}}
									class="flex w-full items-center gap-2 rounded-md px-1 py-1 text-sm transition-colors text-left
										{isProfileSelected
										? 'bg-accent text-accent-foreground font-medium'
										: 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'}"
								>
									{#if profile.avatar?.data}
										<img src="data:image/webp;base64,{profile.avatar.data}" alt="" class="size-4 shrink-0 rounded-full object-cover" />
									{:else}
										<User class="size-3.5 shrink-0" />
									{/if}
									<span class="truncate">{profile.title}</span>
									{#if profileFonts.length > 0}
										<span class="ml-auto text-xs text-muted-foreground">{profileFonts.length}</span>
									{/if}
								</button>
							</div>

							{#if profileFonts.length > 0}
								<Collapsible.Content>
									<div class="ml-5 flex flex-col gap-0.5 border-l border-border pl-2 py-0.5">
										{#each profileFonts as font (font.id)}
											{@const isFontSelected = store.isFontSelected(font.id)}
											<button
												onclick={() => store.toggleFont(font.id)}
												class="flex w-full items-center gap-2 rounded-md px-1 py-0.5 text-xs transition-colors text-left
													{isFontSelected
													? 'bg-accent text-accent-foreground font-medium'
													: 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'}"
											>
												<Rss class="size-3 shrink-0" />
												<span class="truncate">{font.title}</span>
											</button>
										{/each}
									</div>
								</Collapsible.Content>
							{/if}
						</Collapsible.Root>
					{/each}
				</div>
			</Collapsible.Content>
		</Collapsible.Root>
	{/each}

	<!-- Standalone profiles (no page) -->
	{#each standaloneProfiles as profile (profile.id)}
		{@const isProfileOpen = openProfiles[profile.id] ?? false}
		{@const isProfileSelected = store.isProfileSelected(profile.id)}
		{@const profileFonts = store.getFonts(profile.id)}

		<Collapsible.Root open={isProfileOpen} onOpenChange={() => (openProfiles[profile.id] = !openProfiles[profile.id])}>
			<div class="flex items-center gap-0.5">
				{#if profileFonts.length > 0}
					<Collapsible.Trigger
						class="flex items-center gap-1 rounded-md px-1 py-1.5 text-sm transition-colors hover:bg-accent hover:text-accent-foreground shrink-0"
					>
						<ChevronRight
							class="size-3.5 shrink-0 transition-transform duration-200 {isProfileOpen ? 'rotate-90' : ''}"
						/>
					</Collapsible.Trigger>
				{:else}
					<div class="w-5 shrink-0"></div>
				{/if}
				<button
				onclick={() => {
					const wasSelected = store.isProfileSelected(profile.id);
					store.toggleProfile(profile.id);
					if (!wasSelected) openProfiles[profile.id] = true;
					else openProfiles[profile.id] = false;
				}}
					class="flex w-full items-center gap-2 rounded-md px-1 py-1.5 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground
					{isProfileSelected ? 'bg-accent text-accent-foreground' : 'text-muted-foreground'}"
			>
				{#if profile.avatar?.data}
					<img src="data:image/webp;base64,{profile.avatar.data}" alt="" class="size-4 shrink-0 rounded-full object-cover" />
				{:else}
					<User class="size-3.5 shrink-0" />
				{/if}
					<span class="truncate">{profile.title}</span>
					{#if profileFonts.length > 0}
						<span class="ml-auto text-xs text-muted-foreground">{profileFonts.length}</span>
					{/if}
				</button>
			</div>

			{#if profileFonts.length > 0}
				<Collapsible.Content>
					<div class="ml-4 flex flex-col gap-0.5 border-l border-border pl-2 py-0.5">
						{#each profileFonts as font (font.id)}
							{@const isFontSelected = store.isFontSelected(font.id)}
							<button
								onclick={() => store.toggleFont(font.id)}
								class="flex w-full items-center gap-2 rounded-md px-1 py-0.5 text-xs transition-colors text-left
									{isFontSelected
									? 'bg-accent text-accent-foreground font-medium'
									: 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'}"
							>
								<Rss class="size-3 shrink-0" />
								<span class="truncate">{font.title}</span>
							</button>
						{/each}
					</div>
				</Collapsible.Content>
			{/if}
		</Collapsible.Root>
	{/each}

	{#if pages.length === 0 && standaloneProfiles.length === 0}
		<p class="px-2 text-xs text-muted-foreground">Nenhuma fonte no feed.</p>
	{/if}
</div>
