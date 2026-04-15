# Profiles — Requisitos

## Definição

Profile é um TreeNode com `role='profile'` dentro de uma ContentTree. Representa uma identidade temática ou editorial que agrupa Fonts. Cada Profile é um nó embarcado — não uma entidade separada.

## Estrutura

```typescript
TreeNode {
  role: 'profile'
  data: {
    header: NodeHeader {
      title: string                         // Nome do profile [1..100]
      subtitle?: string                     // Subtítulo
      summary?: string                      // Descrição breve
      coverMediaId?: string                 // Media de capa
      coverEmoji?: string                   // Emoji alternativo
      bannerMediaId?: string                // Media de banner
      categoryAssignments: CategoryAssignment[]  // Até 3 por tree (5 trees)
    }
    body: ProfileBody {
      role: 'profile'
      links: ExternalLink[]                 // Links externos { title, url }
    }
  }
  metadata: TreeNodeMetadata {
    id: string                              // UUID local
    versionSchema: number
    createdAt: Date
    updatedAt: Date
  }
}
```

## ID composto

O ID global de um Profile é `treeId:localUuid`:
- `treeId` = ID da ContentTree que o contém
- `localUuid` = chave no `nodes` Record da árvore

## Posição na árvore

A posição do Profile dentro da ContentTree é determinada por `TreePaths`:
- `paths['/']` — se o Profile é o nó raiz
- `paths['*']` — se está na lista sem seção
- `paths[sectionId]` — se está dentro de uma seção nomeada

## Categories

- Categories são atribuídas via `NodeHeader.categoryAssignments` (até 3 sublevels por tree, 5 trees)
- `CategoryAssignment = { treeId, categoryIds[] }`
- Nós font filhos herdam categories via `getEffectiveNodeCategories()` (propagação ascendente)
- Filtros no feed e browse usam as categories efetivas com modos any/all

## Regras de negócio

- Profile é sempre um nó embarcado em uma ContentTree. Não existe como entidade independente.
- Somente o creator dono da ContentTree pode editar.
- Pode ter múltiplos links externos (`ExternalLink[]`).
- Title deve ter entre 1 e 100 caracteres.
- `categoryAssignments` aceita apenas sublevels (depth ≥ 1), até 3 por tree.
- Deletar um Profile remove o nó da árvore e desassocia seus filhos.
- Pode ser ativado/desativado pelo consumer via `NodeActivation.enabled`.
- UI de "Seguir/Segue" (FollowButton) mapeia para `NodeActivation.enabled`.
- Prioridade: font node → profile node → root node → 3 (default). `null` = herdar.

## Navegação

| Contexto | URL |
|---|---|
| Browse | `/browse/profile/{compositeId}` |
| Favorites | `/favorites/profile/{compositeId}` |
| Preview | `/preview/profile/{compositeId}` |

## Funcionalidades

- [x] Criar Profile node em ContentTree
- [x] Editar Profile (title, subtitle, summary, cover, banner, links, categories)
- [x] Deletar Profile node
- [x] Exibir Profile em browse/favorites/preview
- [x] CategoryAssignment com 5 trees
- [x] Ativar/desativar (consumer, via NodeActivation)
- [x] FollowButton (Segue/Seguir) com confirmação para unfollow
