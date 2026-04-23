# Notfeed — Decisões Arquiteturais

## ADR-001: Client-side first (SPA)

**Contexto**: Notfeed é um agregador pessoal; não há necessidade de SEO ou SSR.  
**Decisão**: SvelteKit com `adapter-static` e `ssr: false`. Todo routing é client-side.  
**Consequência**: Deploy em qualquer host estático. Tauri carrega o `index.html` local.

## ADR-002: Separação em camadas

**Contexto**: Misturar protocolos, UI e persistência gera acoplamento.  
**Decisão**: 5 camadas claras: `domain/`, `ingestion/`, `normalization/`, `persistence/`, `platform/`.  
**Consequência**: Cada camada pode evoluir independentemente. Novos protocolos = novo diretório em `ingestion/` + normalizer.

## ADR-003: Post Canônico como formato único

**Contexto**: RSS, Atom e Nostr têm schemas diferentes.  
**Decisão**: Normalizar tudo para `CanonicalPost` no ponto de ingestão, antes da persistência.  
**Consequência**: A UI e persistência nunca lidam com dados crus de protocolo.

## ADR-004: IndexedDB como persistência padrão

**Contexto**: Precisamos de storage local que funcione em todas as plataformas web.  
**Decisão**: IndexedDB como engine primária. Database `notfeed-v2`, version `5`. SQLite via Tauri plugin como melhoria futura para desktop. Migração destrutiva: ao incrementar a versão, todos os stores são deletados e recriados (sem lógica de migrations incrementais durante pré-lançamento).  
**Consequência**: Funciona em PWA, TWA e Tauri (via webview). Migration path para SQLite é isolada em `db.ts`. Para aplicar mudanças de schema em dev, basta incrementar a versão ou apagar o banco no DevTools.

## ADR-005: shadcn-svelte como sistema de componentes

**Contexto**: Precisamos de componentes UI consistentes e customizáveis.  
**Decisão**: shadcn-svelte — componentes copiados para `$lib/components/ui/`, não como dependência npm.  
**Consequência**: Controle total sobre os componentes. Tailwind CSS como engine de estilo.

## ADR-006: Plataforma única, múltiplos targets

**Contexto**: Web, Android e Desktop devem compartilhar a mesma base.  
**Decisão**: SvelteKit SPA como core. Diferenças isoladas em `$lib/platform/` com capability detection.  
**Consequência**: Uma única codebase. Targets: estáticos (PWA), Bubblewrap (TWA), Tauri (MSI + AppImage).

## ADR-007: Dois papéis de usuário (Consumer / Creator)

**Contexto**: O app atende dois perfis distintos — quem consome feeds e quem publica conteúdo.  
**Decisão**: `UserConsumer` e `UserCreator` como entidades separadas, ambas estendendo `UserBase`. Consumer gerencia ativações, favoritos e macros. Creator gerencia ContentTrees e ContentMedias.  
**Consequência**: Regras de negócio podem ser aplicadas por papel. Publicação Nostr restrita ao Creator.

## ADR-008: ContentTree como artefato publicável

**Contexto**: Um Creator precisa de uma unidade editorial que agrupe Profiles e Fonts e possa ser publicada ou compartilhada offline.  
**Decisão**: `ContentTree` — estrutura com nós embarcados (`TreeNode`) de múltiplos papéis (`NodeRole`: profile, font, creator, collection, tree). Cada tree possui `nodes` (Record), `paths` (mapeamento de seções), `sections` (divisões visuais), e `metadata` (id, author, timestamps, removedAt). IDs compostos `treeId:localUuid` garantem unicidade global.  
**Consequência**: ContentTrees são a unidade de follow para Consumers e de publicação para Creators. Export/import offline via `.notfeed.json` contendo `TreeExport`.

## ADR-009: Taxonomia oficial com cinco árvores

