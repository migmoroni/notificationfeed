# Pipeline de Ingestão

Este documento descreve a máquina de estados explícita que governa
como o Notfeed busca posts de uma font (uma fonte multi-protocolo).

## Estado por font e por source

Cada font ingerida carrega um registro `FetcherState` no IDB
(store `fetcherStates`, chave `nodeId`). Dentro dele, cada
protocolo declarado na font (`FontBody.protocols[*]`) mantém seu
próprio `ProtocolFetcherState`. A máquina de estados em nível de
font resume a font como um todo; a máquina em nível de source
governa o circuit breaker de cada protocolo subjacente.

```
FetcherState
├── pipelineState        : HEALTHY | RECOVERING | UNSTABLE | DEGRADED | OFFLINE
├── confidence           : 0..1   — derivado do pipelineState (tabela de config)
├── effectivePrimaryEntryId  — source promovida em runtime (ou null = primary declarada)
├── lastTransitionAt
├── recoveringTicksRemaining
└── protocols
    └── <entryId>: ProtocolFetcherState
        ├── circuitState  : CLOSED | OPEN | HALF_OPEN
        ├── failureCount, consecutiveFailures
        ├── successRate (EWMA), avgLatencyMs (EWMA), lastLatencyMs
        ├── score
        ├── backoffUntil  — epoch ms; null se elegível
        └── etag, lastModified, nostrSince, lastFetchedAt, lastSuccessAt, lastAttemptAt
```

Todas as configs numéricas vivem em `back-settings.ts` sob
`INGESTION_PROTOCOL_SCORING`, `INGESTION_INSTABILITY`,
`INGESTION_CIRCUIT_BREAKER`, `INGESTION_BACKOFF`,
`INGESTION_CONFIDENCE`.

## Do feed ao post salvo

Este documento foca na máquina de estados, eleição de source,
backoff e circuit-breaker. O fluxo de dados completo — client do
protocolo, normalizer, `CanonicalPost`, persistência por usuário,
renderização e cache de mídia — está em
`docs/ingestion-to-post-flow.md`.

Regra de mídia: a ingestão baixa o payload do feed/evento e salva
`imageUrl`/`videoUrl` como URLs do post. Ela não baixa os arquivos
de imagem/vídeo apontados por essas URLs. Imagens e vídeos são
requisitados quando a UI renderiza a mídia; imagens vistas podem ser
servidas depois pelo cache runtime do service worker.

## Transporte de URL de feed (HTTP + IPFS/IPNS)

O protocolo lógico de feed permanece inalterado (`rss`, `atom`,
`jsonfeed`). O transporte é determinado pelo esquema da `config.url`:

- `http://` / `https://`
- `ipfs://<cid>[/path]`
- `ipns://<name>[/path]` (incluindo nomes DNSLink, como domínios)
- URLs HTTP de gateway como `/ipfs/<cid>/...` e `/ipns/<name>/...`

Estratégia de resolução por runtime:

- **Web/PWA/TWA**: tenta Helia primeiro (com timeout/limite de bytes).
  Se falhar, entra na matriz IPFS/IPNS por protocolo configurada pelo
  usuário em `UserSettings.ingestion.ipfsFeedTransportByKind`, sempre na
  ordem fixa: `direto (Helia) -> gateway -> proxy sobre gateway`.
- **Tauri desktop**: segue a mesma sequência, usando
  `@tauri-apps/plugin-http` na etapa HTTP de fallback.

Matriz IPFS/IPNS por protocolo (`rss`, `atom`, `jsonfeed`):

- `directEnabled`: permite a fase direta via Helia.
- `gatewayEnabled`: permite a fase HTTP por gateway direto, usando a
  lista `ingestion.ipfsGatewayServices` na ordem definida pelo usuário.
- `proxyEnabled`: permite a fase HTTP via proxy, isto é, cada URL de
  gateway encapsulada por cada entrada da lista `ingestion.proxyServices`.

Exemplo para `ipfs://bafy.../feed.xml`:

1. Direto: resolução via Helia.
2. Gateway: `https://w3s.link/ipfs/bafy.../feed.xml`.
3. Proxy: `https://corsproxy.io/?https%3A%2F%2Fw3s.link%2Fipfs%2Fbafy...%2Ffeed.xml`.

Observações:

- Se `gatewayEnabled=false`, a fase de gateway é pulada.
- Se `proxyEnabled=false`, a fase de proxy é pulada.
- Se ambas estiverem desligadas, não há fallback HTTP para IPFS/IPNS.
- Nostr não usa essa matriz; continua usando relays diretamente.

`Conditional GET` (`ETag`/`Last-Modified`) e detecção de formato do
body continuam iguais para requisições HTTP/gateway. Conteúdo resolvido
via Helia é tratado como payload novo `200`, sem headers de cache.

## Máquina de estados em nível de font

```
                        ┌──────── sucesso ────────┐
                        │                          │
                        v                          │
   HEALTHY ──── falha ──> UNSTABLE                │
      ^                       │                    │
      │                       │ todas as sources OPEN
      │                       v                    │
      │                   OFFLINE                 │
      │                       │                    │
      │                       │ probe com sucesso  │
      │                       v                    │
      └── ticks decorridos ─ RECOVERING ←──────────┘
                              │
                              │ falha de probe
                              v
                          UNSTABLE
                          (ou OFFLINE se todas as sources continuam OPEN)
```

