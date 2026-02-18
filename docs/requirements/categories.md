# Categories — Requisitos

## Definição

Category é o sistema taxonômico hierárquico do Notfeed. Possui duas árvores oficiais (trees): **subject** (tema do conteúdo) e **content_type** (formato do conteúdo). Não há categories custom; toda a taxonomia é distribuída com o app.

## Propriedades

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `id` | string | Sim (auto) | Identificador único (estável, definido no seed) |
| `label` | string [1..100] | Sim | Nome de exibição |
| `treeId` | `'subject' \| 'content_type'` | Sim | Árvore à qual pertence |
| `parentId` | string | Não | Referência ao nível pai (null = raiz) |
| `depth` | int ≥ 0 | Sim (derivado) | Profundidade na árvore |
| `order` | int ≥ 0 | Sim | Ordem de exibição dentro do nível |
| `isSystem` | boolean | Sim | Se é parte do seed oficial (sempre true no MVP) |
| `isActive` | boolean | Sim | Se está ativa (false = removida em migração futura) |

## Estrutura hierárquica

```
Tree: subject
├── Technology (raiz, depth 0)
│   ├── Open Source (sublevel, depth 1)
│   ├── Web Development
│   ├── AI
│   └── ...
├── Science
│   ├── Physics
│   └── ...
├── Politics
├── Economy
├── Culture
├── Health
└── Education

Tree: content_type
├── Format (raiz, depth 0)
│   ├── News (sublevel, depth 1)
│   ├── Analysis
│   ├── Research
│   ├── Tutorial
│   ├── Opinion
│   ├── Review
│   ├── Interview
│   ├── Podcast
│   └── Video
```

## Duas árvores oficiais

| Árvore | Exemplos | Quem define | Mutável? |
|---|---|---|---|
| **subject** | Technology, Science, Politics, Culture | App (seed) | Não (read-only) |
| **content_type** | News, Analysis, Tutorial, Podcast | App (seed) | Não (read-only) |

## Seed e versionamento

- A taxonomia é definida em `category-seed.ts` com `CATEGORY_SEED_VERSION`.
- No boot do app, `seedCategories()` compara a versão persistida (localStorage) com a do código.
- Novas categories são inseridas com `isActive: true`.
- Categories removidas em versões futuras ficam `isActive: false` (soft-delete).
- Categories existentes mantêm seu estado `isActive` atual.

## Regras de negócio

- Apenas sublevels (depth ≥ 1) podem ser associados a Profiles. Raízes são agrupadores.
- Um Profile pode ter até 3 categories por tree (via `CategoryAssignment`).
- A Category de uma Font é herdada do Profile pai.
- Todas as categories são imutáveis pelo usuário.
- Filtros no feed usam ambas as trees (subject + content_type).

## Funcionalidades (MVP)

- [x] Seed automático de categories oficiais no boot
- [x] Migração versionada (soft-delete de removidas)
- [x] Exibir categories por tree (subject / content_type)
- [x] Filtro de feed por subject e content_type
- [ ] Árvore colapsável na tela de Browse
- [ ] Contagem de entidades por sublevel
