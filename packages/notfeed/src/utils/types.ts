/**
 * Shared TypeScript types used across the application.
 */

/** Result wrapper for async operations that can fail */
export type Result<T, E = Error> =
	| { ok: true; value: T }
	| { ok: false; error: E };

/** Make specific properties optional */
export type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

/** Extract the element type from an array */
export type ElementOf<T> = T extends (infer E)[] ? E : never;
