<!--
  NotificationBell — fixed top-right bell + popover with the inbox.

  Self-polls the inbox every few seconds while open, plus on every
  visibility change while closed (cheap; reads from IndexedDB). The
  active user store drives "whose inbox am I showing" — when there is
  no active user the bell is hidden.
-->
<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import Bell from '@lucide/svelte/icons/bell';
	import Check from '@lucide/svelte/icons/check';
	import { activeUser } from '$lib/stores/active-user.svelte.js';
	import { t } from '$lib/i18n/t.js';
	import { goto } from '$app/navigation';
	import { NOTIFICATIONS } from '$lib/config/back-settings.js';
	import {
		listInboxForUser,
		markInboxEntryRead,
		markAllInboxRead,
		countUnreadForUser
	} from '$lib/persistence/notification-inbox.store.js';
	import type { InboxEntry, InboxEntryKind } from '$lib/domain/notifications/inbox.js';

	let open = $state(false);
	let entries = $state<InboxEntry[]>([]);
	let unread = $state(0);
	let pollTimer: ReturnType<typeof setInterval> | null = null;

	let userId = $derived(activeUser.current?.id ?? null);

	/** Whether the bell splits its inbox into Posts/Health tabs. */
	let splitTabs = $derived(activeUser.current?.settingsUser.notifications?.splitInboxTabs ?? true);

	type TabId = 'posts' | 'health';
	let activeTab = $state<TabId>('posts');

	const HEALTH_KINDS: ReadonlySet<InboxEntryKind> = new Set([
		'font_unstable',
		'font_offline',
		'font_recovered',
		'font_degraded',
		'font_source_switched'
	]);
	function isHealth(kind: InboxEntryKind): boolean {
		return HEALTH_KINDS.has(kind);
	}

	let visibleEntries = $derived.by(() => {
		if (!splitTabs) return entries;
		return activeTab === 'health'
			? entries.filter((e) => isHealth(e.kind))
			: entries.filter((e) => !isHealth(e.kind));
	});

	async function refresh() {
		const id = userId;
		if (!id) {
			entries = [];
			unread = 0;
			return;
		}
		entries = await listInboxForUser(id, NOTIFICATIONS.inboxRecentLimit);
		unread = await countUnreadForUser(id);
	}

	function startPolling() {
		stopPolling();
		pollTimer = setInterval(() => void refresh(), 10_000);
	}
	function stopPolling() {
		if (pollTimer) clearInterval(pollTimer);
		pollTimer = null;
	}

	$effect(() => {
		void userId; // re-run when active user changes
		void refresh();
	});

	onMount(() => {
		startPolling();
		const onVis = () => {
			if (document.visibilityState === 'visible') void refresh();
		};
		document.addEventListener('visibilitychange', onVis);
		return () => document.removeEventListener('visibilitychange', onVis);
	});

	onDestroy(stopPolling);

	async function toggle() {
		open = !open;
		if (open) await refresh();
	}

	async function handleMarkAll() {
		const id = userId;
		if (!id) return;
		if (splitTabs) {
			// Mark only the entries of the active tab as read.
			for (const e of visibleEntries) {
				if (!e.read) await markInboxEntryRead(id, e.id);
			}
		} else {
			await markAllInboxRead(id);
		}
		await refresh();
	}

	async function handleEntryClick(entry: InboxEntry) {
		const id = userId;
		if (!id) return;
		if (!entry.read) {
			await markInboxEntryRead(id, entry.id);
			await refresh();
		}
		// Route per the entry's target. `per_post` opens the post URL in
		// a new tab; macro entries navigate the feed page with the
		// matching macro selected (the feed's `?macro=` param handler
		// applies it and strips the param).
		const target = entry.target;
		if (target.kind === 'url') {
			window.open(target.url, '_blank', 'noopener');
		} else if (target.kind === 'node') {
			open = false;
			void goto('/library/node/' + encodeURIComponent(target.nodeId));
		} else {
			open = false;
			void goto('/?macro=' + encodeURIComponent(target.macroId));
		}
	}

	function formatTime(ts: number): string {
		const diff = Date.now() - ts;
		if (diff < 60_000) return 'now';
		if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m`;
		if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h`;
		return `${Math.floor(diff / 86_400_000)}d`;
	}

	function handleOutsideClick(e: MouseEvent) {
		const target = e.target as HTMLElement;
		if (!target.closest('[data-notif-bell]')) open = false;
	}

	$effect(() => {
		if (open) {
			document.addEventListener('click', handleOutsideClick);
			return () => document.removeEventListener('click', handleOutsideClick);
		}
	});
