/**
 * FetcherState — per-font ingestion state with explicit pipeline
 * state machine and per-source circuit breaker.
 *
 * One record per font `nodeId`, shared across all users that have
 * activated this font. See `docs/ingestion-pipeline.md` for the full
 * state-machine and the three execution modes (Adaptive Fallback /
 * Exponential Backoff per-source / Circuit Breaker).
 *
 * All timestamps are epoch milliseconds.
 */

/**
 * Pipeline-level state of a font. Drives both scheduling cadence and
 * the events emitted to the notification bus.
 *
 *  - `HEALTHY`     — recent success. Normal Adaptive Fallback mode.
 *  - `UNSTABLE`    — Mode 1 produced a full failure. Polling falls
 *                    back to a sparse interval and per-source backoff
 *                    starts to ramp.
 *  - `DEGRADED`    — only cached posts available (no fresh data) but
 *                    not yet considered offline. Currently reserved
 *                    for future cache-aware paths; emitted as info.
 *  - `OFFLINE`     — every source is OPEN in the circuit breaker.
 *                    Mode 3 is in effect (sparse probes only).
 *  - `RECOVERING`  — first success after UNSTABLE/OFFLINE; held for
 *                    `recoveringHoldTicks` to avoid flapping before
 *                    going back to HEALTHY.
 */
export type PipelineState = 'HEALTHY' | 'UNSTABLE' | 'DEGRADED' | 'OFFLINE' | 'RECOVERING';

/**
 * Per-source circuit-breaker state.
 *
 *  - `CLOSED`    — normal operation; eligible every tick.
 *  - `OPEN`      — failed too many times; only sparse probes allowed
 *                  via `backoffUntil`.
 *  - `HALF_OPEN` — a probe is in flight; one success closes the
 *                  circuit, one failure reopens it.
 */
export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

/**
 * Per-protocol-entry fetch state. Indexed by `FontProtocolEntry.id`
 * inside `FetcherState.protocols`.
 */
export interface ProtocolFetcherState {
	/** Composite local id of the FontProtocolEntry. */
	entryId: string;

	/** Last attempt timestamp (success or failure). */
	lastFetchedAt: number;

	/** Last attempt timestamp (alias kept for clarity in scoring). */
	lastAttemptAt: number;

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

	/**
	 * Absolute failure counter since the last `CLOSED` reset. Drives
	 * exponential backoff and the circuit-breaker trip threshold.
	 * Distinct from `consecutiveFailures`, which is a tick-local hint.
	 */
	failureCount: number;

	/** Score driving fallback ordering and effective-primary promotion. */
	score: number;

	/** EWMA of success rate (0..1). α = `INGESTION_PROTOCOL_SCORING.ewmaAlpha`. */
	successRate: number;

	/** Last measured request latency in ms (0 if never measured). */
	lastLatencyMs: number;

	/** EWMA of latency in ms. */
	avgLatencyMs: number;

	/** Circuit-breaker state. */
	circuitState: CircuitState;

	/**
	 * Earliest epoch ms at which this source may be tried again. Used
	 * by Modes 2 and 3. `null` means "no source-level wait".
	 */
	backoffUntil: number | null;
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

	/** Pipeline-level state machine. */
	pipelineState: PipelineState;

	/** Epoch ms of the last `pipelineState` transition. */
	lastTransitionAt: number;

	/**
	 * Remaining ticks the font must stay in `RECOVERING` before
	 * automatically transitioning back to `HEALTHY`. Ignored unless
	 * `pipelineState === 'RECOVERING'`.
	 */
	recoveringTicksRemaining: number;

	/**
	 * Confidence score (0..1) derived from `pipelineState` via
	 * `INGESTION_CONFIDENCE`. Persisted as a snapshot so UI consumers
	 * can read it without recomputing.
	 */
	confidence: number;
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
		pipelineState: 'HEALTHY',
		lastTransitionAt: 0,
		recoveringTicksRemaining: 0,
		confidence: 1
	};
}

/** Fresh per-protocol-entry sub-state. */
export function emptyProtocolState(entryId: string): ProtocolFetcherState {
	return {
		entryId,
		lastFetchedAt: 0,
		lastAttemptAt: 0,
		lastSuccessAt: null,
		etag: null,
		lastModified: null,
		nostrSince: null,
		consecutiveFailures: 0,
		failureCount: 0,
		score: 0,
		successRate: 1,
		lastLatencyMs: 0,
		avgLatencyMs: 0,
		circuitState: 'CLOSED',
		backoffUntil: null
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

/**
 * Allowed pipeline transitions. The map encodes the directed graph;
 * any edge missing here is rejected by `transition()`. Self-loops are
 * allowed but short-circuited as no-ops.
 */
const TRANSITIONS: Record<PipelineState, readonly PipelineState[]> = {
	HEALTHY: ['UNSTABLE', 'OFFLINE', 'DEGRADED'],
	UNSTABLE: ['OFFLINE', 'DEGRADED', 'RECOVERING', 'HEALTHY'],
	DEGRADED: ['UNSTABLE', 'OFFLINE', 'RECOVERING', 'HEALTHY'],
	OFFLINE: ['RECOVERING', 'UNSTABLE'],
	RECOVERING: ['HEALTHY', 'UNSTABLE', 'OFFLINE']
};

/**
 * Result of `transition()`. `changed === false` means the transition
 * was a no-op (self-loop) or rejected as illegal; the returned `state`
 * is unchanged in either case. Callers should only emit a
 * `PipelineEvent` when `changed === true`.
 */
export interface TransitionResult {
	state: FetcherState;
	changed: boolean;
	from: PipelineState;
	to: PipelineState;
}

/**
 * Pure transition helper. Returns a *new* FetcherState with the
 * updated `pipelineState`, `lastTransitionAt` and `confidence` when
 * the transition is legal; otherwise returns the input unchanged.
 *
 * Confidence values come from the caller (typically via
 * `INGESTION_CONFIDENCE[to]`) to avoid this domain module importing
 * config.
 */
export function transition(
	state: FetcherState,
	to: PipelineState,
	now: number,
	confidenceFor: (s: PipelineState) => number
): TransitionResult {
	const from = state.pipelineState;
	if (from === to) {
		return { state, changed: false, from, to };
	}
	const allowed = TRANSITIONS[from];
	if (!allowed.includes(to)) {
		return { state, changed: false, from, to };
	}
	const next: FetcherState = {
		...state,
		pipelineState: to,
		lastTransitionAt: now,
		confidence: confidenceFor(to)
	};
	return { state: next, changed: true, from, to };
}
