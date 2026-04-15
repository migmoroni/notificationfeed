# Categories — Requisitos

## Definição

Category é o sistema taxonômico hierárquico do Notfeed. Possui cinco árvores oficiais (trees):

| Árvore | Tree ID | Letra | Base | Descrição |
|---|---|---|---|---|
| **subject** | `'subject'` | `a` | IPTC NewsCodes Media Topics | Tema do conteúdo |
| **content_type** | `'content_type'` | `b` | schema.org + W3C WAI | Formato/acessibilidade |
| **media_type** | `'media_type'` | `c` | DCMI + schema.org | Tipo de mídia |
| **region** | `'region'` | `d` | UN M49 + ISO 3166-1 | Geografia |
| **language** | `'language'` | `e` | BCP 47 | Idioma |

Não há categories custom; toda a taxonomia é distribuída com o app.

## Propriedades

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `id` | string | Sim (seed) | Identificador compacto de letras (2-5 chars) |
| `label` | string [1..100] | Sim | Nome de exibição (traduzido via i18n) |
| `treeId` | `CategoryTreeId` | Sim | Árvore à qual pertence |
| `parentId` | string \| null | Não | Referência ao nível pai (null = raiz) |
| `depth` | int ≥ 0 | Sim (derivado) | Profundidade na árvore |
| `order` | int ≥ 0 | Sim | Ordem de exibição dentro do nível |
| `bcp47` | string | Não | Código BCP 47 (apenas árvore `language`) |

## Esquema de IDs

IDs usam scheme compacto de letras (a-z):
- **1ª letra**: árvore (`a`=subject, `b`=content_type, `c`=media_type, `d`=region, `e`=language)
- **2ª letra**: raiz/grupo dentro da árvore
- **3ª letra**: sub-nível (para árvores de 2 níveis) ou sub-grupo (para árvores de 3 níveis)
- **4ª-5ª letras**: folha (para árvores de 3 níveis: region, language)

Exemplos:
- `aa` = raiz "Technology" (subject)
- `aae` = sublevel "AI" (subject → Technology → AI)
- `da` = raiz "Africa" (region)
- `daa` = sub-grupo "Eastern Africa" (region → Africa → Eastern Africa)
- `daaaa` = folha "Burundi" (region → Africa → Eastern Africa → Burundi)
- `eaaab` = folha "English (United States)" com `bcp47: 'en-US'`

## Estrutura hierárquica

### Árvores de 2 níveis (subject, content_type, media_type)

```
Tree: subject (a)
├── Technology (aa, depth 0)
│   ├── Open Source (aaa, depth 1)
│   ├── Web Development (aab)
│   ├── Mobile Development (aac)
│   ├── DevOps (aad)
│   ├── AI (aae)
│   └── ...
├── Science (ab)
├── Politics (ac)
├── Economy (ad)
├── Culture (ae)
├── Health (af)
├── Education (ag)
└── ...

Tree: content_type (b)
├── Format (ba, depth 0)
│   ├── News (baa, depth 1)
│   ├── Analysis (bab)
│   ├── Tutorial (bac)
│   ├── Opinion (bad)
│   └── ...

Tree: media_type (c)
├── Text (ca, depth 0)
│   ├── Article (caa, depth 1)
│   ├── Blog Post (cab)
│   └── ...
├── Audio (cb)
│   ├── Podcast (cba)
│   └── ...
├── Video (cc)
└── Image (cd)
```

### Árvores de 3 níveis (region, language)

```
Tree: region (d)
├── Africa (da, depth 0)
│   ├── Eastern Africa (daa, depth 1)
│   │   ├── Burundi (daaaa, depth 2)
│   │   ├── Comoros (daaab)
│   │   └── ...
│   ├── Middle Africa (dab)
│   └── ...
├── Americas (db)
├── Asia (dc)
├── Europe (dd)
└── Oceania (de)

Tree: language (e)
├── Languages (ea, depth 0)
│   ├── English (eaa, depth 1)
│   │   ├── English (eaaaa, depth 2, bcp47: 'en')
│   │   ├── English (United States) (eaaab, bcp47: 'en-US')
│   │   ├── English (United Kingdom) (eaaac, bcp47: 'en-GB')
│   │   └── ...
│   ├── Spanish (eab)
│   │   ├── Español (eabaa, bcp47: 'es')
│   │   ├── Español (España) (eabab, bcp47: 'es-ES')
│   │   └── ...
│   ├── French (eac)
│   └── Portuguese (ead)
```

## Seed

- A taxonomia é definida em arquivos seed por árvore: `seed-subject.ts`, `seed-content-type.ts`, `seed-media-type.ts`, `seed-region.ts`, `seed-language.ts`.
- `category-seed.ts` combina todos os seeds em `CATEGORY_SEED: SeedCategory[]`.
- No boot do app, `seedCategories()` verifica se o store `categories` está vazio. Se sim, insere todo o seed.
- Não há versionamento de seed nem migração incremental. O seed é all-or-nothing.
- Labels são traduzidos via i18n (`tCat(categoryId)`) — o campo `label` no seed serve como fallback.

## Tradução (i18n)

- Cada árvore tem arquivo JSON de tradução por idioma: `i18n/languages/category/{lang}/{tree}.json`
- Exemplo: `i18n/languages/category/en-US/subject.json`, `i18n/languages/category/pt-BR/language.json`
- `tCat(categoryId)` busca primeiro no dicionário do idioma ativo; fallback para o `label` do seed
- Idiomas suportados: `en-US`, `pt-BR`

## Filtros de category

- **Modos**: Cada category selecionada pode estar em modo `'any'` (OR) ou `'all'` (AND)
- **Tri-state toggle**: unselected → any → all → unselected
- **TreeModes**: `Record<CategoryTreeId, Map<string, CategoryFilterMode>>`
- **Factory**: `createCategoryFilter()` cria instâncias isoladas (feed e browse têm seus próprios)
- **Métodos**: `toggleCategory()`, `selectCategory()`, `deselectCategory()`, `getAnyIds(treeId)`, `getAllIds(treeId)`, `getFilterMode(categoryId, treeId)`
- **Filtragem**: `filteredByCategories()` aplica match por tree — `any` = OR entre as selecionadas, `all` = AND entre as selecionadas

## Regras de negócio

- Apenas sublevels (depth ≥ 1) podem ser associados a TreeNodes via `CategoryAssignment`. Raízes são agrupadores.
- Um TreeNode pode ter até 3 categories por tree (via `CategoryAssignment` no `NodeHeader`).
- A Category de um node font é herdada via `getEffectiveNodeCategories()` (propagação ascendente na árvore).
- Todas as categories são imutáveis pelo usuário.
- Filtros no feed e browse usam todas as 5 trees com modos any/all independentes.

## Funcionalidades

- [x] Seed automático de categories oficiais no boot (empty-check)
- [x] Exibir categories por tree (5 árvores)
- [x] Filtro de feed por todas as 5 trees com modos any/all
- [x] Filtro de browse por todas as 5 trees
- [x] Árvore colapsável na tela de Browse
- [x] Tradução de labels via i18n (en-US, pt-BR)
- [x] Campo `bcp47` na árvore language
- [x] Badges visuais indicando modo any/all por category
- [ ] Contagem de entidades por sublevel
