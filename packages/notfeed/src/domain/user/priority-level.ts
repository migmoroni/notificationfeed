/**
 * PriorityLevel — per-node priority within a FeedMacro.
 *
 * Priority is no longer a global per-node property. It is set inside the
 * advanced-filter composer of each FeedMacro, so the same node can have
 * different priorities in different macros.
 *
 *   'default' — appears in the regular position of the feed (newest first)
 *   'high'    — promoted to the top of the feed when this macro is active
 */

export type PriorityLevel = 'default' | 'high';

export const DEFAULT_PRIORITY: PriorityLevel = 'default';
