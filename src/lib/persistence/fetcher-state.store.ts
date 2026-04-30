/**
 * Fetcher state store — per-source ingestion metadata (Plano B).
 *
 * Single record per `nodeId`, shared across all users that activated the
 * source. The PostManager reads/writes this to schedule fetches, send
 * conditional GETs, and apply backoff.
 */

import type { FetcherState } from '$lib/domain/ingestion/fetcher-state.js';
import { emptyFetcherState } from '$lib/domain/ingestion/fetcher-state.js';
import { getStorageBackend } from './db.js';

/** Returns the stored state, or a fresh empty state if none exists. */
export async function getFetcherState(nodeId: string): Promise<FetcherState> {
	const db = await getStorageBackend();
	const existing = await db.fetcherStates.getById<FetcherState>(nodeId);
	return existing ?? emptyFetcherState(nodeId);
}

/** Persist updated state for a source after a fetch attempt. */
export async function putFetcherState(state: FetcherState): Promise<void> {
	const db = await getStorageBackend();
	await db.fetcherStates.put(state);
}

/**
 * Drop the state row for a source. Called when the source is removed
 * across all users — individual user deactivations leave the row in
 * place because other users may still be subscribed.
 */
export async function deleteFetcherState(nodeId: string): Promise<void> {
	const db = await getStorageBackend();
	await db.fetcherStates.delete(nodeId);
}

/** Returns sources whose `nextScheduledAt <= now` (or that have never run). */
export async function getDueFetcherStates(
	nodeIds: string[],
	now: number = Date.now()
): Promise<{ nodeId: string; state: FetcherState }[]> {
	const result: { nodeId: string; state: FetcherState }[] = [];
	for (const nodeId of nodeIds) {
		const state = await getFetcherState(nodeId);
		if (state.nextScheduledAt <= now) {
			result.push({ nodeId, state });
		}
	}
	return result;
}
