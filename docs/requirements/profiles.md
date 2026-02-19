# Profiles — Requisitos

## Definição

Profile é uma identidade temática ou editorial que agrupa Fonts. Pode ser criado por UserConsumer (standalone, para feeds manuais de terceiros) ou por UserCreator (standalone ou vinculado a uma CreatorPage).

## Modos de ciclo de vida (DDD)

Profile tem dois modos determinados pelo campo `creatorPageId`:

### 1. Standalone (`creatorPageId = null`)

- **Aggregate root independente** — existe por conta própria.
- Criado por UserConsumer para feeds de terceiros.
- Navegado diretamente: `/browse/profile/{id}`.
- Deletar um Profile standalone é cascata: apaga Fonts e posts associados.
- Cadeia de prioridade: Font → Profile → default(3). Sem nível CreatorPage.

### 2. Dependente (`creatorPageId = string`)

- **Entidade filha** dentro do agregado CreatorPage.
- Identidade e navegação são escopadas sob a page pai: `/browse/creator/{pageId}/profile/{id}`.
- Fonts do profile também são escopadas: `/browse/creator/{pageId}/profile/{id}/font/{fontId}`.
- Cadeia de prioridade completa: Font → Profile → CreatorPage → default(3).
- Deletar a CreatorPage **desvincula** o profile (torna standalone), não o deleta.
- Profile importado via `.notfeed.json` herda `creatorPageId` do export.

> **Transição:** Um profile dependente pode se tornar standalone se a CreatorPage for deletada. A URL muda automaticamente.

## Propriedades

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `id` | string (UUID) | Sim (auto) | Identificador único |
| `ownerType` | `'consumer' \| 'creator'` | Sim | Quem criou o profile |
| `ownerId` | string (UUID) | Sim | Referência ao UserConsumer ou UserCreator |
| `creatorPageId` | string (UUID) | Não | CreatorPage à qual pertence (null = standalone) |
| `title` | string [1..100] | Sim | Nome do profile |
| `tags` | string[] | Não | Tags descritivas |
| `avatar` | ImageAsset (WEBP, ≤512×512) | Não | Imagem de avatar |
| `categoryAssignments` | CategoryAssignment[] | Sim | Até 3 sublevels por tree (subject + content_type) |
| `defaultEnabled` | boolean | Sim | Estado padrão para novos consumers |
| `createdAt` | Date | Sim (auto) | Data de criação |
| `updatedAt` | Date | Sim (auto) | Última atualização |

## Regras de negócio

- Profile sempre tem um owner (`ownerId` + `ownerType`).
- Se `ownerType = 'consumer'`, `creatorPageId` é obrigatoriamente null (sempre standalone).
- Se `ownerType = 'creator'`, `creatorPageId` pode apontar para uma CreatorPage do mesmo creator.
- **Quando `creatorPageId` está definido, o Profile é dependente:** sua URL, navegação e herança de prioridade são escopadas sob a CreatorPage.
- Somente o owner pode editar/deletar o Profile e gerenciar suas Fonts.
- Pertence a até 3 sublevels por tree (via `CategoryAssignment`).
- `CategoryAssignment` = `{ treeId, categoryIds[] }`. Máximo de 3 IDs por tree; apenas sublevels (depth ≥ 1).
- Deletar um Profile deleta em cascata todas as suas Fonts e posts associados.
- Title deve ter entre 1 e 100 caracteres.
- Pode ser ativado/desativado pelo UserConsumer (via ConsumerState, sem excluir).

## Funcionalidades (MVP)

- [ ] Listar profiles (do consumer e de CreatorPages seguidas)
- [ ] Criar profile (consumer: standalone; creator: standalone ou em Page)
- [ ] Editar profile (title, avatar, tags, category)
- [ ] Deletar profile (com confirmação e cascade)
- [ ] Ativar/desativar profile (consumer)
