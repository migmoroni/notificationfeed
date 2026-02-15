/**
 * FollowRef — value object representing a follow relationship.
 *
 * Records the UserConsumer's intent to follow a CreatorPage or UserCreator.
 * The flow is unidirectional: the target is never notified.
 */

export type FollowTargetType = 'creator_page' | 'user_creator';
export type FollowSource = 'manual' | 'qrcode' | 'pubkey' | 'import';

export interface FollowRef {
	/** Type of entity being followed */
	targetType: FollowTargetType;

	/** ID or public key of the target */
	targetId: string;

	/** When the follow was created */
	followedAt: Date;

	/** How the follow was initiated */
	source: FollowSource;
}