**Contexto**: Precisamos organizar conteúdo por múltiplas dimensões sem permitir criação livre pelo usuário.  
**Decisão**: `Category` com campo `treeId: CategoryTreeId` — cinco árvores:
- **subject** (a) — Temas baseados em IPTC NewsCodes Media Topics
- **content_type** (b) — Acessibilidade baseada em schema.org + W3C WAI
- **media_type** (c) — Tipos de mídia baseados em DCMI + schema.org
- **region** (d) — Geografia baseada em UN M49 + ISO 3166-1
- **language** (e) — Idiomas baseados em BCP 47

Campos da `Category`: `id`, `label`, `treeId`, `parentId`, `depth`, `order`, e `bcp47` opcional (apenas na árvore language). IDs usam scheme compacto de letras (2-5 letras): 1ª=árvore, 2ª=raiz, 3ª=sub-ramo, 4ª-5ª=folha. Toda a taxonomia é oficial (seed), distribuída com o app. No boot, `seedCategories()` verifica se o store está vazio e insere o seed completo.  
**Consequência**: Sem CRUD de categories. Seed automático no boot (empty-check). TreeNodes usam `CategoryAssignment[]` (até 3 sublevels por tree) no `NodeHeader`. Feed filtra por todas as 5 trees com modos any/all.

## ADR-010: Política de imagem WEBP

**Contexto**: Múltiplos formatos de imagem complicam armazenamento e exibição.  
**Decisão**: Toda imagem armazenada é WEBP. Upload aceita SVG/PNG/JPEG/GIF/WEBP; conversão automática para WEBP no cliente. Avatar ≤ 512×512, Banner ≤ 1600×600.  
**Consequência**: `ImageAsset` como value object único. Pipeline de conversão no frontend via Canvas API.

## ADR-011: Export/Import offline de ContentTrees

**Contexto**: Creators podem querer compartilhar suas árvores de conteúdo sem conexão Nostr.  
**Decisão**: `TreeExport` — JSON completo (ContentTree + ContentMedias como snapshot) salvo como `.notfeed.json`. Consumer pode importar diretamente. IDs são regenerados no import. `exportId` estável permite detectar reimportações.  
**Consequência**: Portabilidade total. QR code e file sharing como canais de distribuição.

## ADR-012: NodeActivation para overrides locais do Consumer

**Contexto**: Consumers precisam ativar/desativar nós individuais e organizar favoritos sem alterar os dados do Creator.  
**Decisão**: `NodeActivation` — objeto embarcado em `UserConsumer.activateNodes[]` que registra overrides locais por nó. Campos: `nodeId` (composite `treeId:localUuid`), `priority` (PriorityLevel | null), `favorite`, `enabled`, `libraryTabIds` (array many-to-many com LibraryTabs). `TreeActivation` em `activateTrees[]` registra inscrição em árvores inteiras.  
**Consequência**: Dados do Creator ficam imutáveis. Toda personalização é armazenada como estado local do Consumer dentro do próprio registro do usuário.

## ADR-013: Layout adaptativo via store reativo (não CSS-only)

**Contexto**: O app roda em mobile (PWA/TWA), desktop (Tauri/browser), e tablets. Precisamos de UI diferente mas sem builds separados ou UA parsing.  
**Decisão**: Store reativo `layout.svelte.ts` com `$state` (Svelte 5). Detecção baseada em `window.innerWidth` (< 900px = compact, ≥ 900px = expanded). `pointer: coarse` e `hover: none` refinam mas nunca substituem a largura. Atualiza via `resize`, `orientationchange`, e `matchMedia.change`.  
**Consequência**: Uma única fonte de verdade. Componentes consomem `layout.mode` — nunca recalculam. Tailwind breakpoints complementam para detalhes visuais, mas o store governa a estrutura (sidebar vs bottom-nav, grid vs stack).

## ADR-014: Feed prioritizado com herança de prioridade (Consumer-scoped)

