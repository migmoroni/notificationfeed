/**
 * User — root identity in Notfeed.
 *
 * Two mutually exclusive roles: consumer and creator.
 * Both can coexist on the same device as separate user records.
 */

export type UserRole = 'consumer' | 'creator';

export interface UserBase {
	id: string;
	role: UserRole;
	displayName: string;
	createdAt: Date;
	updatedAt: Date;
}
