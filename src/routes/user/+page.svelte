<script lang="ts">
import { onMount } from 'svelte';
import { activeUser } from '$lib/stores/active-user.svelte.js';
import { consumer } from '$lib/stores/consumer.svelte.js';
import { creator } from '$lib/stores/creator.svelte.js';
import { feed } from '$lib/stores/feed.svelte.js';
import { resetUserScopedState } from '$lib/stores/user-scope-reset.js';
import { layout } from '$lib/stores/layout.svelte.js';
import { processImage, createImagePreviewUrl } from '$lib/services/image.service.js';
import { ACCEPTED_IMAGE_FORMATS } from '$lib/domain/shared/image-asset.js';
import type { ImageAsset } from '$lib/domain/shared/image-asset.js';
import type { UserBase, UserRole } from '$lib/domain/user/user.js';
import type { UserConsumer } from '$lib/domain/user/user-consumer.js';
import type { UserCreator } from '$lib/domain/user/user-creator.js';
import EmojiPicker from '$lib/components/shared/EmojiPicker.svelte';
import ConfirmRemoveUserDialog from '$lib/components/shared/dialog/ConfirmRemoveUserDialog.svelte';
import InstallButton from '$lib/components/shared/InstallButton.svelte';
import { Badge } from '$lib/components/ui/badge/index.js';
import { Button } from '$lib/components/ui/button/index.js';
import { Input } from '$lib/components/ui/input/index.js';
import { Separator } from '$lib/components/ui/separator/index.js';
import * as Dialog from '$lib/components/ui/dialog/index.js';
import * as Collapsible from '$lib/components/ui/collapsible/index.js';
import CircleUser from '@lucide/svelte/icons/circle-user';
import Plus from '@lucide/svelte/icons/plus';
import Pencil from '@lucide/svelte/icons/pencil';
import Trash2 from '@lucide/svelte/icons/trash-2';
import Undo2 from '@lucide/svelte/icons/undo-2';
import Camera from '@lucide/svelte/icons/camera';
import Smile from '@lucide/svelte/icons/smile';
import X from '@lucide/svelte/icons/x';
import Newspaper from '@lucide/svelte/icons/newspaper';
import FileStack from '@lucide/svelte/icons/file-stack';
import ChevronDown from '@lucide/svelte/icons/chevron-down';
import { t } from '$lib/i18n/t.js';
import { currentLanguage, setLanguage } from '$lib/i18n/store.svelte.js';
import { ALL_LANGUAGES } from '$lib/i18n/types.js';
import type { Language } from '$lib/i18n/types.js';

onMount(() => {
	activeUser.reload();
});

// ── Language ────────────────────────────────────────────────────────

const LANGUAGE_LABELS: Record<Language, string> = {
	'en-US': 'English',
	'pt-BR': 'Português (BR)'
};

async function handleLanguageChange(lang: Language) {
	setLanguage(lang);
	if (activeUser.current) {
		await activeUser.setLanguage(activeUser.current.id, lang);
	}
}

// ── Create user dialog ─────────────────────────────────────────────

let showCreateDialog = $state(false);
let createRole = $state<UserRole>('consumer');
let createName = $state('');

function openCreateDialog(role: UserRole) {
createRole = role;
createName = '';
showCreateDialog = true;
}

async function handleCreate() {
const name = createName.trim();
if (!name) return;

if (createRole === 'consumer') {
const user = await activeUser.createConsumer(name);
activeUser.switchTo(user.id);
resetUserScopedState();
await consumer.init(user.id);
await feed.loadFeed();
} else {
const user = await activeUser.createCreator(name);
activeUser.switchTo(user.id);
resetUserScopedState();
await creator.init(user);
}
showCreateDialog = false;
}

// ── Edit user dialog ───────────────────────────────────────────────

let editingUser = $state<UserBase | null>(null);
let editName = $state('');
let editImagePreview = $state<string | null>(null);
let pendingImage = $state<ImageAsset | null | undefined>(undefined);
let editEmoji = $state<string | null>(null);
let pendingEmoji = $state<string | null | undefined>(undefined);
let editAvatarMode = $state<'image' | 'emoji'>('image');
let showEmojiDialog = $state(false);
let pendingDialogEmoji = $state('');

