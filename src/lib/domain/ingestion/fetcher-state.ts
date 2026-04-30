/**
 * FetcherState — per-source ingestion state.
 *
 * Tracks fetch metadata for a single content source (a font nodeId), shared
 * across all users that have activated this source. Stored in the
 * `fetcherStates` object store, keyed by `nodeId`.
 *
 * The PostManager uses this to:
 * - Schedule the next fetch (`nextScheduledAt`).
 * - Send conditional GETs (`etag`, `lastModified`) to save bandwidth.
 * - Apply exponential backoff after consecutive failures.
 *
 * All timestamps are epoch milliseconds.
 */

export interface FetcherState {
	/** Composite font node id (treeId:localUuid). Primary key. */
	nodeId: string;

	/** Last attempt timestamp (success or failure). */
	lastFetchedAt: number;

	/** Last successful response timestamp, or null if never succeeded. */
	lastSuccessAt: number | null;

	/** ETag from last successful HTTP response, for `If-None-Match`. */
	etag: string | null;

	/** Last-Modified value from last successful HTTP response, for `If-Modified-Since`. */
	lastModified: string | null;

	/**
	 * For Nostr: the highest `created_at` seen so far. The next subscription
	 * uses `since` to avoid re-pulling stored events.
	 */
	nostrSince: number | null;

	/** Count of consecutive failures since last success. Drives backoff. */
	consecutiveFailures: number;

	/** Earliest epoch ms at which this source may be polled again. */
	nextScheduledAt: number;
}

/** Fresh state for a never-fetched source. */
export function emptyFetcherState(nodeId: string): FetcherState {
	return {
		nodeId,
		lastFetchedAt: 0,
		lastSuccessAt: null,
		etag: null,
		lastModified: null,
		nostrSince: null,
		consecutiveFailures: 0,
		nextScheduledAt: 0
	};
}
