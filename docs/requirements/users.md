# Users — Requisitos

## Definição

User é a raiz de identidade do sistema. Existe em dois papéis mutuamente exclusivos: consumer e creator. Ambos podem coexistir no mesmo dispositivo. Gerenciados via `activeUser.svelte.ts`.

## UserBase (compartilhado)

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `id` | string (UUID) | Sim (auto) | Identificador único |
| `role` | `UserRole` | Sim (fixo) | `'consumer'` ou `'creator'` |
| `displayName` | string [1..100] | Sim | Nome de exibição |
| `profileImage` | ImageAsset \| null | Não | Avatar WEBP (≤512×512) |
| `profileEmoji` | string \| null | Não | Emoji alternativo ao avatar |
| `removedAt` | Date \| null | Não | Timestamp de soft-delete |
| `language` | string | Sim | Idioma preferido (ex: `'en-US'`, `'pt-BR'`) |
| `createdAt` | Date | Sim (auto) | Data de criação |
| `updatedAt` | Date | Sim (auto) | Última atualização |

## UserConsumer

Conta local de consumo. Nunca publica conteúdo.

### Propriedades adicionais

| Campo | Tipo | Descrição |
|---|---|---|
| `activateTrees` | `TreeActivation[]` | Inscrições em árvores inteiras (`{ treeId, activatedAt }`) |
| `activateNodes` | `NodeActivation[]` | Estado local por nó (priority, favorite, enabled, favoriteTabIds) |
| `favoriteTabs` | `FavoriteTab[]` | Tabs de favoritos (sistema ⭐ + custom) |
| `feedMacros` | `FeedMacro[]` | Presets salvos de filtros do feed |

### NodeActivation (por nó)

| Campo | Tipo | Descrição |
|---|---|---|
| `nodeId` | string | ID composto (`treeId:localUuid`) |
| `priority` | `PriorityLevel \| null` | 1=alta, 2=média, 3=baixa, null=herdar |
| `favorite` | boolean | Se é favorito |
| `enabled` | boolean | Se está ativo (inscrição/follow) |
| `favoriteTabIds` | `string[]` | IDs de tabs às quais pertence (many-to-many) |

### TreeActivation

| Campo | Tipo | Descrição |
|---|---|---|
| `treeId` | string | ID da ContentTree inscrita |
| `activatedAt` | Date | Quando foi inscrito |

### FavoriteTab

| Campo | Tipo | Descrição |
|---|---|---|
| `id` | string | UUID (sistema: `SYSTEM_FAVORITES_TAB_ID`) |
| `title` | string | Nome da tab |
| `emoji` | string | Emoji visual |
| `position` | number | Ordem de exibição |
| `isSystem` | boolean | Se é tab de sistema (não deletável) |
| `createdAt` | Date | Data de criação |

### Capacidades do Consumer

- Inscrever-se em ContentTrees inteiras (via TreeActivation)
- Ativar/desativar nós individuais (via NodeActivation.enabled)
- Definir prioridade por nó com herança (font → profile → root → 3)
- Favoritar nós e organizar em FavoriteTabs (many-to-many)
- Criar e aplicar FeedMacros (presets de filtro)
- Importar ContentTrees (.notfeed.json) e URLs simples
- Definir idioma preferido (i18n)
- Definir avatar (ImageAsset) ou emoji de perfil

## UserCreator

Conta de criação. Gerencia ContentTrees e ContentMedias.

### Propriedades adicionais

| Campo | Tipo | Descrição |
|---|---|---|
| `ownedTreeIds` | `string[]` | IDs das ContentTrees possuídas |
| `ownedMediaIds` | `string[]` | IDs dos ContentMedias possuídos |

### Capacidades do Creator

- Criar e gerenciar ContentTrees (com nós embarcados)
- Criar e gerenciar TreeNodes por role (profile, font, creator, collection, tree-link)
- Publicar ContentTrees como snapshot versionado (TreePublication)
- Exportar ContentTrees como `.notfeed.json`
- Gerenciar ContentMedias (imagens, mídias associadas)
- Definir idioma preferido (i18n)
- Definir avatar (ImageAsset) ou emoji de perfil

## Active User Store

`activeUser.svelte.ts` gerencia a identidade ativa:

| Método | Descrição |
|---|---|
| `init()` | Carrega usuários do IndexedDB, restaura último ativo |
| `switchTo(userId)` | Troca identidade ativa, recarrega stores |
| `createConsumer(name)` | Cria novo consumer com tab sistema ⭐ |
| `createCreator(name)` | Cria novo creator |
| `softDelete(userId)` | Marca `removedAt` (mantém no banco) |
| `restore(userId)` | Remove `removedAt` |
| `setActive(user)` | Define identidade ativa |

### Navegação por papel

| Papel | Nav Items | Ícones |
|---|---|---|
| Consumer | Feed, Browse, Favorites, User | Newspaper, Search, Star, CircleUser |
| Creator | Pages, Preview, User | FileStack, Eye, CircleUser |

## Regras de negócio

- Papéis consumer e creator são mutuamente exclusivos por conta.
- Um dispositivo pode ter múltiplas contas de ambos os tipos.
- Soft-delete via `removedAt` (mantido no banco, filtrado na UI, restaurável).
- Última identidade ativa é persistida em localStorage para restauração no boot.
- Trocar de usuário recarrega todos os stores dependentes.
- FavoriteTab ⭐ "Todos" (`SYSTEM_FAVORITES_TAB_ID`) é criada automaticamente e não pode ser deletada/renomeada.
- `PriorityLevel = 1 | 2 | 3`. `DEFAULT_PRIORITY = 3`.

## Funcionalidades

- [x] Criar conta consumer (com tab sistema ⭐)
- [x] Criar conta creator
- [x] Editar displayName, avatar (ImageAsset), emoji
- [x] Soft-delete com restore
- [x] Trocar entre contas ativas
- [x] Persistência de último ativo em localStorage
- [x] Idioma preferido (i18n)
- [x] CRUD de FavoriteTabs (many-to-many)
- [x] CRUD de FeedMacros
- [x] NodeActivation: priority, favorite, enabled, favoriteTabIds
- [x] TreeActivation: inscrição em árvores inteiras
