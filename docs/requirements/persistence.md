# Persistência — Requisitos

## Estratégia

Persistência local, sem dependência de backend remoto.

| Plataforma | Engine | Motivo |
|---|---|---|
| Web / PWA / TWA | IndexedDB | API nativa do browser, suporta dados estruturados e índices |
| Tauri (Windows/Linux) | SQLite | Acesso via plugin Tauri, melhor performance para volumes maiores |

## Stores

### UserStore
- CRUD de users.
- Index: `role`.

### CreatorPageStore
- CRUD de creator pages.
- Index: `ownerId`.

### ProfileStore
- CRUD completo de profiles.
- Implementa `ProfileRepository` (contrato do domínio).
- Indexes: `ownerId`, `creatorPageId`.

### FontStore
- CRUD de fonts com índice por `profileId`.
- Implementa `FontRepository` (contrato do domínio).

### CategoryStore
- CRUD de categorias com árvore hierárquica.
- Indexes: `parentId`, `treeId`.

### ConsumerStateStore
- Estado local do consumer por entidade (priority, favorite, favoriteTabIds).
- keyPath: `entityId`.
- Index: `entityType`.

### PostStore
- Armazenamento e consulta de posts canônicos.
- Índices: `fontId`, `publishedAt`.
- Operações: salvar batch, listar paginado, marcar como lido, deletar por `fontId`.

### FavoriteTabStore
- CRUD de tabs de favoritos.
- Tab de sistema ⭐ "Todos" (não deletável).

## Esquema IndexedDB

- Database name: `notfeed`
- Version: `4`
- Object stores:
  - `users` (keyPath: `id`, index: `role`)
  - `creatorPages` (keyPath: `id`, index: `ownerId`)
  - `profiles` (keyPath: `id`, indexes: `ownerId`, `creatorPageId`)
  - `fonts` (keyPath: `id`, index: `profileId`)
  - `categories` (keyPath: `id`, indexes: `parentId`, `treeId`)
  - `consumerStates` (keyPath: `entityId`, index: `entityType`)
  - `posts` (keyPath: `id`, indexes: `fontId`, `publishedAt`)
  - `favoriteTabs` (keyPath: `id`)

### Histórico de migrações

| Versão | Mudanças |
|--------|----------|
| v1 | Stores iniciais: users, creatorPages, profiles, fonts, categories, consumerStates, posts |
| v3 | Adição de favoriteFolders; limpeza de indexes stale (origin, ownerId em categories; categoryId em profiles); adição de treeId em categories |
| v4 | Rename favoriteFolders → favoriteTabs; migração consumerStates `favoriteFolderId` → `favoriteTabIds[]` |

## Regras

- A camada de persistência é acessada apenas via stores; nunca diretamente pela UI.
- Migrações de schema são versionadas (IndexedDB `onupgradeneeded`).
- O módulo `db.ts` abstrai a escolha entre IndexedDB e SQLite via detecção de plataforma.
- Writes para IndexedDB devem usar `$state.snapshot()` para evitar "Proxy object could not be cloned" (ADR-019).

## Funcionalidades (MVP)

- [x] Inicialização do banco IndexedDB com schema versionado
- [x] ProfileStore: getAll, getById, create, update, delete
- [x] FontStore: getAll, getByProfileId, getById, create, update, delete
- [x] PostStore: savePosts, getPosts (paginado), markAsRead, deleteByFontId
- [x] UserStore, CreatorPageStore, CategoryStore, ConsumerStateStore, FavoriteTabStore
- [x] Migrações v1→v3→v4 (favoriteFolders→favoriteTabs, indexes stale)
- [ ] Stub para SQLite (Tauri) — implementação futura