</script>

{#if userId}
	<div data-notif-bell class="relative z-30 inline-block">
		<button
			type="button"
			class="relative inline-flex items-center justify-center size-9 rounded-full bg-background/80 backdrop-blur border border-border shadow-sm hover:bg-accent transition-colors"
			aria-label={t('notifications.bell_aria')}
			onclick={toggle}
		>
			<Bell class="size-4" />
			{#if unread > 0}
				<span
					class="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center"
				>
					{unread > 99 ? '99+' : unread}
				</span>
			{/if}
		</button>

		{#if open}
			<div
				class="absolute right-0 top-full mt-2 z-50 w-80 max-w-[calc(100vw-2rem)] rounded-lg border border-border bg-popover text-popover-foreground shadow-md flex flex-col overflow-hidden"
			>
				<div class="flex items-center justify-between p-3 border-b border-border">
					<span class="text-sm font-semibold">{t('notifications.title')}</span>
					{#if visibleEntries.some((e) => !e.read)}
						<button
							type="button"
							class="text-xs inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"
							onclick={handleMarkAll}
						>
							<Check class="size-3.5" />
							{t('notifications.mark_all_read')}
						</button>
					{/if}
				</div>

				{#if splitTabs}
					{@const postsCount = entries.filter((e) => !isHealth(e.kind)).length}
					{@const healthCount = entries.filter((e) => isHealth(e.kind)).length}
					<div class="flex border-b border-border text-xs" role="tablist">
						<button
							type="button"
							role="tab"
							aria-selected={activeTab === 'posts'}
							class="flex-1 px-3 py-2 transition-colors {activeTab === 'posts'
								? 'border-b-2 border-primary text-foreground font-medium'
								: 'text-muted-foreground hover:text-foreground'}"
							onclick={() => (activeTab = 'posts')}
						>
							{t('notifications.tab_posts')}
							{#if postsCount > 0}
								<span class="ml-1 text-[10px] opacity-70">({postsCount})</span>
							{/if}
						</button>
						<button
							type="button"
							role="tab"
							aria-selected={activeTab === 'health'}
							class="flex-1 px-3 py-2 transition-colors {activeTab === 'health'
								? 'border-b-2 border-primary text-foreground font-medium'
								: 'text-muted-foreground hover:text-foreground'}"
							onclick={() => (activeTab = 'health')}
						>
							{t('notifications.tab_health')}
							{#if healthCount > 0}
								<span class="ml-1 text-[10px] opacity-70">({healthCount})</span>
							{/if}
						</button>
					</div>
				{/if}

				<div class="max-h-96 overflow-y-auto">
					{#if visibleEntries.length === 0}
						<p class="p-6 text-center text-xs text-muted-foreground">
							{t('notifications.empty')}
						</p>
					{:else}
						{#each visibleEntries as entry (entry.id)}
							{@const accent =
								entry.kind === 'font_offline'
									? 'border-l-4 border-l-destructive'
									: entry.kind === 'font_unstable'
									? 'border-l-4 border-l-orange-500'
									: entry.kind === 'font_recovered'
									? 'border-l-4 border-l-emerald-500'
									: entry.kind === 'font_degraded'
									? 'border-l-4 border-l-muted-foreground'
									: entry.kind === 'font_source_switched'
									? 'border-l-4 border-l-blue-500'
									: ''}
							<button
								type="button"
								class="w-full text-left px-3 py-2 border-b border-border last:border-b-0 hover:bg-accent transition-colors flex flex-col gap-0.5 {accent} {entry.read
									? 'opacity-70'
									: ''}"
								onclick={() => handleEntryClick(entry)}
							>
								<div class="flex items-baseline justify-between gap-2">
									<span class="text-sm font-medium truncate">{entry.title}</span>
									<span class="text-[10px] text-muted-foreground shrink-0"
										>{formatTime(entry.createdAt)}</span
									>
								</div>
								{#if entry.body}
									<span class="text-xs text-muted-foreground line-clamp-2">{entry.body}</span>
								{/if}
							</button>
						{/each}
					{/if}
				</div>
			</div>
		{/if}
	</div>
{/if}
