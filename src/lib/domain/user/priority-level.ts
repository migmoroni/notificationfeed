/**
 * PriorityLevel — shared priority type used across the consumer layer.
 *
 * Extracted to its own module to avoid circular dependencies
 * after ConsumerState was replaced by NodeActivation.
 *
 *   1 = alta  — posts appear first in the feed
 *   2 = média
 *   3 = baixa — global default when no node in the chain defines one
 */

export type PriorityLevel = 1 | 2 | 3;

export const DEFAULT_PRIORITY: PriorityLevel = 3;
