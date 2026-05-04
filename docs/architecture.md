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

**Contexto**: RSS, Atom, JSON Feed e Nostr têm schemas diferentes.  
**Decisão**: Normalizar tudo para `CanonicalPost` no ponto de ingestão, antes da persistência.  
**Consequência**: A UI e persistência nunca lidam com dados crus de protocolo.

## ADR-004: IndexedDB como persistência padrão

**Contexto**: Precisamos de storage local que funcione em todas as plataformas web.  
**Decisão**: IndexedDB como engine primária. Database `notfeed-v2`, version `17`. SQLite via Tauri plugin como melhoria futura para desktop. Migração destrutiva: ao incrementar a versão, todos os stores são deletados e recriados (sem lógica de migrations incrementais durante pré-lançamento).  
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
**Decisão**: `ContentTree` — estrutura com nós embarcados (`TreeNode`) de múltiplos papéis (`NodeRole`: profile, font, collection, tree). Cada tree possui `nodes` (Record), `paths` (mapeamento de seções), `sections` (divisões visuais), e `metadata` (id, author, timestamps, removedAt). IDs compostos `treeId:localUuid` garantem unicidade global.  
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
**Decisão**: `NodeRole = 'profile' | 'font' | 'collection' | 'tree'`. Cada papel tem um `NodeBody` discriminado:
- **profile** — `ProfileBody { links: ExternalLink[] }`
- **font** — `FontBody { protocols: FontProtocolEntry[]; defaultEnabled: boolean }` (multi-protocolo: cada entry carrega `id`, `protocol`, `config`, `primary?`)
- **collection** — `CollectionBody { links: ExternalLink[] }`
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

**Contexto**: Consumers precisam adicionar conteúdo de duas formas: importar árvores completas (.notfeed.json) de creators, ou colar URLs simples de feeds RSS/Atom/JSON Feed.  
**Decisão**: `ImportService` com dois métodos: `importTreeExport()` valida JSON, checa duplicatas por `exportId`, e persiste ContentTree + ContentMedias. `importSimpleUrls()` auto-detecta RSS/Atom/JSON Feed e cria ContentTree com profile + font nodes, uma font por URL. UI em `/browse/import` com tabs (Arquivo / URLs) e preview antes de importar.  
**Consequência**: Import é consumer-only. Detecção de protocolo é heurística (JSON Feed tem precedência via sufixo `.json`, `feed.json` ou `jsonfeed`; depois URL patterns 'atom', '.xml', '/feed', 'rss').

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
**Decisão**: Factory `createEntityFilter(source, options?)` cria instâncias isoladas. `EntityFilterPageType = 'font' | 'profile' | 'collection'`. Seleção em dois níveis: page (root da tree) → font (refinamento opcional). Suporte a tree-links (nós com `role='tree'` que referenciam outra árvore).  
**Consequência**: Uma única implementação serve feed e browse. Cada tela instancia seu próprio entity filter. Seleção propaga corretamente pela hierarquia da ContentTree.

## ADR-033: Multi-target platform strategy (Plano AA)

**Contexto**: O app deve rodar em vários alvos com requisitos de armazenamento distintos. Web/PWA usam IndexedDB (sandbox do browser); Tauri AppImage (Linux portável) também usa IndexedDB porque o webview embarca o mesmo sandbox. Já bundles nativos completos (deb/rpm/msi/dmg/android) farão sentido com SQLite via `tauri-plugin-sql` para integração ao FS do SO.  
**Decisão**: Manter um único frontend SvelteKit e expor a escolha de backend de armazenamento como uma capability (`storageBackend: 'indexeddb' | 'sqlite'`), lida de `import.meta.env.VITE_STORAGE_BACKEND` (default `'indexeddb'`). A camada de persistência é abstraída atrás de uma interface `StorageBackend` em `$lib/persistence/backends/storage-backend.ts`, com duas implementações: `IndexedDBBackend` (ativa) e `SqliteBackend` (stub para Plano C). O factory `getStorageBackend()` em `db.ts` seleciona em runtime e cacheia. As stores de domínio consomem a interface, não a implementação.  
**Consequência**: Adicionar SQLite no Plano C é mecânico (preencher o stub) sem tocar nas stores. As capabilities `platform`, `hasBackgroundSync` e `hasPeriodicSync` foram adicionadas ao mesmo objeto para informar UI/SW sobre features disponíveis. O alias `getDatabase()` foi mantido para back-compat. A versão atual do IndexedDB (`notfeed-v2` v11) não muda; bumps ficam para o Plano B.

