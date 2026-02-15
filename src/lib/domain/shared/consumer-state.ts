/**
 * ConsumerState — value object for local overrides by UserConsumer.
 *
 * Overrides the `defaultEnabled` set by the creator for a specific entity.
 * Also allows the consumer to assign a custom category.
 */

export type ConsumerEntityType = 'creator_page' | 'profile' | 'font';

export interface ConsumerState {
	/** Type of the overridden entity */
	entityType: ConsumerEntityType;

	/** ID of the overridden entity */
	entityId: string;

	/** Local enabled/disabled override */
	enabled: boolean;

	/** Custom category assigned by the consumer (null = use original) */
	customCategoryId: string | null;

	/** When the consumer last changed this state */
	overriddenAt: Date;
}
