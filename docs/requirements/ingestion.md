# Ingestão e Normalização — Requisitos (Plano B)

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

## Componentes

### PostManager (`$lib/ingestion/post-manager.ts`)

Orquestrador isomórfico — roda no foreground (página) e no Service Worker, com a mesma API.

Responsabilidades:
- Determinar quais usuários têm cada `nodeId` ativado e calcular o intervalo agregado para a fonte (o **menor** intervalo entre os usuários interessados ganha).
- Aplicar **conditional GET** via `If-None-Match` / `If-Modified-Since` quando o `FetcherState` tem `etag` / `lastModified`.
- Normalizar o payload uma única vez e fazer `savePostsForUser(userId, posts)` para cada usuário interessado.
- Aplicar **backoff exponencial** com jitter quando uma fetch falha; resetar em sucesso.
- Aplicar **retenção** per-usuário (ver seção própria).

### Scheduler (`$lib/ingestion/scheduler.ts`)

Loop leve baseado em `setInterval` que chama `postManager.tick()` no intervalo de tick configurado.
Roda no foreground enquanto o app está aberto; no Service Worker, é acionado via Periodic Background Sync e Background Sync (ver capabilities).

### Clients de ingestão

| Protocolo | Arquivo | Mecanismo |
|---|---|---|
| RSS 2.0 | `ingestion/rss/rss.client.ts` | HTTP GET com conditional headers; parse XML |
| Atom 1.0 | `ingestion/atom/atom.client.ts` | HTTP GET com conditional headers; parse XML |
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
| `normalizeNostrEvent(event, nodeId)` | IngestedPost | id = `event.id`; URL = `nostr:{id}` (NIP-21); `created_at` em segundos → ms |

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

### Backoff em falha

Configurável via 4 campos:

- `backoffEnabled: boolean` — se `false`, sempre tenta no intervalo normal.
- `backoffMultiplier: number` (default `2`, range 1–10, step 0.1).
- `maxBackoffSteps: number` (default `6`, range 0–20) — quantas falhas consecutivas saturam o multiplicador.
- `maxBackoffMs: number` (default `24h`) — teto absoluto.

Fórmula: `min(intervalo * multiplier^min(failures, maxSteps), maxBackoffMs)`.

A página de settings exibe **preview ao vivo** das primeiras N falhas (ex.: `#1: 10min · #2: 20min · #3: 40min ...`).

### Retenção (órfãos)

Cada usuário tem `orphanRetentionMs` (default 30 dias). `runRetention(now)` move para a lixeira posts com `publishedAt < now - retention` que não estão `saved` nem `trashed`. Posts marcados como saved nunca caem na retenção.

## Persistência

### `posts` store

Schema v12: cada post é um registro com chave sintética `_pk = ${userId}|${nodeId}|${id}`.

Índices:
- `byUser` (`userId`) — listar caixa de um usuário.
- `byUserNode` (`_userNode = ${userId}|${nodeId}`) — listar uma fonte de um usuário.

Posts iguais (mesmo `id` da fonte) ativados por dois usuários ocupam **dois registros**, um por caixa. Fields per-usuário (`read`, `savedAt`, `trashedAt`) ficam isolados.

### `fetcherStates` store

Um registro por `nodeId`, compartilhado entre todos os usuários que ativaram a fonte. Campos:

```typescript
interface FetcherState {
  nodeId: string;
  etag?: string;
  lastModified?: string;
  lastSuccessAt: number;
  lastFailureAt: number;
  consecutiveFailures: number;
  nextScheduledAt: number;
}
```

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
- Conditional GET é obrigatório quando o servidor envia `ETag` ou `Last-Modified`.
- Backoff e jitter previnem trovões em massa após falha de rede.
- Settings são per-usuário; o intervalo efetivo de uma fonte é o **menor** entre os usuários interessados (coalescência no nível de rede).
- Migração destrutiva v11→v12: dados de `posts` antigos (chave por `nodeId`) são apagados; o backfill recria.

## Funcionalidades

- [x] PostManager isomórfico (foreground + SW)
- [x] Scheduler com tick configurável
- [x] Conditional GET (ETag / Last-Modified)
- [x] Backoff exponencial configurável (4 fields) com preview
- [x] Tiers de ociosidade configuráveis (5 fields)
- [x] HTTP adapter por plataforma (web proxy / Tauri http)
- [x] Normalizadores RSS / Atom / Nostr (puros, sem userId)
- [x] Per-user post boxes com backfill
- [x] FetcherState per-source compartilhado
- [x] Retenção de órfãos per-usuário
- [x] Cliente Nostr via WebSocket (REQ + EOSE)
- [ ] Periodic Background Sync handler completo (stub atual)
- [ ] Background Sync handler completo (stub atual)
