# Persistência — Requisitos

## Estratégia

Persistência local, sem dependência de backend remoto.

| Plataforma | Engine | Motivo |
|---|---|---|
| Web / PWA / TWA | IndexedDB | API nativa do browser, suporta dados estruturados e índices |
| Tauri (Windows/Linux) | SQLite | Acesso via plugin Tauri, melhor performance para volumes maiores |

## Stores

### ProfileStore
- CRUD completo de profiles.
- Implementa `ProfileRepository` (contrato do domínio).

### FontStore
- CRUD de fonts com índice por `profileId`.
- Implementa `FontRepository` (contrato do domínio).

### PostStore
- Armazenamento e consulta de posts canônicos.
- Índices: `fontId`, `publishedAt`.
- Operações: salvar batch, listar paginado, marcar como lido, deletar por `fontId`.

## Esquema IndexedDB

- Database name: `notfeed`
- Version: `1`
- Object stores:
  - `profiles` (keyPath: `id`)
  - `fonts` (keyPath: `id`, index: `profileId`)
  - `posts` (keyPath: `id`, indexes: `fontId`, `publishedAt`)

## Regras

- A camada de persistência é acessada apenas via stores; nunca diretamente pela UI.
- Migrações de schema são versionadas (IndexedDB `onupgradeneeded`).
- O módulo `db.ts` abstrai a escolha entre IndexedDB e SQLite via detecção de plataforma.

## Funcionalidades (MVP)

- [ ] Inicialização do banco IndexedDB com schema versionado
- [ ] ProfileStore: getAll, getById, create, update, delete
- [ ] FontStore: getAll, getByProfileId, getById, create, update, delete
- [ ] PostStore: savePosts, getPosts (paginado), markAsRead, deleteByFontId
- [ ] Stub para SQLite (Tauri) — implementação futura