function openEdit(user: UserBase) {
editingUser = user;
editName = user.displayName;
editImagePreview = user.profileImage ? createImagePreviewUrl(user.profileImage) : null;
editEmoji = user.profileEmoji ?? null;
pendingImage = undefined;
pendingEmoji = undefined;
editAvatarMode = user.profileEmoji ? 'emoji' : 'image';
showEmojiDialog = false;
}

function closeEdit() {
editingUser = null;
pendingImage = undefined;
pendingEmoji = undefined;
showEmojiDialog = false;
}

async function handleImageUpload(e: Event) {
const input = e.target as HTMLInputElement;
const file = input.files?.[0];
if (!file) return;
const asset = await processImage(file, 'avatar');
pendingImage = asset;
editImagePreview = createImagePreviewUrl(asset);
// Clear emoji when setting image (mutually exclusive)
editEmoji = null;
pendingEmoji = null;
input.value = '';
}

function removeImage() {
pendingImage = null;
editImagePreview = null;
}

function openEmojiDialog() {
pendingDialogEmoji = editEmoji ?? '';
showEmojiDialog = true;
}

function confirmEmojiDialog() {
if (!pendingDialogEmoji) return;
editEmoji = pendingDialogEmoji;
pendingEmoji = pendingDialogEmoji;
// Clear image when setting emoji (mutually exclusive)
pendingImage = null;
editImagePreview = null;
showEmojiDialog = false;
}

function removeEmoji() {
editEmoji = null;
pendingEmoji = null;
}

async function saveEdit() {
if (!editingUser || !editName.trim()) return;

if (editName.trim() !== editingUser.displayName) {
await activeUser.updateDisplayName(editingUser.id, editName.trim());
}
if (pendingImage !== undefined) {
await activeUser.setProfileImage(editingUser.id, pendingImage);
}
if (pendingEmoji !== undefined) {
await activeUser.setProfileEmoji(editingUser.id, pendingEmoji);
}
closeEdit();
}

// ── Delete user (soft) with name confirmation ──────────────────────

let showDeleteConfirm = $state(false);
let deleteTargetUser = $state<UserBase | null>(null);

function requestDelete(user: UserBase) {
deleteTargetUser = user;
showDeleteConfirm = true;
}

async function confirmDelete() {
if (!deleteTargetUser) return;
await activeUser.softDelete(deleteTargetUser.id);

if (activeUser.current?.role === 'consumer') {
resetUserScopedState();
await consumer.init(activeUser.current.id);
await feed.loadFeed();
}
showDeleteConfirm = false;
deleteTargetUser = null;
}

function cancelDelete() {
showDeleteConfirm = false;
deleteTargetUser = null;
}

// ── Restore user ───────────────────────────────────────────────────

async function restoreUser(userId: string) {
await activeUser.restore(userId);
}

// ── Switch user ────────────────────────────────────────────────────

async function switchUser(userId: string) {
activeUser.switchTo(userId);
resetUserScopedState();

const user = activeUser.allUsers.find(u => u.id === userId);
if (user?.role === 'consumer') {
await consumer.init(userId);
await feed.loadFeed();
} else if (user?.role === 'creator') {
await creator.init(user as any);
}
}

// ── Helpers ────────────────────────────────────────────────────────

function getUserSummary(user: UserBase) {
if (user.role === 'consumer') {
const c = user as UserConsumer;
return {
trees: c.activateTrees?.length ?? 0,
nodes: c.activateNodes?.length ?? 0,
favorites: c.activateNodes?.filter(n => n.favorite).length ?? 0,
macros: c.feedMacros?.length ?? 0
};
}
const cr = user as UserCreator;
return {
trees: cr.ownedTreeIds?.length ?? 0,
nodes: 0,
favorites: 0,
macros: 0
};
}

let showRemoved = $state(false);
</script>

<svelte:head>
<title>{t('page_title.users')}</title>
</svelte:head>

