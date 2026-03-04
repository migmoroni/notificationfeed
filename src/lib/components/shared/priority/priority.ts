/**
 * Centralized priority scale configuration.
 *
 * Single source of truth for priority levels, labels, badge variants, and
 * active button styles used across browse and feed components.
 */

import type { PriorityLevel } from '$lib/domain/shared/consumer-state.js';

// ── Data ───────────────────────────────────────────────────────────────

export interface PriorityConfig {
	level: PriorityLevel;
	/** Numeric label used in priority toggle buttons. */
	label: string;
	/** Human-readable name used in filters and badges. */
	name: string;
	/** Badge variant for shadcn Badge component. */
	badgeVariant: 'destructive' | 'secondary' | 'outline';
	/** Tailwind classes applied when the priority button is active. */
	activeClass: string;
}

export const PRIORITY_LEVELS: PriorityConfig[] = [
	{
		level: 1,
		label: 'Alta',
		name: 'Alta',
		badgeVariant: 'destructive',
		activeClass: 'bg-destructive text-destructive-foreground border-destructive'
	},
	{
		level: 2,
		label: 'Média',
		name: 'Média',
		badgeVariant: 'secondary',
		activeClass: 'bg-secondary text-secondary-foreground border-secondary'
	},
	{
		level: 3,
		label: 'Baixa',
		name: 'Baixa',
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
