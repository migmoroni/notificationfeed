# Fonts — Requisitos

## Definição

Font (fonte de dados) é uma entidade vinculada a um Profile. Encapsula a configuração específica de um protocolo (Nostr, RSS ou Atom) para busca de posts.

## Propriedades

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `id` | string (UUID) | Sim (auto) | Identificador único |
| `profileId` | string | Sim | Profile ao qual pertence |
| `label` | string | Sim | Nome de exibição da fonte |
| `protocol` | `'nostr' \| 'rss' \| 'atom'` | Sim | Protocolo de ingestão |
| `config` | object | Sim | Configuração específica do protocolo |
| `enabled` | boolean | Sim | Se a fonte está ativa para ingestão |
| `createdAt` | Date | Sim (auto) | Data de criação |
| `updatedAt` | Date | Sim (auto) | Última atualização |

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

- Uma Font pertence a exatamente um Profile.
- Fonts podem ser habilitadas/desabilitadas individualmente.
- Deletar uma Font remove todos os posts ingeridos a partir dela.
- Label deve ter entre 1 e 100 caracteres.
- A URL de RSS/Atom deve ser válida.
- O pubkey de Nostr deve ser um hexadecimal ou npub válido.

## Funcionalidades (MVP)

- [ ] Listar fonts de um profile
- [ ] Adicionar nova font (formulário dinâmico por protocolo)
- [ ] Editar font
- [ ] Deletar font (com confirmação)
- [ ] Toggle habilitar/desabilitar font
