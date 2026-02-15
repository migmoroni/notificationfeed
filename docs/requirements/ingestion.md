# Ingestão e Normalização — Requisitos

## Fluxo de dados

```
Font (config) → Ingestion Client → Raw Data → Normalizer → Canonical Post → Persistence
```

## Ingestão

Cada protocolo tem seu próprio client de ingestão:

### Nostr
- Conexão via WebSocket aos relays configurados na Font.
- Subscription com filtros (`authors`, `kinds`).
- Eventos recebidos em tempo real (streaming).
- Reconexão automática em caso de desconexão.

### RSS
- Fetch HTTP periódico (polling).
- Parse de XML RSS 2.0.
- Intervalo padrão: 5 minutos (configurável no futuro).

### Atom
- Fetch HTTP periódico (polling).
- Parse de XML Atom 1.0.
- Intervalo padrão: 5 minutos (configurável no futuro).

## Normalização

Todos os dados ingeridos são transformados em **Post Canônico** antes da persistência.

### Post Canônico — Schema

| Campo | Tipo | Descrição |
|---|---|---|
| `id` | string | ID determinístico derivado da fonte (event id, guid, entry id) |
| `fontId` | string | Referência à Font que produziu este post |
| `protocol` | `'nostr' \| 'rss' \| 'atom'` | Protocolo de origem |
| `title` | string | Título (pode ser vazio para Nostr) |
| `content` | string | Conteúdo textual (plain text ou HTML sanitizado) |
| `url` | string | Link para a fonte original |
| `author` | string | Nome ou pubkey do autor |
| `publishedAt` | Date | Data de publicação |
| `ingestedAt` | Date | Quando foi ingerido localmente |
| `read` | boolean | Se o usuário já leu |

## Regras

- Posts duplicados (mesmo `id`) são ignorados (upsert).
- O scheduler gerencia polling e subscriptions ativos.
- Ao desabilitar uma Font, a ingestão é interrompida.
- Ao deletar uma Font, os posts associados são removidos.

## Funcionalidades (MVP)

- [ ] Ingestão Nostr via WebSocket
- [ ] Ingestão RSS via fetch + DOMParser
- [ ] Ingestão Atom via fetch + DOMParser
- [ ] Normalização para Post Canônico
- [ ] Scheduler de polling/subscription por Font
- [ ] Deduplicação de posts