**Contexto**: Consumers precisam controlar a relevância de fontes no feed sem alterar dados do Creator.  
**Decisão**: `NodeActivation` ganha `priority: PriorityLevel | null` (1=alta, 2=média, 3=baixa) e `favorite: boolean`. Cadeia de herança: font node → profile node → root node → 3 (default). `null` = herdar. O feed agrupa por prioridade e ordena por data dentro de cada grupo.  
**Consequência**: Posts de prioridade 1 sempre aparecem antes de prioridade 2, independente da data. Toda personalização é per-consumer, armazenada em `NodeActivation`.

## ADR-015: LibraryTabs para organização da biblioteca

**Contexto**: Consumers precisam organizar entidades ativadas em grupos nomeados, com destaque para favoritos.  
**Decisão**: Duas tabs de sistema definidas como constantes do app (`SYSTEM_LIBRARY_TABS`): 📚 "All Library" (mostra todos os nós ativados) e ⭐ "Only Favorites" (filtra `favorite === true`). Tabs de sistema **não são persistidas** no registro do usuário — são constantes da aplicação. `UserConsumer.libraryTabs[]` contém apenas tabs custom criadas pelo usuário (emoji + título). Relação many-to-many: cada `NodeActivation` contém `libraryTabIds[]` com IDs de tabs custom às quais pertence.  
**Consequência**: A Library mostra todos os nós ativados com organização flexível. Deletar uma tab custom remove a associação (não desfavorita). Um item pode pertencer a múltiplas tabs simultaneamente.

## ADR-016: NodeRole como papéis dentro de ContentTree

**Contexto**: Uma ContentTree precisa de nós com papéis distintos — perfis editoriais, fontes de dados, coleções, links entre árvores.  
**Decisão**: `NodeRole = 'profile' | 'font' | 'creator' | 'collection' | 'tree'`. Cada papel tem um `NodeBody` discriminado:
- **profile** — `ProfileBody { links: ExternalLink[] }`
- **font** — `FontBody { protocol: FontProtocol; config: FontConfig; defaultEnabled: boolean }`
- **creator** — `CreatorBody { links: ExternalLink[] }`
- **collection** — `CollectionBody {}`
- **tree** — `TreeLinkBody { instanceTreeId: string }`

Todos os nós compartilham `NodeHeader` (title, subtitle, summary, coverMediaId, coverEmoji, bannerMediaId, categoryAssignments). A posição na árvore é determinada por `TreePaths` (`/` = root, `*` = unsectioned, `[sectionId]` = sectioned).  
**Consequência**: Uma única estrutura `TreeNode` serve para todos os papéis. Type guards (`isProfileNode()`, `isFontNode()`, etc.) garantem tipagem segura. A URL segue a estrutura: `/browse/creator/{id}`, `/browse/profile/{id}`, `/browse/font/{id}`, `/browse/node/{id}`.

## ADR-017: Shared component layer (`$lib/components/shared/`)

**Contexto**: Padrões de UI repetidos em múltiplos componentes (botão de favorito, seletor de prioridade, dialogs de confirmação, dialogs de tab) geram duplicação e inconsistência.  
**Decisão**: Camada `shared/` contém componentes reutilizáveis agnósticos de domínio:
- **ConfirmDialog** — base genérica com `icon` snippet, `title`, `description`, `confirmVariant`
- **ConfirmUnfavoriteDialog** — wrapper com ícone StarOff e texto específico
- **TabDialog** — dialog unificado com 3 modes (`create` | `edit` | `delete`), cada um com ícone, título e comportamento próprios
- **PriorityButtons** — toggle group com sizes `sm`/`md`, classes centralizadas em `priority.ts`
- **PriorityBadge** — badge de prioridade com variant e label
- **FavoriteButton** — toggle star com sizes `sm`/`md`
- **priority.ts** — single source of truth (`PRIORITY_LEVELS`, `PRIORITY_MAP`, `PRIORITY_INACTIVE_CLASS`)

**Consequência**: Zero duplicação de config e markup de prioridade/favorito. Mudança visual/comportamental em um único lugar. Componentes de domínio (browse, library, feed) consomem shared/ ao invés de reimplementar.

## ADR-018: Navegação unificada Browse ↔ Library via `baseHref`