**Nota (supply-chain)**: rejeitamos `@vite-pwa/sveltekit` durante a fase AA6 por arrastar deps transitivas com avisos de segurança (e.g. `glob<11`, `source-map`, etc.) e oferecer ganho marginal sobre a infraestrutura nativa de SW do SvelteKit. O Plano AB usará `src/service-worker.ts` + Workbox direto (`workbox-precaching`, `workbox-routing`, `workbox-window`). Ver futuro ADR-034.


## ADR-034: Service worker via SvelteKit native + Workbox direto (Plano AB)

**Contexto**: Precisamos de um service worker para tornar o app instalável (PWA) e habilitar precaching offline. As alternativas eram `@vite-pwa/sveltekit` (plugin completo) ou usar a infraestrutura nativa do SvelteKit (`src/service-worker.ts` + módulo virtual `$service-worker`).  
**Decisão**: Usar a infra nativa do SvelteKit + Workbox direto (`workbox-precaching`, `workbox-routing`). O SW é escrito manualmente em `src/service-worker.ts` e consome `build`, `files`, `prerendered`, `version` do módulo virtual `$service-worker` para construir o manifesto do `precacheAndRoute()`. Uma `NavigationRoute` com `createHandlerBoundToURL('/')` serve a SPA shell para qualquer navegação in-scope. Em `svelte.config.js`, `kit.serviceWorker.register = false` desliga o auto-registro; o registro é feito manualmente em `src/lib/platform/web/sw-register.ts` e gated por `capabilities.platform !== 'desktop'` no `+layout.svelte`. Listeners `sync`/`periodicsync`/`message` ficam como stub (apenas `console.debug`) — Plano B preencherá os handlers de ingestão. Manifest é arquivo estático (`static/manifest.webmanifest`) linkado em `app.html`.  
**Consequência**: Sem dependência de `@vite-pwa/sveltekit` (rejeitado em ADR-033 por supply-chain). Total de deps PWA: `workbox-precaching`, `workbox-routing`, `workbox-window`, `sharp`. SW emitido em `build/service-worker.js` (~20KB). Plano B injeta os handlers reais de Background Sync / Periodic Background Sync nos listeners stub. Plano AC desabilita o registro automaticamente via `capabilities.platform === 'desktop'`, sem precisar de env var de build.

## ADR-035: Tauri 2.x AppImage como bundle desktop inicial (Plano AC)

