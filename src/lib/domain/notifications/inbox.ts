/**
 * Notification inbox — in-app history surfaced by the bell popover.
 *
 * One entry per fired notification. `target` is a discriminated union
 * that tells the bell (and the OS notification click handler) where to
 * navigate when the user clicks the entry:
 *
 *   - `{ kind: 'url', url, postId }` — open the post's external URL.
 *     Produced by the `per_post` step.
 *   - `{ kind: 'macro', macroId }`   — navigate to the feed page with
 *     that macro selected. `macroId === '__all__'` selects the
 *     synthetic "all macros" view (see `ALL_MACROS_ID` in
 *     `$lib/stores/feed-macros.svelte.ts`). Produced by `batch_macro`
 *     and `batch_global`.
 *
 * Entries are the canonical log of "we tried to notify the user" — OS
 * notifications are best-effort on top. The bell renders the most
 * recent N entries (see `NOTIFICATIONS.inboxRecentLimit`); older
 * entries are pruned at write time to keep at most
 * `NOTIFICATIONS.inboxHardCap` per user.
 */

export type InboxEntryKind = 'per_post' | 'batch_macro' | 'batch_global' | 'font_unreachable';

export type InboxTarget =
	| { kind: 'url'; url: string; postId: string }
	| { kind: 'macro'; macroId: string }
	| { kind: 'node'; nodeId: string };

export interface InboxEntry {
	/** Synthetic primary key `${userId}|${id}`. Maintained on write. */
	_pk: string;
	/** Owner of the inbox. */
	userId: string;
	/** Stable per-entry id (e.g. `${stepId}-${createdAt}-${rand}`). */
	id: string;
	kind: InboxEntryKind;
	/** Source step id that produced this entry. */
	stepId: string;
	/** Notification title (already localized at fire-time). */
	title: string;
	/** One-line body (already localized). */
	body: string;
	/** When the engine fired the notification (epoch ms). */
	createdAt: number;
	/** Whether the user has opened/acknowledged this entry. */
	read: boolean;
	/** Where to navigate when this entry is clicked. */
	target: InboxTarget;
}

/** Construct the synthetic `_pk` field used by the inbox object store. */
export function inboxPk(userId: string, id: string): string {
	return `${userId}|${id}`;
}
