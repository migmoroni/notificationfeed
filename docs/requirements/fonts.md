# Fonts — Requisitos

## Definição

Font (fonte de dados) é um canal técnico de distribuição vinculado a um Profile. Encapsula a configuração específica de um protocolo (Nostr, RSS ou Atom). Herda a Category do Profile pai.

## Propriedades

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `id` | string (UUID) | Sim (auto) | Identificador único |
| `profileId` | string | Sim | Profile ao qual pertence |
| `title` | string [1..100] | Sim | Nome de exibição da fonte |
| `tags` | string[] | Não | Tags descritivas |
| `avatar` | ImageAsset (WEBP, ≤512×512) | Não | Imagem de avatar |
| `protocol` | `'nostr' \| 'rss' \| 'atom'` | Sim | Protocolo de ingestão |
| `config` | object | Sim | Configuração específica do protocolo |
| `defaultEnabled` | boolean | Sim | Estado padrão para novos consumers |
| `createdAt` | Date | Sim (auto) | Data de criação |
| `updatedAt` | Date | Sim (auto) | Última atualização |

**Propriedade derivada:** `category` → herdada do Profile pai. Nunca armazenada na Font.

## Configuração por protocolo

### Nostr
```json
{
  "relays": ["wss://relay.damus.io", "wss://nos.lol"],
  "pubkey": "npub1...",
  "kinds": [1]
}
```

### RSS
```json
{
  "url": "https://example.com/feed.xml"
}
```

### Atom
```json
{
  "url": "https://example.com/atom.xml"
}
```

## Regras de negócio

- Uma Font pertence a exatamente um Profile. Fonts órfãs são proibidas.
- Herda Category do Profile — não possui Category própria.
- Pode ser ativada/desativada pelo UserConsumer (via ConsumerState, sem excluir).
- Deletar uma Font remove todos os posts ingeridos a partir dela.
- Title deve ter entre 1 e 100 caracteres.
- A URL de RSS/Atom deve ser válida.
- O pubkey de Nostr deve ser um hexadecimal ou npub válido.

## Política de imagens

- Formato oficial: WEBP. Todo upload (SVG, PNG, JPEG, GIF) é auto-convertido.
- Avatar: máximo 512×512 px.

## Funcionalidades (MVP)

- [ ] Listar fonts de um profile
- [ ] Adicionar nova font (formulário dinâmico por protocolo)
- [ ] Editar font
- [ ] Deletar font (com confirmação)
- [ ] Ativar/desativar font (consumer)