**Contexto**: O alvo desktop precisa de persistência local, acesso a feeds sem CORS proxy e zero dependência de servidor. Alternativas: Electron (pesado), Tauri 1.x (sem suporte a plugins novos), Tauri 2.x (atual). Bundle inicial: AppImage (Linux x86_64) por ser portátil, sem assinatura obrigatória e suficiente para validar o stack desktop.  
**Decisão**: Adotar **Tauri 2.x** como wrapper desktop, scaffold em `src-tauri/`. `frontendDist: "../build"` (saída do `adapter-static`); `beforeBuildCommand: "npm run build"`. Plugins ativos: `tauri-plugin-http` (fetches sem CORS) e `tauri-plugin-shell` (abrir links externos). `tauri-plugin-sql` declarado como feature opcional `backend-sqlite` no `Cargo.toml` mas **não registrado** no `lib.rs` ainda — Plano C ativa. Service worker fica emitido no bundle mas **não é registrado** em runtime: o gating em `+layout.svelte` checa `capabilities.platform !== 'desktop'` antes de chamar `registerPwa()` (relação direta com ADR-034). Não há env var `VITE_TAURI` ou similar — a detecção é puramente runtime via `window.__TAURI_INTERNALS__`. Bundle único agora: `bundle.targets: ["appimage"]`. Outros formatos (deb, rpm, msi, dmg, apk) ficam para Plano C. Capabilities: `core:default`, `http:default`, `shell:default` em `src-tauri/capabilities/default.json`.  
**Consequência**: Build desktop reproduzível com `npm run tauri:appimage` produz `Notfeed_<version>_amd64.AppImage` standalone. Persistência via IndexedDB do WebKit2GTK (mesma stack do navegador, dispensa migração de dados). SW continua ativo em alvos web/PWA, dormente em Tauri — uma única base de código, três bundles. Pré-requisitos de build documentados em `docs/build-targets.md` (pacotes `-dev` GTK/WebKit, `pkg-config`, `libfuse2` em runtime). Auto-update (`tauri-plugin-updater`), CSP endurecida e bundles adicionais ficam para iterações futuras.

## ADR-036: Per-user post boxes (Plano B)

**Contexto**: O modelo original (`posts` keyed por `nodeId`) compartilhava registros entre todos os usuários de um mesmo dispositivo. Marcar como lido / favoritar / lixeirar em um usuário afetava todos os outros. Multi-user no mesmo device exigia isolamento real do estado de leitura.  
**Decisão**: Schema v12 reformula `posts` como **caixas por usuário**. Cada registro tem chave sintética `_pk = ${userId}|${nodeId}|${id}` mais um campo auxiliar `_userNode = ${userId}|${nodeId}`. Dois índices: `byUser` (lista a caixa inteira de um usuário) e `byUserNode` (lista uma fonte de um usuário). Posts iguais ativados por N usuários ocupam N registros independentes — `read`, `savedAt`, `trashedAt`, `ingestedAt` são estritamente per-usuário. Conteúdo canonical (`title`, `content`, `url`, `publishedAt`...) é replicado nas caixas mas refrescado em cada upsert. Helper `backfillPostsForUserNode(userId, nodeId)` copia conteúdo de outras caixas quando um usuário ativa uma fonte já existente, evitando esperar o próximo tick.  
**Consequência**: Migração destrutiva v11→v12. API per-user obrigatória: não há mais `savePosts(...)` global, apenas `savePostsForUser(userId, ...)`. PostManager fica responsável por iterar usuários interessados e fazer broadcast. Custo de espaço (replicação) é aceitável dado o volume típico (milhares de posts) e o ganho de simplicidade na lógica de filtros / retenção.

## ADR-037: PostManager isomórfico + FetcherState compartilhado (Plano B)

**Contexto**: A ingestão precisava (a) rodar tanto na thread principal quanto no Service Worker com a mesma lógica, (b) evitar fetches duplicadas quando dois usuários ativam a mesma fonte, e (c) suportar conditional GET e backoff sem duplicar estado.  
**Decisão**: Criar `PostManager` (`$lib/ingestion/post-manager.ts`) como módulo isomórfico com função-fábrica `createPostManager()` que aceita um `IngestionContext` (lista de usuários ativos, http adapter, capabilities). A mesma instância roda no foreground (driven by scheduler) e no SW (driven por `sync` / `periodicsync`). Estado per-fonte vive em um novo store `fetcherStates` keyed por `nodeId`: `etag`, `lastModified`, `consecutiveFailures`, `nextScheduledAt`. Antes de fetch, o manager calcula o **menor** intervalo desejado entre os usuários interessados (coalescência); aplica conditional GET se há etag/lastModified; em sucesso, normaliza uma vez e faz `savePostsForUser` para cada usuário; em falha, aplica backoff. Normalizadores (`rss/atom/jsonfeed/nostr.normalizer.ts`) produzem `IngestedPost` puro (sem `userId`) para reforçar a separação.  
**Consequência**: Uma fetch física por fonte por tick, independentemente de quantos usuários a têm ativada. Settings de ingestão são per-usuário (cada um define seus tiers de ociosidade e backoff), mas a coalescência impede que o número de chamadas de rede cresça com o número de usuários. PostManager pode ser plugado a `Periodic Background Sync` no Plano AB sem refatoração — basta chamar `tick()` no handler do SW.