<div class="container mx-auto px-4 py-6 {layout.isExpanded ? 'max-w-2xl' : 'max-w-lg'}">
<h1 class="text-xl font-bold mb-6">{t('title.users')}</h1>

<!-- Active user banner -->
{#if activeUser.current}
{@const summary = getUserSummary(activeUser.current)}
<div class="rounded-lg border border-primary/30 bg-primary/5 p-4 mb-6">
<div class="flex items-center gap-3">
{#if activeUser.current.profileImage}
<img
src={createImagePreviewUrl(activeUser.current.profileImage)}
alt=""
class="size-12 rounded-full object-cover"
/>
{:else if activeUser.current.profileEmoji}
<div class="flex items-center justify-center size-12 rounded-full bg-primary/10">
<span class="text-2xl">{activeUser.current.profileEmoji}</span>
</div>
{:else}
<div class="flex items-center justify-center size-12 rounded-full bg-primary/10 text-primary">
<CircleUser class="size-7" />
</div>
{/if}
<div class="flex-1 min-w-0">
<p class="text-sm font-semibold truncate">{activeUser.current.displayName}</p>
<div class="flex items-center gap-1.5 mt-0.5">
<Badge variant={activeUser.isConsumer ? 'secondary' : 'outline'} class="text-[10px]">
{activeUser.isConsumer ? t('role.consumer') : t('role.creator')}
</Badge>
{#if activeUser.isConsumer}
<span class="text-[10px] text-muted-foreground">
{summary.trees} trees · {summary.favorites} fav
</span>
{:else}
<span class="text-[10px] text-muted-foreground">
{summary.trees} pages
</span>
{/if}
</div>
</div>
<Button variant="ghost" size="sm" class="h-8 w-8 p-0 shrink-0" onclick={() => openEdit(activeUser.current!)}>
<Pencil class="size-4" />
</Button>
</div>
</div>
{/if}

<!-- Consumer accounts -->
<section class="mb-6">
<div class="flex items-center justify-between mb-3">
<h2 class="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
{t('user.consumers')}
</h2>
<Button variant="ghost" size="sm" class="h-7 gap-1 text-xs" onclick={() => openCreateDialog('consumer')}>
<Plus class="size-3.5" />
{t('btn.create')}
</Button>
</div>

{#if activeUser.consumers.length === 0}
<p class="text-sm text-muted-foreground py-2">{t('user.no_consumers')}</p>
{:else}
<div class="flex flex-col gap-2">
{#each activeUser.consumers as user (user.id)}
{@const isActive = activeUser.current?.id === user.id}
{@const summary = getUserSummary(user)}
<div class="flex items-center gap-3 rounded-lg border p-3 transition-colors
{isActive ? 'border-primary/50 bg-primary/5' : 'border-border bg-card hover:bg-accent/50'}">

<button
onclick={() => switchUser(user.id)}
class="flex items-center gap-3 flex-1 min-w-0 text-left"
disabled={isActive}
>
{#if user.profileImage}
<img src={createImagePreviewUrl(user.profileImage)} alt="" class="size-9 rounded-full object-cover shrink-0" />
{:else if user.profileEmoji}
<div class="flex items-center justify-center size-9 rounded-full bg-primary/10 shrink-0">
<span class="text-lg">{user.profileEmoji}</span>
</div>
{:else}
<Newspaper class="size-5 shrink-0 {isActive ? 'text-primary' : 'text-muted-foreground'}" />
{/if}

<div class="flex-1 min-w-0">
<span class="text-sm font-medium truncate block">{user.displayName}</span>
<span class="text-[10px] text-muted-foreground">
{summary.trees} trees · {summary.nodes} nodes · {summary.favorites} fav
</span>
</div>

{#if isActive}
<Badge variant="default" class="text-[10px] shrink-0">{t('user.active_badge')}</Badge>
{/if}
</button>

<div class="flex items-center gap-0.5 shrink-0">
<Button variant="ghost" size="sm" class="h-7 w-7 p-0" onclick={() => openEdit(user)}>
<Pencil class="size-3.5" />
</Button>
<Button variant="ghost" size="sm" class="h-7 w-7 p-0 text-destructive/70 hover:text-destructive" onclick={() => requestDelete(user)}>
<Trash2 class="size-3.5" />
</Button>
</div>
</div>
{/each}
</div>
{/if}
</section>

<Separator class="mb-6" />

<!-- Creator accounts -->
<section class="mb-6">
<div class="flex items-center justify-between mb-3">
<h2 class="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
{t('user.creators')}
</h2>
<Button variant="ghost" size="sm" class="h-7 gap-1 text-xs" onclick={() => openCreateDialog('creator')}>
<Plus class="size-3.5" />
{t('btn.create')}
</Button>
</div>

{#if activeUser.creators.length === 0}
<p class="text-sm text-muted-foreground py-2">{t('user.no_creators')}</p>
{:else}
<div class="flex flex-col gap-2">
{#each activeUser.creators as user (user.id)}
{@const isActive = activeUser.current?.id === user.id}
{@const summary = getUserSummary(user)}
<div class="flex items-center gap-3 rounded-lg border p-3 transition-colors
{isActive ? 'border-primary/50 bg-primary/5' : 'border-border bg-card hover:bg-accent/50'}">

<button
onclick={() => switchUser(user.id)}
class="flex items-center gap-3 flex-1 min-w-0 text-left"
disabled={isActive}
>
{#if user.profileImage}
<img src={createImagePreviewUrl(user.profileImage)} alt="" class="size-9 rounded-full object-cover shrink-0" />
{:else if user.profileEmoji}
<div class="flex items-center justify-center size-9 rounded-full bg-primary/10 shrink-0">
<span class="text-lg">{user.profileEmoji}</span>
</div>
{:else}
<FileStack class="size-5 shrink-0 {isActive ? 'text-primary' : 'text-muted-foreground'}" />
{/if}

<div class="flex-1 min-w-0">
<span class="text-sm font-medium truncate block">{user.displayName}</span>
<span class="text-[10px] text-muted-foreground">
{summary.trees} pages
</span>
</div>

{#if isActive}
<Badge variant="default" class="text-[10px] shrink-0">{t('user.active_badge')}</Badge>
{/if}
</button>

<div class="flex items-center gap-0.5 shrink-0">
<Button variant="ghost" size="sm" class="h-7 w-7 p-0" onclick={() => openEdit(user)}>
<Pencil class="size-3.5" />
</Button>
<Button variant="ghost" size="sm" class="h-7 w-7 p-0 text-destructive/70 hover:text-destructive" onclick={() => requestDelete(user)}>
<Trash2 class="size-3.5" />
</Button>
</div>
</div>
{/each}
</div>
{/if}
</section>

<!-- Removed users (collapsible) -->
{#if activeUser.removedUsers.length > 0}
<Separator class="mb-6" />

<Collapsible.Root bind:open={showRemoved}>
<Collapsible.Trigger class="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-full mb-3">
<ChevronDown class="size-4 transition-transform {showRemoved ? 'rotate-180' : ''}" />
<span class="font-semibold uppercase tracking-wider text-[13px]">
{t('user.removed_count', { count: String(activeUser.removedUsers.length) })}
</span>
</Collapsible.Trigger>
<Collapsible.Content>
<div class="flex flex-col gap-2">
{#each activeUser.removedUsers as user (user.id)}
<div class="flex items-center gap-3 rounded-lg border border-dashed border-muted-foreground/30 p-3 opacity-60">
{#if user.profileImage}
<img src={createImagePreviewUrl(user.profileImage)} alt="" class="size-9 rounded-full object-cover shrink-0 grayscale" />
{:else if user.profileEmoji}
<div class="flex items-center justify-center size-9 rounded-full bg-muted shrink-0 grayscale">
<span class="text-lg">{user.profileEmoji}</span>
</div>
{:else}
<CircleUser class="size-5 shrink-0 text-muted-foreground" />
{/if}
<div class="flex-1 min-w-0">
<span class="text-sm font-medium truncate block">{user.displayName}</span>
<span class="text-[10px] text-muted-foreground">
{user.role === 'consumer' ? t('role.consumer') : t('role.creator')} · {t('user.removed_label')}
</span>
</div>
<Button variant="outline" size="sm" class="h-7 gap-1 text-xs shrink-0" onclick={() => restoreUser(user.id)}>
<Undo2 class="size-3.5" />
{t('btn.restore')}
</Button>
</div>
{/each}
</div>
</Collapsible.Content>
</Collapsible.Root>
{/if}

<Separator class="my-6" />

<!-- App settings -->
<section>
<h2 class="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
{t('user.app_settings')}
</h2>

<div class="space-y-4">
<div class="flex items-center justify-between">
<div>
<p class="text-sm font-medium">{t('user.language')}</p>
<p class="text-xs text-muted-foreground">{t('user.language_hint')}</p>
</div>
<select
class="flex h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
value={currentLanguage()}
onchange={(e) => handleLanguageChange((e.target as HTMLSelectElement).value as Language)}
>
{#each ALL_LANGUAGES as lang}
<option value={lang}>{LANGUAGE_LABELS[lang]}</option>
{/each}
</select>
</div>

<div class="flex items-center justify-between">
<div>
<p class="text-sm font-medium">{t('user.activity')}</p>
<p class="text-xs text-muted-foreground">{t('user.activity_hint')}</p>
</div>
<Button variant="outline" size="sm" href="/user/settings/activity">
{t('user.activity_manage')}
</Button>
</div>

<div class="flex items-center justify-between">
<div>
<p class="text-sm font-medium">{t('user.ingestion')}</p>
<p class="text-xs text-muted-foreground">{t('user.ingestion_hint')}</p>
</div>
<Button variant="outline" size="sm" href="/user/settings/ingestion">
{t('user.ingestion_manage')}
</Button>
</div>

<InstallButton />
</div>
</section>
</div>

<!-- Create user dialog -->
<Dialog.Root bind:open={showCreateDialog}>
<Dialog.Content class="sm:max-w-sm">
<Dialog.Header>
<Dialog.Title>{t('user.create_role', { role: createRole === 'consumer' ? t('role.consumer') : t('role.creator') })}</Dialog.Title>
<Dialog.Description>
{createRole === 'consumer'
? t('user.consumer_description')
: t('user.creator_description_create')}
</Dialog.Description>
</Dialog.Header>

<div class="py-2">
<Input
bind:value={createName}
placeholder={t('user.display_name')}
maxlength={50}
class="w-full"
onkeydown={(e: KeyboardEvent) => { if (e.key === 'Enter') handleCreate(); }}
/>
</div>

<Dialog.Footer>
<Button variant="outline" onclick={() => (showCreateDialog = false)}>{t('btn.cancel')}</Button>
<Button onclick={handleCreate} disabled={!createName.trim()}>{t('btn.create')}</Button>
</Dialog.Footer>
</Dialog.Content>
</Dialog.Root>

<!-- Edit user dialog -->
<Dialog.Root open={!!editingUser} onOpenChange={(v) => { if (!v) closeEdit(); }}>
<Dialog.Content class="sm:max-w-sm">
<Dialog.Header>
<Dialog.Title>{t('user.edit_user')}</Dialog.Title>
<Dialog.Description>{t('user.edit_description')}</Dialog.Description>
</Dialog.Header>

<div class="flex flex-col items-center gap-4 py-4">
<!-- Avatar mode toggle -->
<div class="flex gap-1 rounded-lg border p-0.5 bg-muted/50">
<button
type="button"
onclick={() => { editAvatarMode = 'image'; }}
class="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md transition-colors
{editAvatarMode === 'image' ? 'bg-background shadow-sm font-medium' : 'text-muted-foreground hover:text-foreground'}"
>
<Camera class="size-3.5" />
{t('user.image_mode')}
</button>
<button
type="button"
onclick={() => { editAvatarMode = 'emoji'; }}
class="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md transition-colors
{editAvatarMode === 'emoji' ? 'bg-background shadow-sm font-medium' : 'text-muted-foreground hover:text-foreground'}"
>
<Smile class="size-3.5" />
{t('user.emoji_mode')}
</button>
</div>

<!-- Avatar preview + actions -->
{#if editAvatarMode === 'image'}
<div class="relative group">
{#if editImagePreview}
<img src={editImagePreview} alt="" class="size-20 rounded-full object-cover" />
<button
onclick={removeImage}
class="absolute -top-1 -right-1 flex items-center justify-center size-6 rounded-full bg-destructive text-destructive-foreground shadow-sm"
>
<X class="size-3.5" />
</button>
{:else}
<div class="flex items-center justify-center size-20 rounded-full bg-muted text-muted-foreground">
<CircleUser class="size-10" />
</div>
{/if}
<label
class="absolute bottom-0 right-0 flex items-center justify-center size-7 rounded-full bg-primary text-primary-foreground shadow-sm cursor-pointer"
>
<Camera class="size-3.5" />
<input
type="file"
accept={ACCEPTED_IMAGE_FORMATS.join(',')}
class="sr-only"
onchange={handleImageUpload}
/>
</label>
</div>
{:else}
<!-- Emoji mode -->
<div class="relative group">
{#if editEmoji}
<button
type="button"
onclick={openEmojiDialog}
class="flex items-center justify-center size-20 rounded-full bg-muted hover:bg-accent transition-colors cursor-pointer"
>
<span class="text-4xl">{editEmoji}</span>
</button>
<button
onclick={removeEmoji}
class="absolute -top-1 -right-1 flex items-center justify-center size-6 rounded-full bg-destructive text-destructive-foreground shadow-sm"
>
<X class="size-3.5" />
</button>
{:else}
<button
type="button"
onclick={openEmojiDialog}
class="flex items-center justify-center size-20 rounded-full bg-muted text-muted-foreground hover:bg-accent transition-colors cursor-pointer"
>
<Smile class="size-10" />
</button>
{/if}
</div>
{/if}

<!-- Name -->
<Input
bind:value={editName}
placeholder={t('user.display_name')}
maxlength={50}
class="w-full"
onkeydown={(e: KeyboardEvent) => { if (e.key === 'Enter') saveEdit(); }}
/>
</div>

<Dialog.Footer>
<Button variant="outline" onclick={closeEdit}>{t('btn.cancel')}</Button>
<Button onclick={saveEdit} disabled={!editName.trim()}>{t('btn.save')}</Button>
</Dialog.Footer>
</Dialog.Content>
</Dialog.Root>

<!-- Delete confirmation dialog (type name to confirm) -->
{#if deleteTargetUser}
<ConfirmRemoveUserDialog
bind:open={showDeleteConfirm}
displayName={deleteTargetUser.displayName}
onconfirm={confirmDelete}
oncancel={cancelDelete}
/>
{/if}

<!-- Emoji picker dialog -->
<Dialog.Root bind:open={showEmojiDialog} onOpenChange={(v) => { if (!v) showEmojiDialog = false; }}>
<Dialog.Content class="sm:max-w-fit">
<div class="flex justify-center pt-2 pb-1">
<div class="flex items-center justify-center size-12 rounded-full bg-primary/10">
<Smile class="size-6 text-primary" />
</div>
</div>
<Dialog.Header class="text-center">
<Dialog.Title>{t('user.choose_emoji')}</Dialog.Title>
<Dialog.Description>{t('user.select_emoji_avatar')}</Dialog.Description>
</Dialog.Header>
<div class="flex flex-col gap-4 py-4">
<div class="flex items-center justify-center">
<div class="w-16 h-16 rounded-full border bg-muted flex items-center justify-center text-4xl">
{pendingDialogEmoji || '?'}
</div>
</div>
<EmojiPicker value={pendingDialogEmoji} onselect={(e) => (pendingDialogEmoji = e)} />
</div>
<Dialog.Footer>
<Button variant="outline" onclick={() => (showEmojiDialog = false)}>{t('btn.cancel')}</Button>
<Button disabled={!pendingDialogEmoji} onclick={confirmEmojiDialog}>{t('btn.confirm')}</Button>
</Dialog.Footer>
</Dialog.Content>
</Dialog.Root>
