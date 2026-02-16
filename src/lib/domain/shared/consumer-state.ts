/**
 * ConsumerState — value object for local overrides by UserConsumer.
 *
 * Overrides the `defaultEnabled` set by the creator for a specific entity.
 * Also stores priority level, favorite flag, and custom category assignment.
 *
 * Priority levels (per-consumer, per-entity):
 *   1 = alta — posts appear first in the feed
 *   2 = média
 *   3 = baixa (global default when no entity in the chain defines one)
 *   null = inherit from parent (Font → Profile → CreatorPage → 3)
 */

export type ConsumerEntityType = 'creator_page' | 'profile' | 'font';

/** 1 = alta, 2 = média, 3 = baixa */
export type PriorityLevel = 1 | 2 | 3;

export interface ConsumerState {
	/** Type of the overridden entity */
	entityType: ConsumerEntityType;

	/** ID of the overridden entity */
	entityId: string;

	/** Local enabled/disabled override */
	enabled: boolean;

	/** Custom category assigned by the consumer (null = use original) */
	customCategoryId: string | null;

	/**
	 * Priority override. null = inherit from parent entity.
	 * Inheritance chain: Font → Profile → CreatorPage → 3 (default)
	 */
	priority: PriorityLevel | null;

	/** Whether this entity is marked as favorite by the consumer */
	favorite: boolean;

	/** When the consumer last changed this state */
	overriddenAt: Date;
}
