# ContentTrees — Requisitos

## Definição

ContentTree é o aggregate root central do domínio Notfeed. Representa uma árvore de conteúdo editorial com nós embarcados (TreeNode) de múltiplos papéis. Substitui o antigo conceito de "CreatorPage" — agora Profiles, Fonts e outros elementos são nós dentro da árvore, não entidades separadas.

## Estrutura

```typescript
ContentTree {
  nodes: Record<string, TreeNode>    // Nós embarcados (key = localUuid)
  paths: TreePaths                   // Mapeamento de posição
  sections: TreeSection[]            // Divisões visuais
  metadata: ContentTreeMetadata      // Metadados da árvore
}
```

### TreeNode

Cada nó possui role, header, body e metadata:

```typescript
TreeNode {
  role: NodeRole                     // 'profile' | 'font' | 'creator' | 'collection' | 'tree'
  data: {
    header: NodeHeader               // Campos comuns (title, subtitle, summary, etc.)
    body: NodeBody                   // Discriminado por role
  }
  metadata: TreeNodeMetadata         // id, versionSchema, createdAt, updatedAt
}
```

### NodeHeader (compartilhado)

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `title` | string | Sim | Nome de exibição |
| `subtitle` | string | Não | Subtítulo |
| `summary` | string | Não | Descrição breve |
| `coverMediaId` | string | Não | ID do media de capa |
| `coverEmoji` | string | Não | Emoji de capa (alternativa a media) |
| `bannerMediaId` | string | Não | ID do media de banner |
| `categoryAssignments` | CategoryAssignment[] | Sim | Até 3 categories por tree (5 trees) |

### NodeBody (por role)

| Role | Body | Campos |
|---|---|---|
| `profile` | `ProfileBody` | `links: ExternalLink[]` |
| `font` | `FontBody` | `protocol: FontProtocol`, `config: FontConfig`, `defaultEnabled: boolean` |
| `creator` | `CreatorBody` | `links: ExternalLink[]` |
| `collection` | `CollectionBody` | _(vazio)_ |
| `tree` | `TreeLinkBody` | `instanceTreeId: string` (referência a outra árvore) |

### TreePaths

Mapeamento de posição dos nós na árvore:

| Chave | Tipo | Descrição |
|---|---|---|
| `'/'` | `string` | ID do nó raiz |
| `'*'` | `string[]` | Nós sem seção (unsectioned) |
| `[sectionId]` | `string[]` | Nós na seção identificada |

### TreeSection

| Campo | Tipo | Descrição |
|---|---|---|
| `id` | string | Identificador único da seção |
| `order` | number | Ordem de exibição |
| `symbol` | string? | Emoji/símbolo visual |
| `title` | string | Título da seção |
| `hideTitle` | boolean | Se o título é oculto na UI |
| `color` | string | Cor da seção |

### ContentTreeMetadata

| Campo | Tipo | Descrição |
|---|---|---|
| `id` | string (UUID) | Identificador da árvore |
| `versionSchema` | number | Versão do schema |
| `createdAt` | Date | Data de criação |
| `updatedAt` | Date | Última atualização |
| `author` | string? | ID do UserCreator dono |
| `authorTreeId` | string? | Referência à árvore-fonte (para imports) |
| `removedAt` | string? | Soft-delete timestamp |

## IDs compostos

Nós usam IDs compostos `treeId:localUuid` para unicidade global:
- `treeId` = `ContentTreeMetadata.id`
- `localUuid` = UUID local do nó (key em `nodes`)
- Parseado via `parseTreeId(compositeId)` → `{ treeId, localId }`
- Gerado via `generateNodeId(treeId)` → composite string

## Stores e separação Creator / Consumer

| Ação | Store Trees | Store Medias |
|---|---|---|
| Creator edita | `editorTrees` | `editorMedias` |
| Creator publica | Copia para `contentTrees` | Copia para `contentMedias` |
| Consumer importa | `contentTrees` | `contentMedias` |

## Publicação

1. Creator edita árvore em `editorTrees`
2. `publishTree()` constrói `TreeExport` snapshot (tree + medias)
3. Persiste como `TreePublication { treeId, version, snapshot, publishedAt }` em `treePublications`
4. Copia snapshot para `contentTrees` / `contentMedias`
5. `exportId` gerado na primeira publicação via `crypto.randomUUID()`
6. Edições após publicar não afetam preview/export até nova publicação

### TreeExport (formato .notfeed.json)

```typescript
TreeExport {
  exportId: string         // ID estável para detectar reimportações
  version: number          // Versão da publicação
  exportedAt: Date
  creatorDisplayName: string
  tree: ContentTree
  medias: ContentMedia[]
}
```

## Import

Dois modos:
1. **TreeExport** (.notfeed.json) — `importTreeExport()`: valida JSON, checa duplicatas por `exportId`, persiste tree + medias em `contentTrees`/`contentMedias`
2. **URLs simples** — `importSimpleUrls()`: auto-detecta RSS/Atom, cria ContentTree com profile node + font nodes (uma font por URL)

## Regras de negócio

- ContentTree pertence a exatamente um UserCreator via `metadata.author`.
- Somente o creator dono pode editar (via `editorTrees`).
- Nós embarcados são criados/editados/deletados via `creator.svelte.ts` (`createNode()`, `updateNode()`, `deleteNode()`).
- TreeNodes font herdam categories do tree via `getEffectiveNodeCategories()` (propagação ascendente).
- ContentTrees importadas são read-only para o consumer.
- Soft-delete via `metadata.removedAt` (mantida no banco, filtrada na UI).
- Nó raiz (`paths['/']`) é obrigatório e geralmente é um nó creator ou profile.

## Utilitários

| Função | Descrição |
|---|---|
| `parseTreeId(compositeId)` | Extrai `{ treeId, localId }` |
| `getNode(tree, localId)` | Busca nó por localId |
| `getRootNode(tree)` | Retorna nó raiz |
| `getRootNodeId(tree)` | Retorna ID do nó raiz |
| `getNodesInPath(tree, path)` | Lista nós em um path (seção ou `*`) |
| `getAllNodeIds(tree)` | Lista todos os IDs de nós |
| `getNodesByRole(tree, role)` | Filtra nós por role |
| `getFontNodes(tree)` | Retorna todos os nós font |
| `getNodeSection(tree, nodeId)` | Retorna a seção de um nó |
| `generateNodeId(treeId)` | Gera novo ID composto |

## Type Guards

| Função | Role verificado |
|---|---|
| `isCreatorNode(node)` | `'creator'` |
| `isProfileNode(node)` | `'profile'` |
| `isFontNode(node)` | `'font'` |
| `isTreeLinkNode(node)` | `'tree'` |
| `isCollectionNode(node)` | `'collection'` |

## Funcionalidades

- [x] CRUD de ContentTree (criar, editar metadata, deletar com soft-delete)
- [x] CRUD de TreeNodes dentro de árvore (criar por role, editar header/body, deletar)
- [x] Gerenciamento de seções (criar, reordenar, deletar)
- [x] Publicação como snapshot versionado (TreePublication)
- [x] Export como .notfeed.json (TreeExport)
- [x] Import de .notfeed.json e URLs simples
- [x] Separação editorTrees / contentTrees
- [x] IDs compostos com unicidade global
- [x] Propagação de categories por árvore