## ADR-038: Idle tiers per-usuário + backoff system-level

**Contexto**: Dois eixos de configuração de ingestão que precisam viver em lugares diferentes. Os tiers de cadência (`activeFontIntervalMs`, `idleTier{1,2,3}IntervalMs`, `idleTier{1,2}MaxIdleMs`) são juízos pessoais ("quanto recurso eu quero gastar enquanto estou inativo"), por isso pertencem a `UserSettings`. Já o backoff em falhas atua sobre `FetcherState`, que é compartilhado entre todos os usuários da fonte — expor isso na UI confundiria o usuário ("meu número ganha do do outro?") e na prática não agrega valor.  
**Decisão**: Manter os tiers como per-user (5 campos editados em `/user/settings/ingestion`, com layout em tabela e limites encadeados). Mover backoff para um arquivo de **back-settings** em `src/lib/config/back-settings.ts` (constante `INGESTION_BACKOFF` com `enabled`, `multiplier`, `maxSteps`, `maxMs`). Esse arquivo é a casa pretendida para futuras knobs de sistema (rate limits, timeouts, feature flags de experimentos), sempre como literais com comentários para que apareçam claros em diffs. PostManager importa diretamente `INGESTION_BACKOFF` — sem `pickBackoffConfig`/`pickFallbackBackoffSettings`.  
**Consequência**: `IngestionSettings` perde `backoffEnabled`, `backoffMultiplier`, `maxBackoffSteps`, `maxBackoffMs`. UI de settings perde a seção de backoff e o preview. i18n perde os keys `backoff*`. Defaults compatíveis com o comportamento anterior (2× até 6 steps, teto 24h). Ajustes de produção agora são um diff num arquivo único, sem migração de schema.

## ADR-039: Back-settings como painel único de tunables do desenvolvedor

**Contexto**: Após mover o backoff para `back-settings.ts` (ADR-038), o mesmo padrão se aplicava a outras dezenas de literais espalhados pelo código — timeout EOSE de Nostr, limite por REQ, kinds default, jitter de fetch, tick do scheduler, intervalo de retenção, nome e versão do DB, janela de dedup de activity, sugestão de categorias por árvore, tags de Service Worker, intervalo mínimo de periodic sync, dimensões de avatar/banner, qualidade WEBP, page size do feed, debounce de busca, page limit do entity filter, breakpoints de layout. Cada um vivia hardcoded num arquivo diferente, sem ser configurável pelo usuário e sem ser fácil de auditar/ajustar.  
**Decisão**: Centralizar **todos** esses literais em `src/lib/config/back-settings.ts` agrupados por subsistema: `INGESTION_BACKOFF`, `INGESTION_FETCH`, `INGESTION_SCHEDULER`, `PERSISTENCE`, `SERVICE_WORKER`, `IMAGE_LIMITS`, `UI_LIMITS`, `UI_BREAKPOINTS`. Cada grupo é um `export const X = { ... } as const` com tipo derivado (`type X = typeof X`). Convenção: valores literais (sem env vars), comentários inline explicando trade-offs, e os call-sites apenas importam (`import { UI_LIMITS } from '$lib/config/back-settings.js'`) — nada de copiar default. O arquivo passa a ser o painel de controle do desenvolvedor: para mudar o tick do scheduler de 30s para 15s, edita-se uma linha; um diff de back-settings revela todo o ajuste operacional.  
**Consequência**: 13 arquivos refatorados para consumir back-settings (nostr.client, scheduler, post-manager, activity.store, category-assignment, indexeddb.backend, sw-register, image-asset, image.service, FeedList, EntityTreeFilter, SearchBar, layout.svelte). Defaults idênticos ao comportamento anterior — refator puramente estrutural, validado por svelte-check 0/0/0. Próximas knobs (rate limits, timeouts default, flags de experimentos) entram naturalmente como novo grupo no mesmo arquivo, sem proliferar locais de configuração.

