# Ingestion Pipeline

This document describes the explicit state machine that governs how
Notfeed fetches posts from a font (a multi-protocol source).

## Per-font and per-source state

Each ingested font carries one `FetcherState` row in IDB
(`fetcherStates` store, keyed by `nodeId`). Inside it, every protocol
declared on the font (`FontBody.protocols[*]`) maintains its own
`ProtocolFetcherState`. The font-level state machine summarizes the
font as a whole; the source-level state machine governs each
underlying protocol's circuit breaker.

```
FetcherState
├── pipelineState        : HEALTHY | RECOVERING | UNSTABLE | DEGRADED | OFFLINE
├── confidence           : 0..1   — derived from pipelineState (config table)
├── effectivePrimaryEntryId  — runtime promoted source (or null = declared primary)
├── lastTransitionAt
├── recoveringTicksRemaining
└── protocols
    └── <entryId>: ProtocolFetcherState
        ├── circuitState  : CLOSED | OPEN | HALF_OPEN
        ├── failureCount, consecutiveFailures
        ├── successRate (EWMA), avgLatencyMs (EWMA), lastLatencyMs
        ├── score
        ├── backoffUntil  — epoch ms; null if eligible
        └── etag, lastModified, nostrSince, lastFetchedAt, lastSuccessAt, lastAttemptAt
```

All numeric configs live in `back-settings.ts` under
`INGESTION_PROTOCOL_SCORING`, `INGESTION_INSTABILITY`,
`INGESTION_CIRCUIT_BREAKER`, `INGESTION_BACKOFF`,
`INGESTION_CONFIDENCE`.

## Feed URL transport (HTTP + IPFS/IPNS)

The logical feed protocol remains unchanged (`rss`, `atom`,
`jsonfeed`). The transport is determined by the `config.url` scheme:

- `http://` / `https://`
- `ipfs://<cid>[/path]`
- `ipns://<name>[/path]` (including DNSLink names like domains)
- HTTP gateway paths such as `/ipfs/<cid>/...` and `/ipns/<name>/...`

Resolution strategy by runtime:

- **Web/PWA/TWA**: `ipfs://` and `ipns://` are mapped to the user's
  configured IPFS gateway chain (`ingestion.ipfsGatewayServices`), then
  the existing proxy chain is applied when `proxyEnabled=true`.
- **Tauri desktop**: tries Helia first (with timeout/body cap), then
  falls back to the same gateway chain, optionally wrapped by proxy
  templates.

Conditional GET (`ETag`/`Last-Modified`) and parsed-body detection
remain unchanged for HTTP/gateway requests. Helia-resolved content is
treated as a fresh `200` payload with no cache headers.

## Font-level state machine

```
                        ┌──────── success ─────────┐
                        │                          │
                        v                          │
   HEALTHY ──── failure ──> UNSTABLE              │
      ^                       │                    │
      │                       │ all sources OPEN   │
      │                       v                    │
      │                   OFFLINE                 │
      │                       │                    │
      │                       │ probe success      │
      │                       v                    │
      └──── ticks elapsed ─ RECOVERING ←───────────┘
                              │
                              │ probe failure
                              v
                          UNSTABLE
                          (or OFFLINE if all sources still OPEN)
```

`DEGRADED` is reserved for a future heuristic where some sources are
healthy and others are not while the font as a whole is still
delivering posts; the current implementation primarily uses
`HEALTHY ↔ UNSTABLE ↔ OFFLINE` plus the `RECOVERING` hold.

Legal transitions are encoded in the `TRANSITIONS` map inside
`fetcher-state.ts` and validated by the pure helper
`transition(state, to, now, confidenceFor)`.

## Per-source state machine (circuit breaker)