**Contexto**: As telas Browse e Library precisam navegar para as mesmas páginas de detalhe (Creator, Profile, Font) mas com contexto de retorno diferente (`/browse` vs `/library`).  
**Decisão**: Componentes de página reutilizáveis recebem `backHref`, `backLabel`, e `baseHref` como props. O `baseHref` é usado para gerar links internos (ex: `${baseHref}/creator/${id}/profile/${pid}`). Rotas em `/library/...` espelham a árvore de `/browse/...`, passando `baseHref="/library"`.  
**Consequência**: Uma única implementação de UI para cada entidade. Adicionar novos contextos de navegação (ex: `/settings/...`) requer apenas novas rotas thin-wrapper. LibraryItemList gera hrefs com prefixo `/library/` automaticamente.

## ADR-019: `$state.snapshot()` obrigatório para IndexedDB

**Contexto**: Svelte 5 wraps valores `$state` em Proxy objects. O `structured clone algorithm` do IndexedDB (usado em `.put()`) não consegue clonar Proxies, lançando "Proxy object could not be cloned".  
**Decisão**: Toda escrita em IndexedDB passa por `$state.snapshot(obj)` antes de chamar o repositório. Aplicado em `consumer.svelte.ts` para `setPriority()`, `setFavorite()`, `toggleEnabled()`.  
**Consequência**: Padrão obrigatório para qualquer store reativo que persista em IndexedDB. Verificação em code review.

## ADR-020: Confirmação obrigatória para desfavoritar

**Contexto**: Desfavoritar remove a entidade da lista de favoritos e de todas as tabs associadas. É uma ação destrutiva que deve ser reversível pelo usuário antes de confirmar.  
**Decisão**: Toda ação de desfavoritar (em browse e favorites) exibe `ConfirmUnfavoriteDialog` antes de executar. O dialog mostra contagem de itens (singular/plural) e usa variante destrutiva.  
**Consequência**: Protege contra cliques acidentais. Fluxo consistente em todas as 7+ superfícies onde desfavoritar é possível.

## ADR-021: Subscribe/Follow como UI labels para enabled

**Contexto**: O campo `NodeActivation.enabled` controlava "ativo/inativo" — terminologia genérica sem significado claro para o usuário.  
**Decisão**: Revestir `enabled` com terminologia contextual: "Inscrito/Inscrever-se" (SubscribeButton) para nós creator, "Segue/Seguir" (FollowButton) para nós profile e font. Ambos mapeiam para o mesmo `toggleNodeEnabled()` do consumer store. Confirmação obrigatória para desinscrever/deixar de seguir via ConfirmUnsubscribeDialog/ConfirmUnfollowDialog.  
**Consequência**: Sem alteração no domínio. Quatro novos componentes shared. Terminologia consistente em todas as surfaces (cards, detail pages, EntityCard).

## ADR-022: Multi-user com activeUser store

**Contexto**: O app precisa suportar dois tipos de usuário (consumer e creator) com navegações distintas.  
**Decisão**: Criar `activeUser.svelte.ts` como store de identidade ativa. O layout condiciona a nav (consumer: 4 itens / creator: 3 itens) via `$derived` no `activeUser.role`. A rota `/user` centraliza CRUD de usuários, troca de identidade e configurações. Boot sequence: `activeUser.init()` → `consumer.init()` → `activeUser.setActive()`.  
**Consequência**: Trocar de usuário recarrega stores. Creator é "local" por padrão. Suporte a soft-delete e restore de usuários.

## ADR-023: Import dual-mode (.notfeed.json + URLs)

**Contexto**: Consumers precisam adicionar conteúdo de duas formas: importar árvores completas (.notfeed.json) de creators, ou colar URLs simples de feeds RSS/Atom.  
**Decisão**: `ImportService` com dois métodos: `importTreeExport()` valida JSON, checa duplicatas por `exportId`, e persiste ContentTree + ContentMedias. `importSimpleUrls()` auto-detecta RSS/Atom e cria ContentTree com profile + font nodes, uma font por URL. UI em `/browse/import` com tabs (Arquivo / URLs) e preview antes de importar.  
**Consequência**: Import é consumer-only. Detecção de protocolo é heurística (baseada em URL patterns: 'atom', '.xml', '/feed', 'rss').

