# Profiles — Requisitos

## Definição

Profile é uma identidade temática ou editorial que agrupa Fonts. Pode ser criado por UserConsumer (standalone, para feeds manuais de terceiros) ou por UserCreator (standalone ou vinculado a uma CreatorPage).

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
| `categoryId` | string | Sim | Referência a Category sublevel (depth ≥ 1) |
| `defaultEnabled` | boolean | Sim | Estado padrão para novos consumers |
| `createdAt` | Date | Sim (auto) | Data de criação |
| `updatedAt` | Date | Sim (auto) | Última atualização |

## Regras de negócio

- Profile sempre tem um owner (`ownerId` + `ownerType`).
- Se `ownerType = 'consumer'`, `creatorPageId` é obrigatoriamente null.
- Se `ownerType = 'creator'`, `creatorPageId` pode apontar para uma CreatorPage do mesmo creator.
- Somente o owner pode editar/deletar o Profile e gerenciar suas Fonts.
- Pertence a exatamente uma Category sublevel.
- Deletar um Profile deleta em cascata todas as suas Fonts e posts associados.
- Title deve ter entre 1 e 100 caracteres.
- Pode ser ativado/desativado pelo UserConsumer (via ConsumerState, sem excluir).

## Funcionalidades (MVP)

- [ ] Listar profiles (do consumer e de CreatorPages seguidas)
- [ ] Criar profile (consumer: standalone; creator: standalone ou em Page)
- [ ] Editar profile (title, avatar, tags, category)
- [ ] Deletar profile (com confirmação e cascade)
- [ ] Ativar/desativar profile (consumer)
