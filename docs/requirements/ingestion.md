# Ingestão e Normalização — Requisitos

## Fluxo de dados

```
                         ┌──────────────────────────────────────┐
                         │   FetcherState (1 por nodeId)        │
                         │   etag · lastModified · backoff      │
                         │   nextScheduledAt · lastSuccessAt    │
                         └──────────────────────────────────────┘
                                          ▲
                                          │
Font (config) ──► Ingestion Client ──► Raw bytes ──► Normalizer ──► IngestedPost (sem userId)
                                                                            │
                                                         ┌──────────────────┴──────────────────┐
                                                         ▼                                     ▼
                                            savePostsForUser(user A)              savePostsForUser(user B)
                                                  (post box A)                          (post box B)
```

Uma fetch física → uma normalização → broadcast para cada caixa de usuário interessada.
Estado per-fonte (etag/backoff) é compartilhado; estado per-usuário (read/saved/trashed) é isolado.

O fluxo detalhado do payload ingerido até o post renderizado, incluindo
`imageUrl`, `videoUrl`, renderização sob demanda e cache runtime de imagens,
está em `docs/ingestion-to-post-flow.md`.

## Componentes

### PostManager (`$lib/ingestion/post-manager.ts`)

Orquestrador isomórfico — roda no foreground (página) e no Service Worker, com a mesma API.

Responsabilidades:
- Determinar quais usuários têm cada `nodeId` ativado e calcular o intervalo agregado para a fonte (o **menor** intervalo entre os usuários interessados ganha).
- Selecionar a entry de protocolo ativa via `getProtocolEntriesByPriority()` (primary declarada / promovida em runtime, depois fallbacks ranqueados por score).
- Aplicar **conditional GET** via `If-None-Match` / `If-Modified-Since` para HTTP, ou `since` para Nostr, usando os campos cacheados em `ProtocolFetcherState`.
- Avançar a máquina de estados (font: HEALTHY/RECOVERING/UNSTABLE/DEGRADED/OFFLINE; source: CLOSED/OPEN/HALF_OPEN) e emitir `PipelineEvent` em toda transição legítima.
- Promover fallback como `effectivePrimaryEntryId` quando ela ganhar score sustentável sobre a primary atual; emitir `SOURCE_SWITCHED`.
- Normalizar o payload uma única vez e fazer `savePostsForUser(userId, posts)` para cada usuário interessado.
- Aplicar **backoff exponencial** com jitter por entry em falha; resetar contadores e EWMA em sucesso.
- Aplicar **retenção** per-usuário (ver seção própria).

### Scheduler (`$lib/ingestion/scheduler.ts`)

Loop leve baseado em `setInterval` que chama `postManager.tick()` no intervalo de tick configurado.
Roda no foreground enquanto o app está aberto; no Service Worker, é acionado via Periodic Background Sync e Background Sync (ver capabilities).

### Clients de ingestão

| Protocolo | Arquivo | Mecanismo |
|---|---|---|
| RSS 2.0 | `ingestion/rss/rss.client.ts` | HTTP GET com conditional headers; parse XML |
| Atom 1.0 | `ingestion/atom/atom.client.ts` | HTTP GET com conditional headers; parse XML |
| JSON Feed 1.0/1.1 | `ingestion/jsonfeed/jsonfeed.client.ts` | HTTP GET com conditional headers; `JSON.parse` lenient (erro/shape inválido → `[]`) |
| Nostr | `ingestion/nostr/nostr.client.ts` | WebSocket nos relays da Font; `REQ` com filtros (`authors`, `kinds`), encerra após `EOSE` |

### HTTP Adapter (`$lib/ingestion/net/`)

Factory que retorna o adapter apropriado por plataforma:
- **Web/PWA/TWA**: `web-proxy.adapter.ts` — usa proxy CORS configurável (template-based, ex.: `https://corsproxy.io/?{url}`).
- **Tauri (desktop/mobile nativo)**: `tauri-http.adapter.ts` — chama `tauri-plugin-http` direto, sem CORS.

Detecção via `isTauri()` (presença de `__TAURI_INTERNALS__`).

### Normalizadores (`$lib/normalization/`)

Funções **puras** que produzem `IngestedPost` (mesmo shape do `CanonicalPost` mas sem `userId` e sem flags de estado per-usuário). O PostManager atribui `userId` ao inserir em cada caixa.