## ADR-040: Pipeline de notificações como funil fixo de três etapas referenciando feed-macros

**Contexto**: Após o ingestion sweep, o app precisa decidir o que vira notificação OS, o que vira só inbox, e o que é silenciado — sem proliferar UI de configuração nem duplicar a lógica de filtro que já vive nos feed-macros. Tentativas anteriores (builder dinâmico de steps; UI separada para selecionar fontes ativadas; pipeline fora do `UserSettings`) cresciam para abarcar todos os casos e divergiam do feed: um filtro "marca tudo de tecnologia EN-US, exceto reuploads" exigia replicar `categoryModesByTree` + `priorityByNodeId` no esquema da notificação, com risco real de divergência semântica entre o que o usuário vê na timeline e o que dispara um alerta. Também ficou claro que o destino do clique na notificação OS precisa rotear para algo que o usuário consiga reproduzir manualmente, senão a notificação vira opaca.  
**Decisão**: Funil fixo de **três etapas** em ordem `per_post → batch_macro → batch_global`, persistido em `UserSettings.notifications` como `NotificationPipeline = { enabled, steps: [Step, Step, Step], updatedAt }`. Cada `NotificationStep` carrega `{ id, kind, macroIds: string[], intervalMs }` — o `macroIds` é uma allow-list de **ids de feed-macros que o próprio usuário criou na página /feed**. A notificação nunca define lógica de filtro: sempre referencia macros existentes em `consumer.feedMacros`. A avaliação per-post é delegada a `postMatchesMacro` em `src/lib/domain/feed-macro/macro-evaluator.ts` (puro, isomórfico, importável tanto pelo SW quanto pela página), que fica como **fonte única de verdade** para "este post bate este macro?". O engine resolve por first-match-wins por post (per_post → batch_macro → batch_global), respeita um piso de `intervalMs` clampeado pelo menor `*IntervalMs` da ingestão (notificação não pode disparar mais rápido do que a ingestão produz), e grava `InboxEntry` com um campo discriminado `target`: `{ kind:'url', url, postId }` para `per_post` (o clique abre o post) ou `{ kind:'macro', macroId }` para `batch_macro` e `batch_global` (o clique navega para `/?macro=<id>`, com `__all__` como sentinela do "todos os macros combinados"). O `os-notifier` propaga `data.targetUrl` para o `Notification` API (browser e SW); o SW registra um `notificationclick` que reusa janela aberta via `clients.matchAll`+`focus`+`navigate` ou abre nova via `clients.openWindow`. A página `/` lê o param via `$effect` (não `onMount`, porque o bell faz `goto` sem remontar), aplica o macro, e remove o param via `replaceState`. Quando `__all__` chega mas o usuário tem menos de 2 macros (a entrada "Combinar todos" só aparece a partir de 2), o handler cai para `applyMacro(null)` — a entrada padrão "All" — para que a seleção mostrada no sidebar reflita o que ele clicou. IDs de macro órfãos (usuário deletou o macro depois) são silenciosamente ignorados pelo engine. Ids dos steps são fixos (`per_post`, `batch_macro`, `batch_global`), o que dá keys estáveis para `stepLastFiredAt` em `notification-meta` sem migração quando o usuário mexe em macros.  
**Consequência**: A UI de `/user/settings/notifications` é um funil de três cartões fixos com multi-select de macros (não há mais enumeração de fontes ativadas — a fonte da verdade é `consumer.feedMacros`). O esquema do IndexedDB foi para `dbSchemaVersion: 15` com substituição destrutiva (ADR-004): `step.filter` saiu, `step.macroIds` entrou; `InboxEntry.postRefs` saiu, `InboxEntry.target` entrou. Sem normalizadores legados — pré-lançamento. A Tauri plugin não expõe API de click-routing, então `data.targetUrl` é ignorado no desktop (a inbox continua canônica). i18n renomeada em massa: `step_kind_batch_node`/`*_fonts_*` → `step_kind_batch_macro`/`*_macros_*`, com hints reescritos para mencionar o destino do clique. `back-settings.NOTIFICATIONS.stepIds` virou `{ perPost, batchMacro, batchGlobal }`. Validação: svelte-check 0/0/0 em 1162 arquivos.

