# Fonts — Requisitos

## Definição

Font (fonte de dados) é um TreeNode com `role='font'` dentro de uma ContentTree. Encapsula **uma ou mais entradas de protocolo** (`FontProtocolEntry[]`) que apontam para o mesmo conteúdo lógico em canais distintos (Nostr, RSS, Atom, JSON Feed). Uma das entradas é marcada como `primary`; as demais funcionam como fallbacks tolerantes a falha. Herda categories do nó pai via propagação ascendente.

## Estrutura

```typescript
TreeNode {
  role: 'font'
  data: {
    header: NodeHeader {
      title: string
      subtitle?: string
      summary?: string
      coverMediaId?: string
      coverEmoji?: string
      bannerMediaId?: string
      categoryAssignments: CategoryAssignment[]
    }
    body: FontBody {
      role: 'font'
      protocols: FontProtocolEntry[]    // 1+ entradas; uma com primary=true
      defaultEnabled: boolean
    }
  }
  metadata: TreeNodeMetadata { id, versionSchema, createdAt, updatedAt }
}
```

### FontProtocolEntry

Cada entry é um canal independente de fetch, com circuit-breaker, backoff e score próprios:

```typescript
FontProtocolEntry {
  id: string                            // UUID local da entry
  protocol: 'rss' | 'atom' | 'jsonfeed' | 'nostr'
  config: FontConfig                    // discriminada pelo protocol
  primary?: boolean                     // exatamente uma com true
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

### JSON Feed (`FontJsonfeedConfig`)
```typescript
{
  url: string         // Ex: "https://example.com/feed.json" (JSON Feed v1.0/v1.1)
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
- A URL de RSS/Atom/JSON Feed deve ser válida.
- O pubkey de Nostr deve ser um hexadecimal ou npub válido.
- `protocols` contém ao menos uma entrada; exatamente uma carrega `primary: true`.
- `defaultEnabled` determina o estado inicial para consumers que não têm overrides.
- Consumer pode ativar/desativar via `NodeActivation.enabled`.
- UI de "Seguir/Segue" (FollowButton) mapeia para `NodeActivation.enabled`.
- Deletar uma Font remove o nó da árvore. Posts ingeridos associados ao nodeId composto são afetados.
- Prioridade: font node → profile node → root node → 3 (default). `null` = herdar.

## Multi-protocolo e resiliência

A execução por tick aplica três políticas em camadas (ver `docs/ingestion-pipeline.md`):

- **Adaptive Fallback**: a primary tenta primeiro; após `failoverThreshold` falhas consecutivas no mesmo tick, o post-manager percorre as entries fallback ranqueadas por score (EWMA de successRate / latência).
- **Backoff Exponencial por entry**: cada entry mantém seu próprio `backoffUntil` após falhas.
- **Circuit Breaker por entry**: após `openAfterFailures` falhas, a entry vai para `OPEN` e fica indisponível até a janela de probe (`HALF_OPEN`).

Quando uma fallback entrega sucesso enquanto a primary está em backoff/`OPEN`, o post-manager promove a fallback como `effectivePrimaryEntryId` em runtime e emite um `SOURCE_SWITCHED`. A primary declarada pelo creator no `FontBody` não é mutada.

Quando **todas** as entries estão `OPEN`, a font transita para `OFFLINE` (emite `PIPELINE_OFFLINE`). O retorno de qualquer probe leva para `RECOVERING` e depois `HEALTHY` (emite `PIPELINE_RECOVERED`).

Clients de protocolo podem descobrir `imageUrl` e `videoUrl` durante essa
execução, mas a font não pré-carrega os arquivos de mídia. O post salvo guarda
apenas as URLs; imagem/vídeo são carregados sob demanda quando a UI renderiza a
mídia. Ver `docs/ingestion-to-post-flow.md`.

## Detecção de protocolo (import)

Na importação por URL simples, o protocolo é detectado heuristicamente:
- URL termina com `.json`, contém `'feed.json'` ou `'jsonfeed'` → JSON Feed (precedência sobre XML)
- Presença de `'atom'`, `'.xml'`, `'/feed'`, `'rss'` na URL → RSS/Atom
- Default: RSS

## Navegação

| Contexto | URL |
|---|---|
| Browse | `/browse/node/{compositeId}` |
| Library | `/library/node/{compositeId}` |
| Preview | `/preview/node/{compositeId}` |

## Funcionalidades

- [x] Criar Font node em ContentTree (formulário dinâmico com múltiplas entries de protocolo)
- [x] Editar Font (title, lista de entries, primary, configs por entry, defaultEnabled)
- [x] Deletar Font node
- [x] Exibir Font em browse/library/preview com badge de pipeline state
- [x] Herança de categories via propagação ascendente
- [x] Ativar/desativar (consumer, via NodeActivation)
- [x] FollowButton (Segue/Seguir) com confirmação para unfollow
- [x] Import por URL simples com detecção de protocolo
- [x] Multi-protocolo com fallback automático, circuit breaker e promoção de primary em runtime
