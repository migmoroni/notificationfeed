# Sistema de Notificações

O Notfeed tem **dois canais de notificação independentes**, ambos
consumidos pelo mesmo entrypoint do engine
(`runNotificationPipeline(userId, now)`).

## Canal 1 — Pipeline de posts (três etapas)

Para cada post recém-ingerido sobre o qual o usuário ainda não foi
notificado, o engine avalia três etapas em ordem, e a primeira a
casar consome o post:

1. **per_post**     — uma notificação por post que casa. O clique
   abre a URL do post.
2. **batch_macro**  — um resumo por feed-macro casado quando novos
   posts chegam. O clique abre a página do feed com aquele macro
   selecionado.
3. **batch_global** — catch-all: um resumo global quando qualquer
   novo post chega. O clique abre a página do feed na visão
   sintética "todos os macros".

Os posts são casados contra feed-macros pelo avaliador compartilhado
em `$lib/domain/feed-macro/macro-evaluator.ts`, então o feed e as
notificações concordam por construção. IDs de macro que não
resolvem mais para um macro real são silenciosamente ignorados.

Um bypass de cooldown na primeira entrega é aplicado ao
`batch_global`: quando o bucket contém ao menos um post de um nó
que nunca disparou `batch_global` antes, o engine notifica mesmo
que o intervalo configurado não tenha decorrido. Isso garante um
ping de "você começou a receber posts de X" para toda font
recém-ativada.

## Canal 2 — Eventos de pipeline

O post-manager emite um `PipelineEvent` para toda transição legal
da máquina de estados de ingestão (ver
`docs/ingestion-pipeline.pt-BR.md`). Esses eventos são persistidos
no store durável `pipelineEvents` no IDB e consumidos por usuário
em `pipeline-event-consumer.ts`.

### Mapeamento Evento → Inbox kind

| `PipelineEventType`   | `InboxEntryKind`        | Severidade |
|-----------------------|-------------------------|------------|
| PIPELINE_UNSTABLE     | `font_unstable`         | warning    |
| PIPELINE_OFFLINE      | `font_offline`          | critical   |
| PIPELINE_RECOVERED    | `font_recovered`        | info       |
| PIPELINE_DEGRADED     | `font_degraded`         | warning    |
| SOURCE_SWITCHED       | `font_source_switched`  | info       |

O sino do inbox renderiza cada kind com uma borda esquerda
colorida: destrutivo (offline), laranja (unstable), esmeralda
(recovered), muted (degraded), azul (source switched).

### Configurações por usuário

`NotificationPipeline.pipelineEvents` carrega três knobs:

```ts
{
  mode: 'realtime' | 'batched',
  severityThreshold: 'info' | 'warning' | 'critical',
  batchIntervalMs: number
}
```

- `severityThreshold` descarta eventos abaixo do limiar (consumidos
  mesmo assim para não acumular na fila).
- `mode='realtime'` dispara todo evento acima do limiar, sujeito às
  janelas de dedup por tipo em `NOTIFICATIONS.pipelineEventDedup`.
- `mode='batched'` adiciona um rate limit extra: se qualquer
  entrada de inbox de pipeline-event foi escrita nos últimos
  `batchIntervalMs`, o consumer deixa os eventos não consumidos e
  tenta novamente no próximo tick.

### Dedup

Por `(fontId, eventType)`, o consumer pula um evento se já existe
uma entrada de inbox do mesmo kind para a mesma font dentro da
janela configurada:

| Tipo de evento    | Janela |
|-------------------|--------|
| UNSTABLE          | 30 min |
| OFFLINE           | 6 h    |
| DEGRADED          | 30 min |
| SOURCE_SWITCHED   | 6 h    |
| RECOVERED         | 0 (nunca dedupada) |

`RECOVERED` nunca é dedupada porque os usuários sempre querem
saber que uma font voltou a funcionar.

## Fluxo do engine por tick

```
runNotificationPipeline(userId, now):
  1. consumePipelineEvents(userId, now)         ← Canal 2 primeiro
       - carrega pipeline + settings
       - listUnconsumedPipelineEvents
       - filtra por severidade + dedup vs histórico do inbox
       - em modo batched: adia se último disparo < batchIntervalMs
       - appendInboxEntries + notifyOs
       - markPipelineEventsConsumed (entregues + descartados)
  2. loadUserContext(userId) [pipeline de posts] ← Canal 1
  3. listUnnotifiedForUser → avaliação 3 etapas
  4. appendInboxEntries + notifyOs + markPostsNotified
```

Os dois canais compartilham o mesmo store de inbox e o mesmo
notifier de SO; só os lados produtores diferem.

## Layout de persistência

| Store               | Propósito                                              |
|---------------------|--------------------------------------------------------|
| `fetcherStates`     | Estado da pipeline por font (ver docs de ingestão)     |
| `pipelineEvents`    | Fila durável de eventos (com `consumedBy[]` por usuário)|
| `notificationInbox` | Histórico canônico de notificações disparadas          |
| `notificationMeta`  | `lastFiredAt` por etapa, `batchGlobalEverNotifiedNodeIds` |
| `users`             | `settingsUser.notifications` (pipeline + eventos por usuário) |

Eventos de pipeline são podados por `prunePipelineEvents(now,
INGESTION_PIPELINE_EVENT_RETENTION_MS)` (default 7 dias).