| Função | Saída | Notas |
|---|---|---|
| `normalizeRssItem(item, nodeId)` | IngestedPost | id = `guid ?? link`; data inválida → `now` |
| `normalizeAtomEntry(entry, nodeId)` | IngestedPost | id = `entry.id`; prefere `<content>` sobre `<summary>` |
| `normalizeJsonfeedItem(item, nodeId)` | IngestedPost | id = `item.id ?? item.url`; conteúdo: `content_html` → `content_text` → `summary`; autor v1.1 (`authors[0].name`) → v1 (`author.name`); data: `date_published` → `date_modified` → `now` |
| `normalizeNostrEvent(event, nodeId)` | IngestedPost | id = `event.id`; URL = `nostr:{id}` (NIP-21); `created_at` em segundos → ms |

### Mídia de posts

Clients e normalizers extraem `imageUrl` e `videoUrl` durante a ingestão, mas
apenas como strings persistidas no post. A fronteira é:

- clients capturam hints específicos do protocolo (RSS/Atom media namespace,
  enclosures, JSON Feed fields/attachments, tags Nostr);
- normalizers escolhem/canonicalizam a mídia final e aplicam fallback genérico
  sobre HTML/texto já presente no payload do feed/evento;
- `savePostsForUser` persiste `imageUrl` e `videoUrl` no post;
- nenhum client/normalizer baixa o arquivo de imagem ou vídeo final;
- a UI baixa mídia apenas ao renderizar `<img>`, `<video>` ou iframe;
- imagens vistas entram no runtime cache do service worker e expiram após 30
  dias sem uso.

## Configuração per-usuário

Embarcada em `UserSettings.ingestion` — cada usuário ajusta independentemente.

### Tiers de ociosidade

| Tier | Período de ociosidade | Intervalo de fetch | Default |
|---|---|---|---|
| Ativo | 0h → tier1Max | `activeIntervalMs` | 30 min |
| Tier 1 | tier1Max → tier2Max | `idleTier1IntervalMs` | 4 h após 24 h |
| Tier 2 | tier2Max → tier3Max | `idleTier2IntervalMs` | 24 h após 72 h |
| Tier 3 | > tier3Max | `idleTier3IntervalMs` | (raramente atingido) |

Todos os 5 limiares (`idleTier{1,2,3}IntervalMs`, `idleTier{1,2}MaxIdleMs`) são editáveis em `/user/settings/ingestion`.

### Backoff em falha (system-level)

A política de backoff afeta uma `ProtocolFetcherState` por entry de protocolo (compartilhada entre todos os usuários da fonte) e não cabe ao usuário final ajustar. Os parâmetros vivem em `src/lib/config/back-settings.ts` (constante `INGESTION_BACKOFF`):

- `enabled: boolean` — mestre. `false` desativa backoff (sempre intervalo normal).
- `multiplier: number` — fator de crescimento (default `2`).
- `maxSteps: number` — teto do expoente (default `6`).
- `maxMs: number` — teto absoluto (default `24h`).

Fórmula: `min(intervalo * multiplier^min(failures, maxSteps), maxMs)` + jitter.

Valores complementares de circuit-breaker, instabilidade e scoring vivem em `INGESTION_CIRCUIT_BREAKER`, `INGESTION_INSTABILITY` e `INGESTION_PROTOCOL_SCORING`. Ver `docs/ingestion-pipeline.md` para a dinâmica.

### Retenção (órfãos)

Cada usuário tem janelas de retenção para fontes ativas e órfãs. `runRetention(now)` move para a lixeira posts com `ingestedAt < now - retention` que não estão `saved` nem `trashed`. A data original de publicação não decide retenção; um post antigo recém-ingerido ainda fica visível. Posts marcados como saved nunca caem na retenção.

## Persistência

### `posts` store

Cada post é um registro com chave sintética `_pk = ${userId}|${nodeId}|${id}`.

Índices:
- `byUser` (`userId`) — listar caixa de um usuário.
- `byUserNode` (`_userNode = ${userId}|${nodeId}`) — listar uma fonte de um usuário.

Posts iguais (mesmo `id` da fonte) ativados por dois usuários ocupam **dois registros**, um por caixa. Fields per-usuário (`read`, `savedAt`, `trashedAt`) ficam isolados.

### `fetcherStates` store

Um registro por `nodeId`, compartilhado entre todos os usuários que ativaram a fonte. Carrega o estado da máquina de pipeline e um sub-mapa por entry de protocolo:

```typescript
interface FetcherState {
  nodeId: string;
  pipelineState: PipelineState;          // HEALTHY | RECOVERING | UNSTABLE | DEGRADED | OFFLINE
  confidence: number;                    // 0..1, derivada do pipelineState
  effectivePrimaryEntryId: string | null;
  lastTransitionAt: number;
  recoveringTicksRemaining: number;
  protocols: Record<string, ProtocolFetcherState>;
}

interface ProtocolFetcherState {
  entryId: string;
  circuitState: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
  failureCount: number;
  consecutiveFailures: number;
  successRate: number;                   // EWMA
  avgLatencyMs: number;                  // EWMA
  score: number;
  backoffUntil: number | null;
  etag?: string;
  lastModified?: string;
  nostrSince?: number;
  lastFetchedAt: number;
  lastSuccessAt: number;
  lastAttemptAt: number;
}
```

### `pipelineEvents` store

Fila durável de eventos emitidos a cada transição legítima da máquina (`PIPELINE_UNSTABLE`, `PIPELINE_OFFLINE`, `PIPELINE_RECOVERED`, `PIPELINE_DEGRADED`, `SOURCE_SWITCHED`). Consumida por `pipeline-event-consumer.ts`. Podada após `INGESTION_PIPELINE_EVENT_RETENTION_MS` (7 dias). Ver `docs/notification-system.md`.

## Ações que disparam fetches

| Evento | Comportamento |
|---|---|
| Boot do app (foreground) | `startScheduler()` → primeiro `tick()` imediato |
| Reconexão de rede (`online`) | `tickNow()` na thread ativa; `sync` no SW |
| Periodic Background Sync (PWA instalada) | SW chama `tick()` |
| Usuário ativa nova font | `backfillPostsForUserNode(userId, nodeId)` copia posts existentes de outras caixas; depois agenda fetch normal |
| Usuário desativa font | `deletePostsForUserNode(userId, nodeId)` apaga apenas a caixa dele |

## Regras

- Normalizadores nunca atribuem `userId` — quem faz o broadcast é o PostManager.
- Conditional GET é obrigatório quando o servidor envia `ETag` ou `Last-Modified`; para Nostr, usa-se `since` em REQ.
- Backoff e jitter previnem trovões em massa após falha de rede.
- Settings de cadência são per-usuário; o intervalo efetivo de uma fonte é o **menor** entre os usuários interessados (coalescência no nível de rede).
- A primary declarada no `FontBody` não muta; a promoção de fallback acontece apenas no campo runtime `effectivePrimaryEntryId` do `FetcherState`.
- Toda transição legítima emite `PipelineEvent`; loops auto-permitidos (e.g. UNSTABLE → UNSTABLE) não emitem.
- Ingestão e normalização não pré-carregam bytes de mídia; elas persistem URLs
  canônicas (`imageUrl`/`videoUrl`) para renderização sob demanda.

## Funcionalidades

- [x] PostManager isomórfico (foreground + SW)
- [x] Multi-protocolo por font (`FontBody.protocols[]`) com primary + fallbacks
- [x] Máquina de estados em dois níveis (font + por source) com `transition()` puro
- [x] Três modos em camadas: Adaptive Fallback / Backoff Exponencial / Circuit Breaker
- [x] Promoção de fallback em runtime (`effectivePrimaryEntryId`) com `SOURCE_SWITCHED`
- [x] EWMA de successRate / latência + score por entry
- [x] Confidence derivada (HEALTHY=1.0 → OFFLINE=0.0)
- [x] Conditional GET (ETag / Last-Modified) e `since` em Nostr
- [x] Backoff exponencial system-level em `back-settings.ts`
- [x] Tiers de ociosidade configuráveis (5 fields)
- [x] HTTP adapter por plataforma (web proxy / Tauri http)
- [x] Normalizadores RSS / Atom / JSON Feed / Nostr (puros, sem userId)
- [x] Per-user post boxes com backfill
- [x] FetcherState per-source compartilhado
- [x] Retenção de órfãos per-usuário
- [x] Cliente Nostr via WebSocket (REQ + EOSE)
- [x] Fila durável `pipelineEvents` com poda em 7 dias
- [x] Captura e normalização de `imageUrl` / `videoUrl` por protocolo
- [x] Periodic Background Sync handler chamando `PostManager.tick()`
- [x] Background Sync handler chamando `PostManager.tick()`
