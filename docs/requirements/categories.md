# Categories — Requisitos

## Definição

Category é o sistema taxonômico hierárquico do Notfeed. Possui dois ramos coexistentes: standard (fixo do app) e custom (livre, criado exclusivamente por UserConsumer).

## Propriedades

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `id` | string | Sim (auto) | Identificador único |
| `label` | string [1..100] | Sim | Nome de exibição |
| `parentId` | string | Não | Referência ao nível pai (null = raiz) |
| `origin` | `'standard' \| 'custom'` | Sim | Se é do conjunto padrão ou criado pelo usuário |
| `ownerId` | string (UUID) | Se custom | UserConsumer que criou (apenas custom) |
| `depth` | int ≥ 0 | Sim (derivado) | Profundidade na árvore |

## Estrutura hierárquica

```
Category (depth 0 — raiz)
├── Category (depth 1 — sublevel)
│   ├── Category (depth 2 — sublevel)
│   └── ...
└── ...
```

## Dois ramos

| Ramo | Estrutura | Quem define | Mutável? |
|---|---|---|---|
| **Standard** | Árvore fixa distribuída com o app | App | Não (read-only para usuários) |
| **Custom** | Árvore livre, formato de pastas | UserConsumer | Sim (livre) |

## Regras de negócio

- Apenas sublevels (depth ≥ 1) podem ser associados a CreatorPages, Profiles e Fonts. Raízes são agrupadores.
- Um Profile aponta para exatamente um sublevel.
- A Category de uma CreatorPage é derivada (união) das categories dos seus Profiles.
- A Category de uma Font é herdada do Profile pai.
- Categories standard são imutáveis pelo usuário.
- Categories custom são de propriedade exclusiva do UserConsumer que as criou.
- UserCreator organiza seus Profiles usando apenas categories standard.
- Organização custom e standard coexistem — Um Profile pode estar em uma category standard **e** ser organizado em uma custom pelo consumer (via ConsumerState).

## Funcionalidades (MVP)

- [ ] Exibir árvore de categories standard
- [ ] CRUD de categories custom (consumer)
- [ ] Associar Profile a category sublevel
- [ ] Organizar entidades em categories custom (consumer)