```
   CLOSED ── failureCount >= openAfterFailures ──> OPEN
     ^               OR backoffMs >= openAfterBackoffMs   │
     │                                                    │
     │                                            probe due (6h..24h)
     │                                                    │
     │                                                    v
     │                                                HALF_OPEN
     │                                                    │
     │ probe success                                       │ probe failure
     └────────────────────────────────────────────────────┘
                                                           │
                                                           v
                                                          OPEN
```

Only one probe is allowed per probe window. The probe interval is
randomized between `probeIntervalMin` and `probeIntervalMax` to
avoid synchronizing recovery attempts across users.

## Three execution modes

Each tick of the post-manager runs all three modes simultaneously —
they are not switches but layered policies.

### 1. Adaptive Fallback (per-tick)

The trial order is built from `getProtocolEntriesByPriority(body,
scores, effectivePrimaryEntryId)`: declared (or runtime-promoted)
primary first, then fallbacks ranked by score. The first source
whose `circuitState !== 'OPEN'` and `backoffUntil <= now` is the
"active" source. Fallbacks only run when the active source has
crossed `failoverThreshold` consecutive failures within the same
tick (so a single transient blip does NOT thrash to fallback).

The first success in the trial order ends the tick.

### 2. Exponential Backoff (per-source)

On failure:

```
backoffMs = min(
  baseInterval * multiplier^min(failureCount, maxSteps),
  maxMs
)
backoffUntil = now + backoffMs
```

Eligibility checks (`backoffUntil > now`) naturally skip sources
still serving their backoff. The font itself is rescheduled at
`unstableSparseIntervalMs` (currently 1h) when at least one source
is still alive.

### 3. Circuit Breaker (per-source, escalating)

A source flips from `CLOSED` to `OPEN` when either:

- `failureCount >= openAfterFailures` (default 6), OR
- `backoffMs >= openAfterBackoffMs` (default 24h)

While `OPEN`, the source's `backoffUntil` is set to
`now + randBetween(probeIntervalMin, probeIntervalMax)`. When the
window elapses the next tick promotes it to `HALF_OPEN`, fires one
probe, and either:

- closes the breaker (`CLOSED`) on success — counters reset, score
  bumped, EWMA latency/successRate updated, and the font enters
  `RECOVERING` for `recoveringHoldTicks` ticks before transitioning
  back to `HEALTHY`.
- re-opens the breaker on failure with a fresh probe window.

When **every** source on a font is `OPEN` the font is `OFFLINE`.

## Confidence

`FetcherState.confidence` is derived from `pipelineState` via
`INGESTION_CONFIDENCE`:

| State        | Confidence |
|--------------|------------|
| HEALTHY      | 1.0        |
| RECOVERING   | 0.7        |
| UNSTABLE     | 0.5        |
| DEGRADED     | 0.3        |
| OFFLINE      | 0.0        |

The UI surfaces this number where useful (badges, debug overlays).

## Pipeline events

Every legal transition appends a `PipelineEvent` to the `pipelineEvents`
store via `appendPipelineEvent`:

| Event type           | Severity | Default dedup |
|----------------------|----------|---------------|
| PIPELINE_UNSTABLE    | warning  | 30 min        |
| PIPELINE_OFFLINE     | critical | 6 h           |
| PIPELINE_RECOVERED   | info     | (never)       |
| PIPELINE_DEGRADED    | warning  | 30 min        |
| SOURCE_SWITCHED      | info     | 6 h           |

The consumer (`pipeline-event-consumer.ts`) reads these events,
applies the user's per-channel settings (`mode`, `severityThreshold`,
`batchIntervalMs`) plus the dedup window above, and writes inbox
entries / OS notifications. See `docs/notification-system.md` for
the consumer side of the contract.

## Reset

`resetAllProtocolScoring()` returns every font to a pristine state:
all per-source records are reset to `CLOSED` with zero counters;
the font itself is moved back to `HEALTHY` with full confidence.
Cache headers (etag/lastModified/nostrSince) and schedules are
preserved so the next refresh can use cheap conditional requests.
