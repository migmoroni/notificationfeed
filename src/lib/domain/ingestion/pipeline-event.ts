/**
 * PipelineEvent — domain model for the event-driven notification bus.
 *
 * The ingestion pipeline (post-manager) does not deliver notifications
 * directly. Instead it appends `PipelineEvent` records to the
 * `pipelineEvents` IDB store; a separate consumer
 * (`pipeline-event-consumer.ts`) reads unconsumed events, applies the
 * user's filter / dedup / escalation / batch rules and turns them into
 * inbox entries + OS notifications.
 *
 * See `docs/notification-system.md` for the full flow.
 */

export type PipelineEventType =
	| 'PIPELINE_UNSTABLE'
	| 'PIPELINE_OFFLINE'
	| 'PIPELINE_RECOVERED'
	| 'PIPELINE_DEGRADED'
	| 'SOURCE_SWITCHED';

export type EventSeverity = 'info' | 'warning' | 'critical';

export interface PipelineEvent {
	/** Unique id (uuidv7-style string). Used as IDB primary key. */
	id: string;
	/** Composite font nodeId this event applies to. */
	fontId: string;
	type: PipelineEventType;
	severity: EventSeverity;
	/** Epoch ms. */
	timestamp: number;
	/**
	 * Optional opaque metadata (e.g. fromSourceId/toSourceId for
	 * SOURCE_SWITCHED, failureCount for PIPELINE_OFFLINE).
	 */
	metadata?: Record<string, unknown>;
	/**
	 * Per-user consumption ledger. The consumer marks an event as
	 * consumed for a given userId after deciding (notify or skip). An
	 * event is fully consumed when every interested userId has been
	 * processed; pruning then removes it. Stored as a list to keep
	 * the model multi-user-friendly without a separate junction table.
	 */
	consumedBy: string[];
}

/** Default severity for each event type. */
export function defaultSeverityFor(type: PipelineEventType): EventSeverity {
	switch (type) {
		case 'PIPELINE_OFFLINE':
			return 'critical';
		case 'PIPELINE_UNSTABLE':
			return 'warning';
		case 'PIPELINE_RECOVERED':
		case 'PIPELINE_DEGRADED':
		case 'SOURCE_SWITCHED':
			return 'info';
	}
}

/** Numeric rank for severity comparison. */
export function severityRank(s: EventSeverity): number {
	switch (s) {
		case 'info':
			return 0;
		case 'warning':
			return 1;
		case 'critical':
			return 2;
	}
}

/** True iff `s` meets or exceeds `threshold`. */
export function severityMeets(s: EventSeverity, threshold: EventSeverity): boolean {
	return severityRank(s) >= severityRank(threshold);
}
