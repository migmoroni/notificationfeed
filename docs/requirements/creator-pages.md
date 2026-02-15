# CreatorPages — Requisitos

## Definição

CreatorPage é um artefato publicável que descreve uma coleção editorial de Profiles e Fonts. Não é a identidade — é um documento versionável vinculado a um UserCreator. Suas categories são derivadas (união) das categories dos seus Profiles atuais.

## Propriedades

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `id` | string (UUID) | Sim (auto) | Identificador único |
| `ownerId` | string (UUID) | Sim | Referência ao UserCreator proprietário |
| `title` | string [1..100] | Sim | Nome da page |
| `bio` | string [0..500] | Não | Descrição pública |
| `tags` | string[] | Não | Tags descritivas |
| `avatar` | ImageAsset (WEBP, ≤512×512) | Não | Imagem de avatar |
| `banner` | ImageAsset (WEBP, ≤1600×600) | Não | Fundo temático |
| `nostrPublicKey` | string | Não | Chave pública quando sincronizada |
| `blossomRef` | string | Não | Referência Blossom quando sincronizada |
| `syncStatus` | `'local' \| 'synced' \| 'exported' \| 'imported'` | Sim | Estado de sincronização/distribuição |
| `exportId` | string (UUID) | Não | ID estável para exports (gerado uma vez) |
| `createdAt` | Date | Sim (auto) | Data de criação |
| `updatedAt` | Date | Sim (auto) | Última atualização |

**Propriedade derivada:** `categories` → união das categories de todos os seus Profiles atuais (não armazenada).

## Regras de negócio

- Pertence a exatamente um UserCreator. Não pode existir órfã.
- Somente o UserCreator proprietário pode editar.
- Pode definir `defaultEnabled` por Profile e Font (estado inicial para novos consumers).
- Pode ser seguida por UserConsumers (fluxo unidirecional: Page → Consumer, sem notificação reversa).
- Deletar uma CreatorPage **desvincula** seus Profiles (tornam-se standalone), não os deleta.
- CreatorPages importadas (`syncStatus = 'imported'`) são read-only para o consumer.

## Export/Import offline

- Qualquer UserCreator pode exportar uma CreatorPage como `.notfeed.json`.
- O arquivo é autocontido: Page + Profiles + Fonts + imagens WEBP base64.
- IDs são regenerados no import para evitar colisão.
- Um `exportId` estável permite detectar reimportações/atualizações.
- Reimportar o mesmo `exportId` oferece ao consumer: atualizar existente ou criar cópia.

## Política de imagens

- Formato oficial: WEBP. Todo upload (SVG, PNG, JPEG, GIF) é auto-convertido.
- Avatar: máximo 512×512 px.
- Banner: máximo 1600×600 px.

## Funcionalidades (MVP)

- [ ] Listar CreatorPages do creator
- [ ] Criar CreatorPage
- [ ] Editar CreatorPage (title, bio, tags, avatar, banner)
- [ ] Deletar CreatorPage (com confirmação, desvincula Profiles)
- [ ] Exportar CreatorPage como `.notfeed.json`
- [ ] Importar CreatorPage de `.notfeed.json` (consumer)
- [ ] Ativar/desativar CreatorPage (consumer)
