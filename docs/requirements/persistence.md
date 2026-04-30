# Persistência — Requisitos

## Estratégia

Persistência local, sem dependência de backend remoto. A camada é abstraída pela interface
`StorageBackend` em `$lib/persistence/backends/storage-backend.ts`, com duas implementações:

| Plataforma | Backend ativo | Motivo |
|---|---|---|
| Web / PWA / Android TWA | `IndexedDBBackend` | API nativa do browser, suporta dados estruturados e índices |
| Tauri AppImage (Linux) | `IndexedDBBackend` | WebView embarca o mesmo sandbox do browser |
| Tauri deb/rpm/msi/dmg/android | `SqliteBackend` (stub, Plano C) | Acesso via `tauri-plugin-sql`, integração FS do SO |

Seleção em runtime via `capabilities.storageBackend` (`'indexeddb' | 'sqlite'`), lido de
`import.meta.env.VITE_STORAGE_BACKEND` (default `'indexeddb'`).

## Database (IndexedDB)

- **Nome**: `notfeed-v2`
- **Versão atual**: `12` (Plano B — per-user post boxes)
- **Migração**: Destrutiva. Ao incrementar a versão, todos os stores são deletados e recriados a partir de `STORE_SPECS`. Aceitável em pré-lançamento.

## Stores (10 totais)

### contentTrees
Árvores publicadas/importadas com nós embarcados.
- keyPath: `metadata.id`
- Index: `author` (campo `metadata.author`)

### contentMedias
Objetos de mídia externa associados a árvores publicadas.
- keyPath: `metadata.id`
- Index: `author`

### editorTrees
Rascunhos do creator (árvores em edição).
- keyPath: `metadata.id`
- Index: `author`

### editorMedias
Cópias de mídias do creator (rascunho).
- keyPath: `metadata.id`
- Index: `author`

### treePublications
Metadados de publicação (snapshot `TreeExport` por árvore).
- keyPath: `treeId`

### users
Todos os usuários (consumer e creator).
- keyPath: `id`
- Index: `role`

### posts (Plano B v12)
**Per-user post boxes**. Um registro por usuário × fonte × post id.
- keyPath: `_pk` — chave sintética `${userId}|${nodeId}|${id}`
- Index `byUser`: `userId` — listar todos os posts de um usuário
- Index `byUserNode`: `_userNode` — chave sintética `${userId}|${nodeId}`, para listar uma fonte de um usuário

Cada registro carrega `read`, `savedAt`, `trashedAt`, `ingestedAt` per-usuário. Posts da mesma fonte ativados por N usuários ocupam N registros independentes.

### fetcherStates (Plano B v12)
**Per-source ingestion metadata**. Um registro por `nodeId`, compartilhado entre todos os usuários que ativaram a fonte.
- keyPath: `nodeId`
- Campos: `etag?`, `lastModified?`, `lastSuccessAt`, `lastFailureAt`, `consecutiveFailures`, `nextScheduledAt`

### categories
Taxonomia oficial (seed).
- keyPath: `id`
- Indexes: `parentId`, `treeId`

### activityData
Agregados de atividade / histórico de leitura usados pelo dashboard.
- keyPath: `id`

## Abstração

`StorageBackend` expõe uma `StoreOps` por field:

```typescript
interface StoreOps {
  getAll<T>(): Promise<T[]>;
  getById<T>(id: string): Promise<T | null>;
  query<T>(index: string, value: unknown): Promise<T[]>;
  put<T>(item: T): Promise<void>;
  delete(id: string): Promise<void>;
}
```

Stores de domínio em `$lib/persistence/*.store.ts` consomem a interface via `getStorageBackend()` (memoizado). Alias `getDatabase()` mantido para back-compat.

## Stores de domínio (per-user)

Toda API de leitura/escrita de posts é per-usuário:

```typescript
savePostsForUser(userId, posts) // upsert preservando read/saved/trashed existentes
getPostsForUser(userId, query)  // filtros: nodeIds, includeTrashed, savedOnly, ...
markRead(userId, nodeId, postId, value)
setSaved(userId, nodeId, postId, value)        // saved limpa trashedAt
setTrashed(userId, nodeId, postId, value)      // saved overrides trash (no-op)
trashOldPostsForUser(userId, nodeIds, cutoff)  // retenção
purgeTrashedBefore(userId, cutoff)             // hard delete
deletePostsForUserNode(userId, nodeId)         // ao desativar uma font
backfillPostsForUserNode(userId, nodeId)       // ao ativar nova font
```

`fetcher-state.store.ts` expõe a API per-source:

```typescript
getFetcherState(nodeId)          // retorna estado vazio se não existir
putFetcherState(state)
deleteFetcherState(nodeId)       // só quando *nenhum* usuário tem a fonte
getDueFetcherStates(nodeIds, now)
```

## Separação Creator / Consumer

| Escopo | Store Trees | Store Medias | Descrição |
|---|---|---|---|
| Creator (rascunho) | `editorTrees` | `editorMedias` | Árvores em edição |
| Publicado/Importado | `contentTrees` | `contentMedias` | Árvores publicadas pelo creator ou importadas pelo consumer |

Publicar copia o `TreeExport` snapshot de `editorTrees` para `contentTrees`. `metadata.author` identifica o dono.

## Regras

- A camada de persistência é acessada apenas via stores reativos / módulos `*.store.ts`; nunca diretamente pela UI.
- Writes em IndexedDB devem usar `$state.snapshot()` para evitar "Proxy object could not be cloned" (ADR-019).
- Soft-delete: usuários e árvores usam campo `removedAt` (mantidos no banco, filtrados na UI).
- Posts isolam estado per-usuário (read/saved/trashed); apenas o conteúdo é compartilhado via backfill.
- FetcherState é compartilhado por todos os usuários — o PostManager faz a coalescência no nível de rede.
- Migração destrutiva: incrementar versão = perda total de dados locais. Aceitável em pré-lançamento.

## Funcionalidades

- [x] StorageBackend abstrato (IndexedDB + stub SQLite)
- [x] Inicialização do banco com schema versionado (v12)
- [x] Migração destrutiva (delete + recreate stores)
- [x] contentTrees / contentMedias / editorTrees / editorMedias: CRUD com index por author
- [x] treePublications: save/get/delete por treeId
- [x] users: CRUD com index por role
- [x] posts (Plano B): per-user boxes com `byUser` / `byUserNode`
- [x] fetcherStates: per-source state
- [x] categories: CRUD com indexes parentId e treeId; seed automático
- [x] activityData: agregados de atividade
- [ ] SqliteBackend completo (Plano C — Tauri bundles nativos)