## ADR-024: Publish como snapshot versionado

**Contexto**: Creators editam ContentTrees livremente. Publicar deve gerar uma "foto" imutável da tree atual, sem afetar o rascunho em edição.  
**Decisão**: `publishTree()` no creator store constrói um `TreeExport` snapshot a partir dos dados live (tree + medias), incrementa version e persiste como `TreePublication` no store `treePublications` (keyPath: `treeId`). O snapshot segue o mesmo formato de `.notfeed.json`. `exportId` é gerado via `crypto.randomUUID()` na primeira publicação.  
**Consequência**: Edições depois de publicar não aparecem no preview/export até nova publicação. Consumers que importam recebem exatamente o que foi publicado. Versionamento permite rastrear mudanças. Separação física: rascunhos em `editorTrees`, publicadas em `contentTrees`.

## ADR-025: Separação creator/consumer com stores dedicados

**Contexto**: ContentTrees de consumer (importadas) e de creator (editáveis) não devem interferir entre si.  
**Decisão**: Separação por stores no IndexedDB: `editorTrees`/`editorMedias` para rascunhos do creator, `contentTrees`/`contentMedias` para árvores publicadas/importadas. `ContentTreeMetadata.author` identifica o dono. O creator store filtra por `author === creatorUser.id`.  
**Consequência**: Dados de consumer e creator coexistem no banco mas são fisicamente separados por stores. Publicar copia do editor para content.

## ADR-026: Preview = visão estática + feed

**Contexto**: Creators precisam ver como sua tree publicada aparece para consumers.  
**Decisão**: Rota `/preview` exibe trees publicadas com duas tabs: "Visão Geral" (snapshot estático: bio, profiles, fonts como cards) e "Feed" (posts reais ingeridos das fonts da tree). O preview-feed store resolve fontIds a partir dos nodes da tree publicada e filtra posts do IndexedDB.  
**Consequência**: Preview é read-only. Feed mostra dados reais (não simulados) — requer que as fonts tenham sido ingeridas. Se nenhuma tree está publicada, mostra empty state com link para `/pages`.

## ADR-027: Remoção de /library (creator placeholder), adição de /preview e /library (consumer)

**Contexto**: A rota `/library` era um placeholder para gerenciamento de conteúdo do creator. Com o sistema de publish, a funcionalidade se dividiu: edição em `/pages` e visualização em `/preview`. Paralelamente, a tela de favoritos evoluiu para "Library" do consumer.  
**Decisão**: Remover `/library` do creator completamente. Nav do creator passa a ser: Pages (FileStack) → Preview (Eye) → User (CircleUser). `/pages` é o hub de CRUD, `/preview` mostra o resultado publicado. `/library` agora é a tela do consumer que exibe todos os nós ativados com tabs de organização (All Library, Only Favorites, custom tabs).  
**Consequência**: `/library` é exclusivo do consumer. Nav do consumer: Feed → Browse → Library → User.

## ADR-028: ContentTree como modelo de dados central

**Contexto**: Inicialmente, o domínio tinha entidades separadas (CreatorPage, Profile, Font). A evolução mostrou que uma estrutura unificada com nós tipados é mais flexível e escalável.  
**Decisão**: `ContentTree` como aggregate root central. Estrutura:
- `nodes: Record<string, TreeNode>` — nós embarcados com `role`, `data.header` (NodeHeader) e `data.body` (NodeBody discriminado por role)
- `paths: TreePaths` — mapeamento de posição: `/` (root nodeId), `*` (unsectioned nodeIds[]), `[sectionId]` (sectioned nodeIds[])
- `sections: TreeSection[]` — divisões visuais com `id`, `order`, `symbol`, `title`, `hideTitle`, `color`
- `metadata: ContentTreeMetadata` — `id`, `versionSchema`, `createdAt`, `updatedAt`, `author`, `authorTreeId`, `removedAt`

