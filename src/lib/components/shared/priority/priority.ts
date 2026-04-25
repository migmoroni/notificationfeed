/**
 * Centralized priority scale configuration.
 *
 * Single source of truth for priority levels, labels, badge variants, and
 * active button styles used across browse and feed components.
 */

import type { PriorityLevel } from '$lib/domain/user/priority-level.js';

// ── Data ───────────────────────────────────────────────────────────────

export interface PriorityConfig {
	level: PriorityLevel;
	/** i18n key for the priority label. */
	labelKey: string;
	/** i18n key for the human-readable name. */
	nameKey: string;
	/** Badge variant for shadcn Badge component. */
	badgeVariant: 'destructive' | 'secondary' | 'outline';
	/** Tailwind classes applied when the priority button is active. */
	activeClass: string;
}

export const PRIORITY_LEVELS: PriorityConfig[] = [
	{
		level: 'high',
		labelKey: 'feed.priority_high',
		nameKey: 'feed.priority_high',
		badgeVariant: 'destructive',
		activeClass: 'bg-destructive text-destructive-foreground border-destructive'
	},
	{
		level: 'default',
		labelKey: 'feed.priority_default',
		nameKey: 'feed.priority_default',
		badgeVariant: 'outline',
		activeClass: 'bg-accent text-accent-foreground border-accent'
	}
];

/** Lookup a priority config by level. */
export const PRIORITY_MAP: Record<PriorityLevel, PriorityConfig> = Object.fromEntries(
	PRIORITY_LEVELS.map((p) => [p.level, p])
) as Record<PriorityLevel, PriorityConfig>;

/** Inactive button classes (shared across all priority buttons). */
export const PRIORITY_INACTIVE_CLASS =
	'border-border text-muted-foreground hover:bg-accent hover:text-accent-foreground';
