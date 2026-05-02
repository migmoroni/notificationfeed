# Notification System

Notfeed has **two independent notification channels**, both consumed
by the same engine entrypoint (`runNotificationPipeline(userId,
now)`).

## Channel 1 — Post pipeline (three steps)

For every newly ingested post that the user has not yet been
notified about, the engine evaluates three steps in order, and the
first match consumes the post:

1. **per_post**     — one notification per matching post. Click
   opens the post URL.
2. **batch_macro**  — one summary per matched feed-macro when new
   posts arrive. Click opens the feed page with that macro selected.
3. **batch_global** — catch-all: one global summary when any new
   posts arrive. Click opens the feed page with the synthetic
   "all macros" view.

Posts are matched against feed-macros via the shared evaluator in
`$lib/domain/feed-macro/macro-evaluator.ts`, so the feed and the
notifications agree by construction. Macro IDs that no longer
resolve to a real macro are silently ignored.

A first-delivery cooldown bypass is applied to `batch_global`: when
the bucket contains at least one post from a node that has never had
a `batch_global` fire before, the engine notifies even if the
configured interval has not elapsed. This guarantees a "you started
getting posts from X" ping for every newly activated font.

## Channel 2 — Pipeline events

The post-manager emits a `PipelineEvent` for every legal transition
in the ingestion state machine (see
`docs/ingestion-pipeline.md`). These events are persisted in the
durable `pipelineEvents` IDB store and consumed per-user by
`pipeline-event-consumer.ts`.

### Event → Inbox kind mapping

| `PipelineEventType`   | `InboxEntryKind`        | Severity |
|-----------------------|-------------------------|----------|
| PIPELINE_UNSTABLE     | `font_unstable`         | warning  |
| PIPELINE_OFFLINE      | `font_offline`          | critical |
| PIPELINE_RECOVERED    | `font_recovered`        | info     |
| PIPELINE_DEGRADED     | `font_degraded`         | warning  |
| SOURCE_SWITCHED       | `font_source_switched`  | info     |

The inbox bell renders each kind with a colored left border:
destructive (offline), orange (unstable), emerald (recovered), muted
(degraded), blue (source switched).

### Per-user settings

`NotificationPipeline.pipelineEvents` holds three knobs:

```ts
{
  mode: 'realtime' | 'batched',
  severityThreshold: 'info' | 'warning' | 'critical',
  batchIntervalMs: number
}
```

- `severityThreshold` drops events below the threshold (consumed
  anyway so they don't pile up in the queue).
- `mode='realtime'` fires every event past the threshold, subject to
  the per-event-type dedup windows in
  `NOTIFICATIONS.pipelineEventDedup`.
- `mode='batched'` adds an extra rate limit: if any pipeline-event
  inbox entry has been written within the last `batchIntervalMs`,
  the consumer leaves the events unconsumed and tries again next
  tick.

### Dedup

Per `(fontId, eventType)`, the consumer skips an event if there is
already an inbox entry of the same kind for the same font within
the configured window:

| Event type        | Window |
|-------------------|--------|
| UNSTABLE          | 30 min |
| OFFLINE           | 6 h    |
| DEGRADED          | 30 min |
| SOURCE_SWITCHED   | 6 h    |
| RECOVERED         | 0 (never deduped) |

`RECOVERED` never deduplicates because users always want to know a
font came back online.

## Engine flow per tick

```
runNotificationPipeline(userId, now):
  1. consumePipelineEvents(userId, now)           ← Channel 2 first
       - load pipeline + settings
       - listUnconsumedPipelineEvents
       - filter by severity + dedup vs inbox history
       - in batched mode: defer if last fire < batchIntervalMs
       - appendInboxEntries + notifyOs
       - markPipelineEventsConsumed (delivered + dropped)
  2. loadUserContext(userId) [post pipeline]      ← Channel 1
  3. listUnnotifiedForUser → 3-step evaluation
  4. appendInboxEntries + notifyOs + markPostsNotified
```

Both channels share the same inbox store and the same OS notifier;
only the producer sides differ.

## Persistence layout

| Store             | Purpose                                         |
|-------------------|-------------------------------------------------|
| `fetcherStates`   | Per-font pipeline state (see ingestion docs)    |
| `pipelineEvents`  | Durable event queue (per-user `consumedBy[]`)   |
| `notificationInbox` | Canonical history of fired notifications     |
| `notificationMeta`  | `lastFiredAt` per step, `batchGlobalEverNotifiedNodeIds` |
| `users`           | `settingsUser.notifications` (per-user pipeline + events) |

Pipeline events are pruned by `prunePipelineEvents(now,
INGESTION_PIPELINE_EVENT_RETENTION_MS)` (default 7 days).
