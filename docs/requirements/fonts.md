# Fonts — Requisitos

## Definição

Font (fonte de dados) é um TreeNode com `role='font'` dentro de uma ContentTree. Encapsula a configuração técnica de um protocolo de ingestão (Nostr, RSS ou Atom). Herda categories do nó pai via propagação ascendente.

## Estrutura

```typescript
TreeNode {
  role: 'font'
  data: {
    header: NodeHeader {
      title: string                         // Nome da fonte [1..100]
      subtitle?: string
      summary?: string
      coverMediaId?: string
      coverEmoji?: string
      bannerMediaId?: string
      categoryAssignments: CategoryAssignment[]  // Geralmente vazio (herda do pai)
    }
    body: FontBody {
      role: 'font'
      protocol: FontProtocol                // 'nostr' | 'rss' | 'atom'
      config: FontConfig                    // Config específica do protocolo
      defaultEnabled: boolean               // Estado padrão para novos consumers
    }
  }
  metadata: TreeNodeMetadata {
    id: string
    versionSchema: number
    createdAt: Date
    updatedAt: Date
  }
}
```

## FontConfig por protocolo

### Nostr (`FontNostrConfig`)
```typescript
{
  relays: string[]    // Ex: ["wss://relay.damus.io", "wss://nos.lol"]
  pubkey: string      // Hex ou npub
  kinds?: number[]    // Tipos de evento (default: [1])
}
```

### RSS (`FontRssConfig`)
```typescript
{
  url: string         // Ex: "https://example.com/feed.xml"
}
```

### Atom (`FontAtomConfig`)
```typescript
{
  url: string         // Ex: "https://example.com/atom.xml"
}
```

## ID composto

O ID global de uma Font é `treeId:localUuid`:
- `treeId` = ID da ContentTree que a contém
- `localUuid` = chave no `nodes` Record da árvore

## Categories

- Fonts geralmente não definem `categoryAssignments` próprias no header
- Categories efetivas são herdadas via `getEffectiveNodeCategories()` — propagação ascendente pela árvore (font → profile → root)
- Filtros usam categories efetivas para match any/all

## Regras de negócio

- Font é sempre um nó embarcado em uma ContentTree. Não existe como entidade independente.
- Somente o creator dono da ContentTree pode editar.
- Title deve ter entre 1 e 100 caracteres.
- A URL de RSS/Atom deve ser válida.
- O pubkey de Nostr deve ser um hexadecimal ou npub válido.
- `defaultEnabled` determina o estado inicial para consumers que não têm overrides.
- Consumer pode ativar/desativar via `NodeActivation.enabled`.
- UI de "Seguir/Segue" (FollowButton) mapeia para `NodeActivation.enabled`.
- Deletar uma Font remove o nó da árvore. Posts ingeridos associados ao nodeId composto são afetados.
- Prioridade: font node → profile node → root node → 3 (default). `null` = herdar.

## Detecção de protocolo (import)

Na importação por URL simples, o protocolo é detectado heuristicamente:
- Presença de `'atom'`, `'.xml'`, `'/feed'`, `'rss'` na URL → inferência do tipo
- Default: RSS

## Navegação

| Contexto | URL |
|---|---|
| Browse | `/browse/node/{compositeId}` |
| Library | `/library/node/{compositeId}` |
| Preview | `/preview/node/{compositeId}` |

## Funcionalidades

- [x] Criar Font node em ContentTree (formulário dinâmico por protocolo)
- [x] Editar Font (title, protocol, config, defaultEnabled)
- [x] Deletar Font node
- [x] Exibir Font em browse/library/preview
- [x] Herança de categories via propagação ascendente
- [x] Ativar/desativar (consumer, via NodeActivation)
- [x] FollowButton (Segue/Seguir) com confirmação para unfollow
- [x] Import por URL simples com detecção de protocolo
