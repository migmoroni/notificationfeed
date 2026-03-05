<script lang="ts">
	import type { Profile } from '$lib/domain/profile/profile.js';
	import type { Font, NewFont } from '$lib/domain/font/font.js';
	import type { NewProfile } from '$lib/domain/profile/profile.js';
	import type { Section, SectionContainerType } from '$lib/domain/section/section.js';
	import { creator } from '$lib/stores/creator.svelte.js';
	import { createImagePreviewUrl } from '$lib/services/image.service.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Separator } from '$lib/components/ui/separator/index.js';
	import * as Collapsible from '$lib/components/ui/collapsible/index.js';
	import ProfileForm from './ProfileForm.svelte';
	import FontForm from './FontForm.svelte';
	import ConfirmDialog from '$lib/components/shared/dialog/ConfirmDialog.svelte';
	import Plus from '@lucide/svelte/icons/plus';
	import ChevronDown from '@lucide/svelte/icons/chevron-down';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import Pencil from '@lucide/svelte/icons/pencil';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import Rss from '@lucide/svelte/icons/rss';
	import Atom from '@lucide/svelte/icons/atom';
	import Zap from '@lucide/svelte/icons/zap';
	import User from '@lucide/svelte/icons/user';
	import FolderPlus from '@lucide/svelte/icons/folder-plus';
	import Folder from '@lucide/svelte/icons/folder';
	import X from '@lucide/svelte/icons/x';
	import ArrowUp from '@lucide/svelte/icons/arrow-up';
	import ArrowDown from '@lucide/svelte/icons/arrow-down';

	const SECTION_COLORS = [
		'#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f97316',
		'#eab308', '#22c55e', '#14b8a6', '#06b6d4', '#3b82f6'
	];

	interface Props {
		pageId: string;
	}

	let { pageId }: Props = $props();

	// UI state
	let showAddProfile = $state(false);
	let addProfileToSectionId = $state<string | null>(null);
	let editingProfileId = $state<string | null>(null);
	let addFontToProfileId = $state<string | null>(null);
	let editingFontId = $state<string | null>(null);
	let deleteConfirm = $state<{ type: 'profile' | 'font' | 'section'; id: string; title: string } | null>(null);
	let expandedProfiles = $state<Set<string>>(new Set());
	let saving = $state(false);

	// Section inline creation state
	let addingSectionFor = $state<{ containerType: SectionContainerType; containerId: string } | null>(null);
	let newSectionTitle = $state('');
	let newSectionColor = $state(SECTION_COLORS[0]);
	let editingSectionId = $state<string | null>(null);
	let editSectionTitle = $state('');
	let editSectionColor = $state('');

	// Font section add state
	let addingFontSectionForProfileId = $state<string | null>(null);
	let newFontSectionTitle = $state('');
	let newFontSectionColor = $state(SECTION_COLORS[0]);

	let profiles = $derived(creator.getProfilesForPage(pageId));
	let pageSections = $derived(creator.getSectionsForContainer('creator', pageId));
	let unsectionedProfiles = $derived(profiles.filter((p) => p.sectionId === null));

	// Group profiles by sectionId
	let profilesBySection = $derived.by(() => {
		const grouped = new Map<string | null, Profile[]>();
		for (const p of profiles) {
			const key = p.sectionId;
			if (!grouped.has(key)) grouped.set(key, []);
			grouped.get(key)!.push(p);
		}
		return grouped;
	});

	function toggleExpand(profileId: string) {
		const next = new Set(expandedProfiles);
		if (next.has(profileId)) next.delete(profileId);
		else next.add(profileId);
		expandedProfiles = next;
	}

	// ── Section CRUD ─────────────────────────────────────────────────

	async function handleCreateSection(containerType: SectionContainerType, containerId: string) {
		const title = newSectionTitle.trim();
		if (!title || title.length > 30) return;

		saving = true;
		try {
			const siblings = creator.getSectionsForContainer(containerType, containerId);
			await creator.createSection(containerType, containerId, {
				title,
				color: newSectionColor,
				order: siblings.length
			});
			newSectionTitle = '';
			newSectionColor = SECTION_COLORS[(siblings.length + 1) % SECTION_COLORS.length];
			addingSectionFor = null;
		} finally {
			saving = false;
		}
	}

	async function handleCreateFontSection(profileId: string) {
		const title = newFontSectionTitle.trim();
		if (!title || title.length > 30) return;

		saving = true;
		try {
			const siblings = creator.getSectionsForContainer('profile', profileId);
			await creator.createSection('profile', profileId, {
				title,
				color: newFontSectionColor,
				order: siblings.length
			});
			newFontSectionTitle = '';
			newFontSectionColor = SECTION_COLORS[(siblings.length + 1) % SECTION_COLORS.length];
			addingFontSectionForProfileId = null;
		} finally {
			saving = false;
		}
	}

	function startEditSection(section: Section) {
		editingSectionId = section.id;
		editSectionTitle = section.title;
		editSectionColor = section.color;
	}

	async function handleUpdateSection() {
		if (!editingSectionId) return;
		const title = editSectionTitle.trim();
		if (!title || title.length > 30) return;

		saving = true;
		try {
			await creator.updateSection(editingSectionId, { title, color: editSectionColor });
			editingSectionId = null;
		} finally {
			saving = false;
		}
	}

	async function handleMoveSectionUp(containerId: string, section: Section) {
		const siblings = creator.getSectionsForContainer('creator', containerId);
		const idx = siblings.findIndex((s) => s.id === section.id);
		if (idx <= 0) return;
		const ids = siblings.map((s) => s.id);
		[ids[idx - 1], ids[idx]] = [ids[idx], ids[idx - 1]];
		await creator.reorderSections(containerId, ids);
	}

	async function handleMoveSectionDown(containerId: string, section: Section) {
		const siblings = creator.getSectionsForContainer('creator', containerId);
		const idx = siblings.findIndex((s) => s.id === section.id);
		if (idx < 0 || idx >= siblings.length - 1) return;
		const ids = siblings.map((s) => s.id);
		[ids[idx], ids[idx + 1]] = [ids[idx + 1], ids[idx]];
		await creator.reorderSections(containerId, ids);
	}

	// ── Profile CRUD ─────────────────────────────────────────────────

	async function handleAddProfile(data: Omit<NewProfile, 'ownerType' | 'ownerId' | 'creatorPageId' | 'sectionId'>, sectionId: string | null = null) {
		saving = true;
		try {
			const profile = await creator.createProfile({ ...data, creatorPageId: pageId, sectionId });
			showAddProfile = false;
			addProfileToSectionId = null;
			expandedProfiles = new Set([...expandedProfiles, profile.id]);
		} finally {
			saving = false;
		}
	}

	async function handleUpdateProfile(profileId: string, data: Partial<NewProfile>) {
		saving = true;
		try {
			await creator.updateProfile(profileId, data);
			editingProfileId = null;
		} finally {
			saving = false;
		}
	}

	async function handleDeleteProfile(profileId: string) {
		await creator.deleteProfile(profileId);
		deleteConfirm = null;
	}

	async function handleMoveProfileToSection(profileId: string, sectionId: string | null) {
		await creator.updateProfile(profileId, { sectionId });
	}

	// ── Font CRUD ────────────────────────────────────────────────────

	async function handleAddFont(profileId: string, data: Omit<NewFont, 'profileId' | 'sectionId'>, sectionId: string | null = null) {
		saving = true;
		try {
			await creator.createFont({ ...data, profileId, sectionId });
			addFontToProfileId = null;
		} finally {
			saving = false;
		}
	}

	async function handleUpdateFont(fontId: string, data: Partial<NewFont>) {
		saving = true;
		try {
			await creator.updateFont(fontId, data);
			editingFontId = null;
		} finally {
			saving = false;
		}
	}

	async function handleDeleteFont(fontId: string) {
		await creator.deleteFont(fontId);
		deleteConfirm = null;
	}

	async function handleMoveFontToSection(fontId: string, sectionId: string | null) {
		await creator.updateFont(fontId, { sectionId });
	}