`DEGRADED` está reservado para uma heurística futura na qual algumas
sources estão saudáveis e outras não, enquanto a font como um todo
continua entregando posts; a implementação atual usa
prioritariamente `HEALTHY ↔ UNSTABLE ↔ OFFLINE` mais a estadia em
`RECOVERING`.

As transições legais estão codificadas no mapa `TRANSITIONS` dentro
de `fetcher-state.ts` e validadas pelo helper puro
`transition(state, to, now, confidenceFor)`.

## Máquina de estados por source (circuit breaker)

```
   CLOSED ── failureCount >= openAfterFailures ──> OPEN
     ^               OU backoffMs >= openAfterBackoffMs   │
     │                                                    │
     │                                          probe disponível (6h..24h)
     │                                                    │
     │                                                    v
     │                                                HALF_OPEN
     │                                                    │
     │ probe com sucesso                                   │ probe com falha
     └────────────────────────────────────────────────────┘
                                                           │
                                                           v
                                                          OPEN
```

Apenas um probe é permitido por janela. O intervalo de probe é
randomizado entre `probeIntervalMin` e `probeIntervalMax` para
evitar sincronizar tentativas de recuperação entre usuários.

## Três modos de execução

Cada tick do post-manager executa os três modos simultaneamente —
não são switches, são políticas em camadas.

### 1. Adaptive Fallback (por tick)

A ordem de tentativa é construída por
`getProtocolEntriesByPriority(body, scores, effectivePrimaryEntryId)`:
primary declarada (ou promovida em runtime) primeiro, depois os
fallbacks ranqueados por score. A primeira source cujo
`circuitState !== 'OPEN'` e `backoffUntil <= now` é a "ativa". Os
fallbacks só rodam quando a source ativa cruza
`failoverThreshold` falhas consecutivas no mesmo tick (assim, um
único soluço transitório NÃO faz thrashing pro fallback).

O primeiro sucesso na ordem encerra o tick.

### 2. Backoff Exponencial (por source)

Em falha:

```
backoffMs = min(
  baseInterval * multiplier^min(failureCount, maxSteps),
  maxMs
)
backoffUntil = now + backoffMs
```

A checagem de elegibilidade (`backoffUntil > now`) naturalmente
pula sources ainda no backoff. A própria font é reagendada em
`unstableSparseIntervalMs` (atual 1h) quando ao menos uma source
ainda está viva.

### 3. Circuit Breaker (por source, escalonante)

Uma source vai de `CLOSED` para `OPEN` quando:

- `failureCount >= openAfterFailures` (default 6), OU
- `backoffMs >= openAfterBackoffMs` (default 24h)

Enquanto `OPEN`, o `backoffUntil` da source é setado para
`now + randBetween(probeIntervalMin, probeIntervalMax)`. Quando a
janela expira, o próximo tick a promove para `HALF_OPEN`, dispara
um probe, e:

- fecha o breaker (`CLOSED`) em sucesso — counters resetam, score
  sobe, latência/successRate (EWMA) atualizam, e a font entra em
  `RECOVERING` por `recoveringHoldTicks` ticks antes de transitar
  de volta para `HEALTHY`.
- reabre o breaker em falha com nova janela de probe.

Quando **todas** as sources de uma font estão `OPEN`, a font está
`OFFLINE`.

## Confidence

`FetcherState.confidence` é derivada de `pipelineState` via
`INGESTION_CONFIDENCE`:

| Estado       | Confidence |
|--------------|------------|
| HEALTHY      | 1.0        |
| RECOVERING   | 0.7        |
| UNSTABLE     | 0.5        |
| DEGRADED     | 0.3        |
| OFFLINE      | 0.0        |

A UI exibe esse número onde for útil (badges, debug overlays).

## Pipeline events

Toda transição legal anexa um `PipelineEvent` ao store
`pipelineEvents` via `appendPipelineEvent`:

| Tipo de evento       | Severidade | Dedup default |
|----------------------|------------|---------------|
| PIPELINE_UNSTABLE    | warning    | 30 min        |
| PIPELINE_OFFLINE     | critical   | 6 h           |
| PIPELINE_RECOVERED   | info       | (nunca)       |
| PIPELINE_DEGRADED    | warning    | 30 min        |
| SOURCE_SWITCHED      | info       | 6 h           |

O consumer (`pipeline-event-consumer.ts`) lê esses eventos, aplica
as configs por canal do usuário (`mode`, `severityThreshold`,
`batchIntervalMs`) mais a janela de dedup acima, e escreve entradas
de inbox / notificações de SO. Ver `docs/notification-system.pt-BR.md`
para o lado consumidor do contrato.

## Reset

`resetAllProtocolScoring()` retorna toda font ao estado pristino:
todos os registros por source vão para `CLOSED` com counters
zerados; a própria font volta para `HEALTHY` com confidence cheia.
Headers de cache (etag/lastModified/nostrSince) e schedules são
preservados, então o próximo refresh pode usar conditional GETs.
