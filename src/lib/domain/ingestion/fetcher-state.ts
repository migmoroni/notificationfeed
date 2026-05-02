/**
 * FetcherState — per-source ingestion state.
 *
 * Tracks fetch metadata for a single content source (a font nodeId), shared
 * across all users that have activated this source. Stored in the
 * `fetcherStates` object store, keyed by `nodeId`.
 *
 * The PostManager uses this to:
 * - Schedule the next fetch (`nextScheduledAt`).
 * - Send conditional GETs (`etag`, `lastModified`) per **protocol entry**
 *   (multi-protocol fonts have one sub-state per `FontProtocolEntry.id`).
 * - Apply exponential backoff after consecutive failures.
 * - Score each protocol entry and elect a runtime "effective primary"
 *   when a fallback has been outperforming the declared primary for
 *   long enough.
 * - Throttle the "could not fetch this font" notification to at most
 *   once per 24h per font.
 *
 * All timestamps are epoch milliseconds.
 */

/**
 * Per-protocol-entry fetch state. Indexed by `FontProtocolEntry.id`
 * inside `FetcherState.protocols`.
 */
export interface ProtocolFetcherState {
	/** Composite local id of the FontProtocolEntry. */
	entryId: string;

	/** Last attempt timestamp (success or failure). */
	lastFetchedAt: number;

	/** Last successful response timestamp, or null if never succeeded. */
	lastSuccessAt: number | null;

	/** ETag from last successful HTTP response, for `If-None-Match`. */
	etag: string | null;

	/** Last-Modified value from last successful HTTP response. */
	lastModified: string | null;

	/**
	 * For Nostr: highest `created_at` seen so far. Used as `since` for
	 * the next subscription to skip already-stored events.
	 */
	nostrSince: number | null;

	/** Count of consecutive failures since last success on this entry. */
	consecutiveFailures: number;

	/** Score driving fallback ordering and effective-primary promotion. */
	score: number;
}

export interface FetcherState {
	/** Composite font node id (treeId:localUuid). Primary key. */
	nodeId: string;

	/** Per-protocol-entry state, keyed by `FontProtocolEntry.id`. */
	protocols: Record<string, ProtocolFetcherState>;

	/**
	 * When set, overrides the user-declared primary at runtime (the
	 * declared primary stays untouched in the tree). Promoted by the
	 * scoring loop after sustained fallback wins.
	 */
	effectivePrimaryEntryId: string | null;

	/**
	 * Number of consecutive ticks where a fallback has outscored the
	 * declared primary by at least `promotionMargin`. Reset to zero
	 * when the lead disappears. Used to debounce promotion.
	 */
	promotionStreakTicks: number;

	/**
	 * Last attempt across the whole font (success on any protocol or
	 * failure of all). Drives scheduling.
	 */
	lastFetchedAt: number;

	/** Last time *any* protocol succeeded for this font. */
	lastSuccessAt: number | null;

	/** Earliest epoch ms at which this source may be polled again. */
	nextScheduledAt: number;

	/**
	 * Last time the "font unreachable" notification was emitted. Reset
	 * to 0 the moment any protocol succeeds again. Used to rate-limit
	 * the warning to once per 24h per font.
	 */
	lastUnreachableNotifiedAt: number;
}

/** Fresh state for a never-fetched source. */
export function emptyFetcherState(nodeId: string): FetcherState {
	return {
		nodeId,
		protocols: {},
		effectivePrimaryEntryId: null,
		promotionStreakTicks: 0,
		lastFetchedAt: 0,
		lastSuccessAt: null,
		nextScheduledAt: 0,
		lastUnreachableNotifiedAt: 0
	};
}

/** Fresh per-protocol-entry sub-state. */
export function emptyProtocolState(entryId: string): ProtocolFetcherState {
	return {
		entryId,
		lastFetchedAt: 0,
		lastSuccessAt: null,
		etag: null,
		lastModified: null,
		nostrSince: null,
		consecutiveFailures: 0,
		score: 0
	};
}

/** Get the sub-state for an entry, creating it on first access. */
export function getOrCreateProtoState(
	state: FetcherState,
	entryId: string
): ProtocolFetcherState {
	const existing = state.protocols[entryId];
	if (existing) return existing;
	const fresh = emptyProtocolState(entryId);
	state.protocols[entryId] = fresh;
	return fresh;
}

