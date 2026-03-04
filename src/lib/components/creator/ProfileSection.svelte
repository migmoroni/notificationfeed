<script lang="ts">
	import type { Profile } from '$lib/domain/profile/profile.js';
	import type { Font, NewFont } from '$lib/domain/font/font.js';
	import type { NewProfile } from '$lib/domain/profile/profile.js';
	import { creator } from '$lib/stores/creator.svelte.js';
	import { createImagePreviewUrl } from '$lib/services/image.service.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Separator } from '$lib/components/ui/separator/index.js';
	import * as Collapsible from '$lib/components/ui/collapsible/index.js';
	import ProfileForm from './ProfileForm.svelte';
	import FontForm from './FontForm.svelte';
	import ConfirmDialog from '$lib/components/shared/ConfirmDialog.svelte';
	import Plus from '@lucide/svelte/icons/plus';
	import ChevronDown from '@lucide/svelte/icons/chevron-down';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import Pencil from '@lucide/svelte/icons/pencil';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import Rss from '@lucide/svelte/icons/rss';
	import Atom from '@lucide/svelte/icons/atom';
	import Zap from '@lucide/svelte/icons/zap';
	import User from '@lucide/svelte/icons/user';

	interface Props {
		pageId: string;
	}

	let { pageId }: Props = $props();

	// UI state
	let showAddProfile = $state(false);
	let editingProfileId = $state<string | null>(null);
	let addFontToProfileId = $state<string | null>(null);
	let editingFontId = $state<string | null>(null);
	let deleteConfirm = $state<{ type: 'profile' | 'font'; id: string; title: string } | null>(null);
	let expandedProfiles = $state<Set<string>>(new Set());
	let saving = $state(false);

	let profiles = $derived(creator.getProfilesForPage(pageId));

	function toggleExpand(profileId: string) {
		const next = new Set(expandedProfiles);
		if (next.has(profileId)) next.delete(profileId);
		else next.add(profileId);
		expandedProfiles = next;
	}

	// ── Profile CRUD ─────────────────────────────────────────────────

	async function handleAddProfile(data: Omit<NewProfile, 'ownerType' | 'ownerId' | 'creatorPageId'>) {
		saving = true;
		try {
			const profile = await creator.createProfile({ ...data, creatorPageId: pageId });
			showAddProfile = false;
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

	// ── Font CRUD ────────────────────────────────────────────────────

	async function handleAddFont(profileId: string, data: Omit<NewFont, 'profileId'>) {
		saving = true;
		try {
			await creator.createFont({ ...data, profileId });
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
</script>

<div class="space-y-4">
	<div class="flex items-center justify-between">
		<h3 class="text-sm font-semibold">Profiles ({profiles.length})</h3>
		<Button variant="outline" size="sm" onclick={() => (showAddProfile = !showAddProfile)}>
			<Plus class="size-4 mr-1" />
			Adicionar Profile
		</Button>
	</div>

	{#if showAddProfile}
		<div class="border rounded-lg p-4 bg-muted/30">
			<ProfileForm
				mode="create"
				onsave={(data) => handleAddProfile(data)}
				oncancel={() => (showAddProfile = false)}
				{saving}
			/>
		</div>
	{/if}

	{#if profiles.length === 0 && !showAddProfile}
		<p class="text-sm text-muted-foreground text-center py-4">
			Nenhum profile ainda. Adicione um para começar.
		</p>
	{/if}

	{#each profiles as profile (profile.id)}
		{@const fonts = creator.getFontsForProfile(profile.id)}
		{@const isExpanded = expandedProfiles.has(profile.id)}

		<div class="border rounded-lg">
			<!-- Profile header -->
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

					<!-- Fonts list -->
					<div class="space-y-2">
						<div class="flex items-center justify-between">
							<span class="text-xs font-medium text-muted-foreground">Fonts</span>
							<Button
								variant="ghost"
								size="sm"
								class="h-7 text-xs"
								onclick={() => (addFontToProfileId = profile.id)}
							>
								<Plus class="size-3 mr-1" />
								Font
							</Button>
						</div>

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

						{#each fonts as font (font.id)}
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
								<button
									type="button"
									class="p-1 hover:bg-accent rounded"
									onclick={() => (editingFontId = font.id)}
								>
									<Pencil class="size-3 text-muted-foreground" />
								</button>
								<button
									type="button"
									class="p-1 hover:bg-destructive/10 rounded"
									onclick={() => (deleteConfirm = { type: 'font', id: font.id, title: font.title })}
								>
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
											config: font.config,										categoryAssignments: font.categoryAssignments ?? [],											defaultEnabled: font.defaultEnabled
										}}
										onsave={(data) => handleUpdateFont(font.id, data)}
										oncancel={() => (editingFontId = null)}
										{saving}
									/>
								</div>
							{/if}
						{/each}

						{#if fonts.length === 0 && addFontToProfileId !== profile.id}
							<p class="text-xs text-muted-foreground text-center py-2">
								Nenhuma font. Adicione uma feed source.
							</p>
						{/if}
					</div>
				</div>
			{/if}
		</div>
	{/each}
</div>

<!-- Delete confirmation -->
{#if deleteConfirm}
	<ConfirmDialog
		open={!!deleteConfirm}
		title="Excluir {deleteConfirm.type === 'profile' ? 'Profile' : 'Font'}"
		description="Tem certeza que deseja excluir &quot;{deleteConfirm.title}&quot;?{deleteConfirm.type === 'profile' ? ' Todas as fonts deste profile também serão excluídas.' : ''}"
		confirmLabel="Excluir"
		onconfirm={() => {
			if (deleteConfirm?.type === 'profile') handleDeleteProfile(deleteConfirm.id);
			else if (deleteConfirm) handleDeleteFont(deleteConfirm.id);
		}}
		oncancel={() => (deleteConfirm = null)}
	/>
{/if}
