# Persistência — Requisitos

## Estratégia

Persistência local, sem dependência de backend remoto.

| Plataforma | Engine | Motivo |
|---|---|---|
| Web / PWA / TWA | IndexedDB | API nativa do browser, suporta dados estruturados e índices |
| Tauri (Windows/Linux) | SQLite (futuro) | Acesso via plugin Tauri; throw em runtime se detectar `'desktop'` (não implementado) |

## Database

- **Nome**: `notfeed-v2`
- **Versão**: `5`
- **Migração**: Destrutiva — ao incrementar a versão, todos os stores são deletados e recriados com o schema atual. Sem lógica de migrations incrementais durante pré-lançamento.

## Stores (8 totais)

### contentTrees
- Árvores publicadas/importadas com nós embarcados.
- keyPath: `metadata.id`
- Index: `author` (campo `metadata.author`)

### contentMedias
- Objetos de mídia externa associados a árvores publicadas.
- keyPath: `metadata.id`
- Index: `author`

### editorTrees
- Rascunhos do creator (árvores em edição).
- keyPath: `metadata.id`
- Index: `author`

### editorMedias
- Cópias de mídias do creator (rascunho).
- keyPath: `metadata.id`
- Index: `author`

### treePublications
- Metadados de publicação (snapshot `TreeExport` por árvore).
- keyPath: `treeId`

### users
- Todos os usuários (consumer e creator).
- keyPath: `id`
- Index: `role`

### posts
- Posts agrupados por node ID composto.
- keyPath: `nodeId`

### categories
- Taxonomia oficial (seed).
- keyPath: `id`
- Indexes: `parentId`, `treeId`

## Abstração

O módulo `db.ts` expõe uma interface `Database` com `TableOps` genérico por store:

```typescript
interface TableOps {
  getAll<T>(): Promise<T[]>;
  getById<T>(id: string): Promise<T | null>;
  query<T>(index: string, value: unknown): Promise<T[]>;
  put<T>(item: T): Promise<void>;
  delete(id: string): Promise<void>;
}
```

Detecção de plataforma: se `'desktop'`, lança erro (SQLite não implementado). Web usa IndexedDB.

## Separação Creator / Consumer

| Escopo | Store Trees | Store Medias | Descrição |
|---|---|---|---|
| Creator (rascunho) | `editorTrees` | `editorMedias` | Árvores em edição, não visíveis para consumers |
| Publicado/Importado | `contentTrees` | `contentMedias` | Árvores publicadas pelo creator ou importadas pelo consumer |

Publicar copia o `TreeExport` snapshot de `editorTrees` para `contentTrees`. `metadata.author` identifica o dono.

## Regras

- A camada de persistência é acessada apenas via stores reativos; nunca diretamente pela UI.
- Writes para IndexedDB devem usar `$state.snapshot()` para evitar "Proxy object could not be cloned" (ADR-019).
- Soft-delete: usuários e árvores usam campo `removedAt` (mantidos no banco, filtrados na UI).
- Migração destrutiva: incrementar versão do banco = perda de todos os dados locais. Aceitável em pré-lançamento.

## Funcionalidades

- [x] Inicialização do banco IndexedDB com schema versionado (v5)
- [x] Migração destrutiva (delete + recreate stores)
- [x] contentTrees / contentMedias: CRUD completo com index por author
- [x] editorTrees / editorMedias: CRUD completo com index por author
- [x] treePublications: save/get/delete por treeId
- [x] users: CRUD com index por role
- [x] posts: CRUD por nodeId
- [x] categories: CRUD com indexes parentId e treeId
- [x] Seed automático de categories (empty-check)
- [ ] Stub para SQLite (Tauri) — implementação futura