## ADR-041: Font multi-protocolo com primary + fallbacks

**Contexto**: Conteúdo idêntico costuma estar publicado em mais de um canal — um blog que entrega RSS e JSON Feed, um agregador com Atom e mirror RSS, um perfil ativo em vários relays Nostr. Modelar isso como Fonts separadas duplicava títulos, categorias e ativações; pior, o feed mostrava o mesmo post em duplicidade quando os dois canais funcionavam, e o usuário tinha que escolher manualmente qual desinscrever quando um deles caía.
**Decisão**: Reformular `FontBody` de `{ protocol, config, defaultEnabled }` para `{ protocols: FontProtocolEntry[]; defaultEnabled }`. Cada `FontProtocolEntry` carrega `{ id, protocol, config, primary? }` — uma única entry com `primary: true` é a declarada pelo creator; as demais são fallbacks. O `PostManager` escolhe a entry ativa por tick via `getProtocolEntriesByPriority(body, scores, effectivePrimaryEntryId)`, tenta a primary primeiro e percorre fallbacks ranqueados por score apenas após `failoverThreshold` falhas consecutivas no mesmo tick. Cada entry mantém `ProtocolFetcherState` independente dentro de `FetcherState.protocols` (circuit-breaker, backoff, EWMA de successRate/latência, score, headers de cache). A primary declarada no `FontBody` é imutável em runtime; a promoção de fallback acontece apenas no campo `effectivePrimaryEntryId` do `FetcherState` e emite `SOURCE_SWITCHED`.
**Consequência**: Um único nó de Font cobre N canais. UI de criação/edição (`FontBodyForm`) ganhou repetidor de entries com toggle de primary. Normalizadores continuam puros; o que muda é qual client é chamado por tick. Posts entregues por entries diferentes deduplicam pelo `id` canônico do post (mesmo `nodeId` composto). Schema bump destrutivo (ADR-004) — sem migração legacy.

## ADR-042: Pipeline de ingestão como máquina de estados explícita em dois níveis