IDs de nós são compostos: `treeId:localUuid` para unicidade global. Utilitários: `parseTreeId()`, `getNode()`, `getRootNode()`, `getNodesByRole()`, `getFontNodes()`, `generateNodeId()`.  
**Consequência**: Um único modelo unifica toda a hierarquia editorial. Profiles, Fonts e Creators são papéis (roles) de TreeNode, não entidades separadas. CRUD é feito via `creator.svelte.ts` (`createNode()`, `updateNode()`, `deleteNode()`). Persistência e export compartilham o mesmo formato.

## ADR-029: Sistema de internacionalização (i18n) reativo

**Contexto**: O app precisa suportar múltiplos idiomas na interface, inclusive labels de categories.  
**Decisão**: `Language = 'en-US' | 'pt-BR'` (extensível). Store reativo `i18n/store.svelte.ts` com `$state` module-level. Função `t(key)` busca no dicionário do idioma ativo com suporte a interpolação `{varName}`. Categories têm tradução dedicada via `tCat(categoryId)` com arquivos JSON separados por árvore e idioma (ex: `i18n/languages/category/en-US/subject.json`). `initLanguage()` prioriza: preferência do usuário → match com navigator → `DEFAULT_LANGUAGE` (en-US).  
**Consequência**: Traduções são automáticas e reativas via runes do Svelte 5. Adicionar idioma = criar novos JSONs de tradução. Categories de todas as 5 árvores possuem labels traduzidos.

## ADR-030: Feed Macros como presets de filtro salvos

**Contexto**: Consumers configuram filtros complexos (por nó, por categories de 5 árvores, com modos any/all) e querem reutilizá-los rapidamente.  
**Decisão**: `FeedMacro` — preset salvo com `id`, `name`, e `filters: FeedMacroFilters`. Filters contém `nodeIds[]`, `categoryIdsByTree` (Record por tree), e `categoryModesByTree` (Record por tree de `categoryId → 'any' | 'all'`). Macros embarcados em `UserConsumer.feedMacros[]`. CRUD via consumer store.  
**Consequência**: Um clique restaura todo o estado de filtro do feed. Modes por tree garantem que comportamento any/all é preservado. Backwards-compatible: ausência de `categoryModesByTree` = default 'any'.

## ADR-031: Filtro de categories com modos any/all

**Contexto**: Filtrar feed por categories requer flexibilidade — em alguns casos o consumer quer qualquer match (OR), em outros quer exigir todas (AND).  
**Decisão**: Tri-state toggle por category: unselected → any → all → unselected. `CategoryFilterMode = 'any' | 'all'`. `TreeModes = Record<CategoryTreeId, Map<string, CategoryFilterMode>>`. Factory `createCategoryFilter()` cria instâncias isoladas com `toggleCategory()`, `selectCategory()`, `deselectCategory()`, `getAnyIds()`, `getAllIds()`. Usado no feed e no browse com store próprio cada.  
**Consequência**: Filtro de 5 árvores com granularidade per-category. Feed store aplica `filteredByCategories()` verificando match any (OR) e all (AND) separadamente por tree. UI reflete o estado com badges e indicadores visuais para cada modo.

## ADR-032: Entity Filter centralizado

**Contexto**: Múltiplas telas (feed, browse) precisam filtrar por entidades (pages, profiles, fonts) com seleção em dois níveis: árvore → nó.  
**Decisão**: Factory `createEntityFilter(source, options?)` cria instâncias isoladas. `EntityFilterPageType = 'font' | 'profile' | 'creator' | 'collection'`. Seleção em dois níveis: page (root da tree) → font (refinamento opcional). Suporte a tree-links (nós com `role='tree'` que referenciam outra árvore).  
**Consequência**: Uma única implementação serve feed e browse. Cada tela instancia seu próprio entity filter. Seleção propaga corretamente pela hierarquia da ContentTree.