</script>

<!-- ═══ Font card snippet ═══ -->
{#snippet fontCard(font: Font, profileId: string, profileSections: Section[])}
	<div class="flex items-center gap-2 px-3 py-2 rounded-md border bg-background text-sm">
		{#if font.avatar?.data}
			<div class="shrink-0 w-7 h-7 rounded overflow-hidden bg-muted">
				<img src={createImagePreviewUrl(font.avatar)} alt="" class="w-full h-full object-cover" />
			</div>
		{:else}
			<div class="shrink-0 w-7 h-7 rounded bg-muted flex items-center justify-center text-muted-foreground">
				{#if font.protocol === 'atom'}
					<Atom class="size-3.5" />
				{:else if font.protocol === 'nostr'}
					<Zap class="size-3.5" />
				{:else}
					<Rss class="size-3.5" />
				{/if}
			</div>
		{/if}
		<span class="flex-1 truncate">{font.title}</span>
		<Badge variant="outline" class="text-[10px] uppercase">{font.protocol}</Badge>
		{#if profileSections.length > 0}
			<select
				class="h-6 text-[10px] rounded border bg-background px-1"
				value={font.sectionId ?? ''}
				onchange={(e) => handleMoveFontToSection(font.id, e.currentTarget.value || null)}
			>
				<option value="">Sem seção</option>
				{#each profileSections as s}
					<option value={s.id}>{s.title}</option>
				{/each}
			</select>
		{/if}
		<button type="button" class="p-1 hover:bg-accent rounded" onclick={() => (editingFontId = font.id)}>
			<Pencil class="size-3 text-muted-foreground" />
		</button>
		<button type="button" class="p-1 hover:bg-destructive/10 rounded" onclick={() => (deleteConfirm = { type: 'font', id: font.id, title: font.title })}>
			<Trash2 class="size-3 text-destructive" />
		</button>
	</div>

	{#if editingFontId === font.id}
		<div class="border rounded-lg p-3 bg-muted/20">
			<FontForm
				mode="edit"
				initial={{
					title: font.title,
					tags: font.tags,
					avatar: font.avatar,
					protocol: font.protocol,
					config: font.config,
					categoryAssignments: font.categoryAssignments ?? [],
					defaultEnabled: font.defaultEnabled
				}}
				onsave={(data) => handleUpdateFont(font.id, data)}
				oncancel={() => (editingFontId = null)}
				{saving}
			/>
		</div>
	{/if}
{/snippet}

<!-- ═══ Font list inside a profile (with font-level sections) ═══ -->
{#snippet fontList(profile: Profile)}
	{@const fonts = creator.getFontsForProfile(profile.id)}
	{@const profileSections = creator.getSectionsForContainer('profile', profile.id)}
	{@const fontsBySection = (() => { const m = new Map<string | null, Font[]>(); for (const f of fonts) { const k = f.sectionId; if (!m.has(k)) m.set(k, []); m.get(k)!.push(f); } return m; })()}
	{@const unsectionedFonts = fontsBySection.get(null) ?? []}

	<div class="space-y-2">
		<div class="flex items-center justify-between">
			<span class="text-xs font-medium text-muted-foreground">Fonts ({fonts.length})</span>
			<div class="flex gap-1">
				<Button variant="ghost" size="sm" class="h-7 text-xs" onclick={() => (addingFontSectionForProfileId = profile.id)}>
					<FolderPlus class="size-3 mr-1" />
					Seção
				</Button>
				<Button variant="ghost" size="sm" class="h-7 text-xs" onclick={() => (addFontToProfileId = profile.id)}>
					<Plus class="size-3 mr-1" />
					Font
				</Button>
			</div>
		</div>

		<!-- Inline font section creation -->
		{#if addingFontSectionForProfileId === profile.id}
			<div class="flex items-center gap-2 border rounded-lg p-2 bg-muted/20">
				<Folder class="size-4 text-muted-foreground shrink-0" />
				<Input
					class="h-7 text-xs flex-1"
					placeholder="Nome da seção (max 30)"
					maxlength={30}
					bind:value={newFontSectionTitle}
					onkeydown={(e) => { if (e.key === 'Enter') handleCreateFontSection(profile.id); }}
				/>
				<div class="flex gap-0.5 shrink-0">
					{#each SECTION_COLORS as c}
						<button
							type="button"
							aria-label="Cor {c}"
							class="w-4 h-4 rounded-full border-2 transition-transform"
							style="background:{c}; border-color:{newFontSectionColor === c ? 'white' : c}; {newFontSectionColor === c ? 'transform:scale(1.25)' : ''}"
							onclick={() => (newFontSectionColor = c)}
						></button>
					{/each}
				</div>
				<Button variant="outline" size="sm" class="h-7 text-xs" disabled={saving || !newFontSectionTitle.trim()} onclick={() => handleCreateFontSection(profile.id)}>
					Criar
				</Button>
				<button type="button" class="p-1 hover:bg-accent rounded" onclick={() => (addingFontSectionForProfileId = null)}>
					<X class="size-3.5" />
				</button>
			</div>
		{/if}

		<!-- Font-level sections -->
		{#each profileSections as section (section.id)}
			{@const sectionFonts = fontsBySection.get(section.id) ?? []}
			{#if editingSectionId === section.id}
				<!-- Editing section inline -->
				<div class="flex items-center gap-2 p-2 rounded-lg border" style="border-left: 3px solid {section.color};">
					<Input class="h-7 text-xs flex-1" maxlength={30} bind:value={editSectionTitle} onkeydown={(e) => { if (e.key === 'Enter') handleUpdateSection(); }} />
					<div class="flex gap-0.5 shrink-0">
						{#each SECTION_COLORS as c}
							<button type="button" aria-label="Cor {c}" class="w-4 h-4 rounded-full border-2 transition-transform" style="background:{c}; border-color:{editSectionColor === c ? 'white' : c}; {editSectionColor === c ? 'transform:scale(1.25)' : ''}" onclick={() => (editSectionColor = c)}></button>
						{/each}
					</div>
					<Button variant="outline" size="sm" class="h-7 text-xs" disabled={saving || !editSectionTitle.trim()} onclick={() => handleUpdateSection()}>Salvar</Button>
					<button type="button" class="p-1 hover:bg-accent rounded" onclick={() => (editingSectionId = null)}>
						<X class="size-3.5" />
					</button>
				</div>
			{:else}
				<div class="rounded-lg border" style="border-left: 3px solid {section.color};">
					<div class="flex items-center gap-2 px-3 py-1.5">
						<Folder class="size-3.5" style="color:{section.color};" />
						<span class="text-xs font-medium flex-1">{section.title}</span>
						<Badge variant="outline" class="text-[10px]">{sectionFonts.length}</Badge>
						<button type="button" class="p-0.5 hover:bg-accent rounded" onclick={() => handleMoveSectionUp(profile.id, section)}>
							<ArrowUp class="size-3 text-muted-foreground" />
						</button>
						<button type="button" class="p-0.5 hover:bg-accent rounded" onclick={() => handleMoveSectionDown(profile.id, section)}>
							<ArrowDown class="size-3 text-muted-foreground" />
						</button>
						<button type="button" class="p-0.5 hover:bg-accent rounded" onclick={() => startEditSection(section)}>
							<Pencil class="size-3 text-muted-foreground" />
						</button>
						<button type="button" class="p-0.5 hover:bg-destructive/10 rounded" onclick={() => (deleteConfirm = { type: 'section', id: section.id, title: section.title })}>
							<Trash2 class="size-3 text-destructive" />
						</button>
					</div>
					{#if sectionFonts.length > 0}
						<div class="px-3 pb-2 space-y-1">
							{#each sectionFonts as font (font.id)}
								{@render fontCard(font, profile.id, profileSections)}
							{/each}
						</div>
					{/if}
				</div>
			{/if}
		{/each}

		<!-- Unsectioned fonts -->
		{#if unsectionedFonts.length > 0}
			{#if profileSections.length > 0}
				<div class="text-[10px] text-muted-foreground uppercase tracking-wider px-1 pt-1">Sem seção</div>
			{/if}
			{#each unsectionedFonts as font (font.id)}
				{@render fontCard(font, profile.id, profileSections)}
			{/each}
		{/if}

		<!-- Add font form -->
		{#if addFontToProfileId === profile.id}
			<div class="border rounded-lg p-3 bg-muted/20">
				<FontForm
					mode="create"
					onsave={(data) => handleAddFont(profile.id, data)}
					oncancel={() => (addFontToProfileId = null)}
					{saving}
				/>
			</div>
		{/if}

		{#if fonts.length === 0 && addFontToProfileId !== profile.id}
			<p class="text-xs text-muted-foreground text-center py-2">Nenhuma font. Adicione uma feed source.</p>
		{/if}
	</div>
{/snippet}

<!-- ═══ Profile card snippet ═══ -->
{#snippet profileCard(profile: Profile)}
	{@const fonts = creator.getFontsForProfile(profile.id)}
	{@const isExpanded = expandedProfiles.has(profile.id)}

	<div class="border rounded-lg">
		<div
			role="button"
			tabindex="0"
			class="w-full flex items-center gap-2 px-4 py-3 text-left hover:bg-muted/50 transition-colors cursor-pointer"
			onclick={() => toggleExpand(profile.id)}
			onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleExpand(profile.id); } }}
		>
			{#if isExpanded}
				<ChevronDown class="size-4 shrink-0 text-muted-foreground" />
			{:else}
				<ChevronRight class="size-4 shrink-0 text-muted-foreground" />
			{/if}
			{#if profile.avatar?.data}
				<div class="shrink-0 w-8 h-8 rounded-md overflow-hidden bg-muted">
					<img src={createImagePreviewUrl(profile.avatar)} alt="" class="w-full h-full object-cover" />
				</div>
			{:else}
				<div class="shrink-0 w-8 h-8 rounded-md bg-muted flex items-center justify-center text-muted-foreground">
					<User class="size-4" />
				</div>
			{/if}
			<span class="font-medium text-sm flex-1">{profile.title}</span>
			<Badge variant="outline" class="text-xs">{fonts.length} font{fonts.length !== 1 ? 's' : ''}</Badge>
			{#if pageSections.length > 0}
				<select
					class="h-6 text-[10px] rounded border bg-background px-1"
					value={profile.sectionId ?? ''}
					onclick={(e) => e.stopPropagation()}
					onchange={(e) => { e.stopPropagation(); handleMoveProfileToSection(profile.id, e.currentTarget.value || null); }}
				>
					<option value="">Sem seção</option>
					{#each pageSections as s}
						<option value={s.id}>{s.title}</option>
					{/each}
				</select>
			{/if}
			<button
				type="button"
				class="p-1 hover:bg-accent rounded"
				onclick={(e) => { e.stopPropagation(); editingProfileId = profile.id; expandedProfiles = new Set([...expandedProfiles, profile.id]); }}
			>
				<Pencil class="size-3.5 text-muted-foreground" />
			</button>
			<button
				type="button"
				class="p-1 hover:bg-destructive/10 rounded"
				onclick={(e) => { e.stopPropagation(); deleteConfirm = { type: 'profile', id: profile.id, title: profile.title }; }}
			>
				<Trash2 class="size-3.5 text-destructive" />
			</button>
		</div>

		{#if isExpanded}
			<div class="px-4 pb-4 space-y-3">
				<Separator />

				{#if editingProfileId === profile.id}
					<ProfileForm
						mode="edit"
						initial={{
							title: profile.title,
							tags: profile.tags,
							avatar: profile.avatar,
							categoryAssignments: profile.categoryAssignments,
							defaultEnabled: profile.defaultEnabled
						}}
						onsave={(data) => handleUpdateProfile(profile.id, data)}
						oncancel={() => (editingProfileId = null)}
						{saving}
					/>
				{/if}

				{@render fontList(profile)}
			</div>
		{/if}
	</div>
{/snippet}

<!-- ═══ Main template ═══ -->
<div class="space-y-4">
	<!-- Header -->
	<div class="flex items-center justify-between">
		<h3 class="text-sm font-semibold">Profiles ({profiles.length})</h3>
		<div class="flex gap-1">
			<Button variant="outline" size="sm" onclick={() => { addingSectionFor = { containerType: 'creator', containerId: pageId }; }}>
				<FolderPlus class="size-4 mr-1" />
				Seção
			</Button>
			<Button variant="outline" size="sm" onclick={() => { showAddProfile = true; addProfileToSectionId = null; }}>
				<Plus class="size-4 mr-1" />
				Profile
			</Button>
		</div>
	</div>

	<!-- Inline page-level section creation -->
	{#if addingSectionFor?.containerType === 'creator' && addingSectionFor?.containerId === pageId}
		<div class="flex items-center gap-2 border rounded-lg p-3 bg-muted/20">
			<Folder class="size-4 text-muted-foreground shrink-0" />
			<Input
				class="h-8 text-sm flex-1"
				placeholder="Nome da seção (max 30)"
				maxlength={30}
				bind:value={newSectionTitle}
				onkeydown={(e) => { if (e.key === 'Enter') handleCreateSection('creator', pageId); }}
			/>
			<div class="flex gap-1 shrink-0">
				{#each SECTION_COLORS as c}
					<button
						type="button"
						aria-label="Cor {c}"
						class="w-5 h-5 rounded-full border-2 transition-transform"
						style="background:{c}; border-color:{newSectionColor === c ? 'white' : c}; {newSectionColor === c ? 'transform:scale(1.2)' : ''}"
						onclick={() => (newSectionColor = c)}
					></button>
				{/each}
			</div>
			<Button variant="outline" size="sm" disabled={saving || !newSectionTitle.trim()} onclick={() => handleCreateSection('creator', pageId)}>
				Criar
			</Button>
			<button type="button" class="p-1 hover:bg-accent rounded" onclick={() => (addingSectionFor = null)}>
				<X class="size-4" />
			</button>
		</div>
	{/if}

	{#if showAddProfile}
		<div class="border rounded-lg p-4 bg-muted/30">
			<ProfileForm
				mode="create"
				onsave={(data) => handleAddProfile(data, addProfileToSectionId)}
				oncancel={() => (showAddProfile = false)}
				{saving}
			/>
		</div>
	{/if}

	{#if profiles.length === 0 && !showAddProfile && pageSections.length === 0}
		<p class="text-sm text-muted-foreground text-center py-4">
			Nenhum profile ainda. Adicione um para começar.
		</p>
	{/if}

	<!-- Page-level sections with profiles -->
	{#each pageSections as section (section.id)}
		{@const sectionProfiles = profilesBySection.get(section.id) ?? []}
		{#if editingSectionId === section.id}
			<div class="flex items-center gap-2 p-3 rounded-lg border" style="border-left: 4px solid {section.color};">
				<Input class="h-8 text-sm flex-1" maxlength={30} bind:value={editSectionTitle} onkeydown={(e) => { if (e.key === 'Enter') handleUpdateSection(); }} />
				<div class="flex gap-1 shrink-0">
					{#each SECTION_COLORS as c}
						<button type="button" aria-label="Cor {c}" class="w-5 h-5 rounded-full border-2 transition-transform" style="background:{c}; border-color:{editSectionColor === c ? 'white' : c}; {editSectionColor === c ? 'transform:scale(1.2)' : ''}" onclick={() => (editSectionColor = c)}></button>
					{/each}
				</div>
				<Button variant="outline" size="sm" disabled={saving || !editSectionTitle.trim()} onclick={() => handleUpdateSection()}>Salvar</Button>
				<button type="button" class="p-1 hover:bg-accent rounded" onclick={() => (editingSectionId = null)}>
					<X class="size-4" />
				</button>
			</div>
		{:else}
			<div class="rounded-lg border space-y-2" style="border-left: 4px solid {section.color};">
				<div class="flex items-center gap-2 px-4 py-2">
					<Folder class="size-4" style="color:{section.color};" />
					<span class="text-sm font-semibold flex-1">{section.title}</span>
					<Badge variant="outline" class="text-xs">{sectionProfiles.length} profile{sectionProfiles.length !== 1 ? 's' : ''}</Badge>
					<button type="button" class="p-1 hover:bg-accent rounded" onclick={() => handleMoveSectionUp(pageId, section)}>
						<ArrowUp class="size-3.5 text-muted-foreground" />
					</button>
					<button type="button" class="p-1 hover:bg-accent rounded" onclick={() => handleMoveSectionDown(pageId, section)}>
						<ArrowDown class="size-3.5 text-muted-foreground" />
					</button>
					<button type="button" class="p-1 hover:bg-accent rounded" onclick={() => { showAddProfile = true; addProfileToSectionId = section.id; }}>
						<Plus class="size-3.5 text-muted-foreground" />
					</button>
					<button type="button" class="p-1 hover:bg-accent rounded" onclick={() => startEditSection(section)}>
						<Pencil class="size-3.5 text-muted-foreground" />
					</button>
					<button type="button" class="p-1 hover:bg-destructive/10 rounded" onclick={() => (deleteConfirm = { type: 'section', id: section.id, title: section.title })}>
						<Trash2 class="size-3.5 text-destructive" />
					</button>
				</div>
				{#if sectionProfiles.length > 0}
					<div class="px-3 pb-3 space-y-2">
						{#each sectionProfiles as profile (profile.id)}
							{@render profileCard(profile)}
						{/each}
					</div>
				{:else}
					<p class="text-xs text-muted-foreground text-center pb-3">Seção vazia.</p>
				{/if}
			</div>
		{/if}
	{/each}

	<!-- Unsectioned profiles -->
	{#if unsectionedProfiles.length > 0}
		{#if pageSections.length > 0}
			<div class="text-xs text-muted-foreground uppercase tracking-wider px-1 pt-1">Sem seção</div>
		{/if}
		{#each unsectionedProfiles as profile (profile.id)}
			{@render profileCard(profile)}
		{/each}
	{/if}
</div>

<!-- Delete confirmation -->
{#if deleteConfirm}
	<ConfirmDialog
		open={!!deleteConfirm}
		title="Excluir {deleteConfirm.type === 'profile' ? 'Profile' : deleteConfirm.type === 'font' ? 'Font' : 'Seção'}"
		description="Tem certeza que deseja excluir &quot;{deleteConfirm.title}&quot;?{deleteConfirm.type === 'profile' ? ' Todas as fonts deste profile também serão excluídas.' : deleteConfirm.type === 'section' ? ' Os itens dentro serão movidos para fora da seção.' : ''}"
		confirmLabel="Excluir"
		onconfirm={() => {
			if (deleteConfirm?.type === 'profile') handleDeleteProfile(deleteConfirm.id);
			else if (deleteConfirm?.type === 'font') handleDeleteFont(deleteConfirm.id);
			else if (deleteConfirm?.type === 'section') { creator.deleteSection(deleteConfirm.id); deleteConfirm = null; }
		}}
		oncancel={() => (deleteConfirm = null)}
	/>
{/if}