**Contexto**: O modelo anterior tinha apenas `consecutiveFailures` + `nextScheduledAt` por fonte. Falhas transitórias e prolongadas pareciam iguais para a UI; recuperações eram silenciosas; a promoção de fallback (ADR-041) precisava de critérios objetivos; e o consumer de notificações não tinha uma fila durável para ler — qualquer evento perdido entre dois ticks sumia. Sem máquina de estados explícita, qualquer regra adicional ("avise quando tudo cair", "avise quando voltar", "silencie ruído enquanto está degradado") virava heurística pontual.
**Decisão**: Modelar dois níveis de máquina de estados em `$lib/domain/ingestion/fetcher-state.ts`. Em nível de **font**: `HEALTHY ↔ UNSTABLE ↔ OFFLINE` com hold em `RECOVERING` por `recoveringHoldTicks` ticks; `DEGRADED` reservado para heurística futura. Transições válidas codificadas no mapa `TRANSITIONS` e validadas pelo helper puro `transition(state, to, now, confidenceFor)`. Em nível de **source** (entry de protocolo): circuit breaker `CLOSED ↔ OPEN ↔ HALF_OPEN`, com OPEN ao cruzar `openAfterFailures` ou `openAfterBackoffMs`, probe randomizado entre `probeIntervalMin` e `probeIntervalMax`. `FetcherState.confidence` é derivada de `pipelineState` via `INGESTION_CONFIDENCE` (HEALTHY=1.0, RECOVERING=0.7, UNSTABLE=0.5, DEGRADED=0.3, OFFLINE=0.0). Toda transição legítima anexa um `PipelineEvent` (`PIPELINE_UNSTABLE`, `PIPELINE_OFFLINE`, `PIPELINE_RECOVERED`, `PIPELINE_DEGRADED`, `SOURCE_SWITCHED`) ao novo store IDB `pipelineEvents` (keyPath=`id`, indexes `byFont`/`byTimestamp`, retenção 7 dias) via `appendPipelineEvent`. Configs numéricas centralizadas em `back-settings.ts` (`INGESTION_PROTOCOL_SCORING`, `INGESTION_INSTABILITY`, `INGESTION_CIRCUIT_BREAKER`, `INGESTION_BACKOFF`, `INGESTION_CONFIDENCE`).
**Consequência**: Três modos de execução agora coexistem em camadas no mesmo tick: Adaptive Fallback (por tick), Backoff Exponencial (por source), Circuit Breaker (por source, escalonante). Notificações de pipeline ganham um canal próprio (Canal 2 do engine de notificações — ver `docs/notification-system.md`) lendo a fila durável com dedup por `(fontId, eventType)` e modos `realtime`/`batched`. UI exibe badge colorido por estado da pipeline em cards e detail pages. Schema bump destrutivo introduziu três stores auxiliares (`notificationMeta`, `notificationInbox`, `pipelineEvents`); IDB foi para `dbSchemaVersion: 17`. Documentação detalhada em `docs/ingestion-pipeline.md` (e `.pt-BR.md`).

## ADR-043: Transporte IPFS/IPNS para feeds sem novo protocolo lógico

**Contexto**: O app já tratava `rss`, `atom` e `jsonfeed` como protocolos lógicos de conteúdo, com busca via HTTP. Era necessário consumir os mesmos formatos também via `ipfs://` e `ipns://` (hipermídia), sem introduzir um novo protocolo de negócio e sem adicionar SSR. Além disso, a estratégia deveria funcionar em web/PWA/TWA e desktop Tauri, com premissa offline-first.
**Decisão**: Manter o modelo de fonte inalterado (`FontProtocol` continua `rss | atom | jsonfeed | nostr`) e tratar IPFS/IPNS como **transporte de URL** em `config.url`. Foi criado um parser/resolvedor compartilhado (`$lib/ingestion/net/feed-url.ts`) que aceita:
- `http(s)://...`
- `ipfs://<cid>[/path]`
- `ipns://<name>[/path]` (incluindo DNSLink)
- URLs HTTP de gateway com `/ipfs/...` e `/ipns/...`

No runtime:
- **Web/PWA/TWA**: `ipfs://`/`ipns://` resolvem para a cadeia de gateways configurada (`ingestion.ipfsGatewayServices`) e seguem a cadeia de proxies CORS quando habilitada.
- **Tauri**: tenta Helia primeiro (`helia`, `@helia/unixfs`, `@helia/ipns`) com timeout e limite de bytes; em falha, usa fallback por gateways (e proxies, se habilitados).

Settings de ingestão ganharam seção avançada de gateways IPFS/IPNS (`ipfsGatewayEnabled`, `ipfsGatewayServices`). Importação e validação de formulário passaram a aceitar os novos esquemas. O schema IDB subiu de forma destrutiva para `dbSchemaVersion: 18` (pré-lançamento, sem legado/migração incremental).
**Consequência**: Os fluxos de ingestão, fallback, circuit-breaker e normalização permanecem os mesmos. A superfície de configuração aumenta pouco, mantendo UX simples para casos comuns e controle avançado para cenários com gateways customizados. O bundle cliente cresce (principalmente SW/chunks) por incluir Helia no caminho desktop.
