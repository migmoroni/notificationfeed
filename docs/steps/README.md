# Notfeed — Passos de Desenvolvimento

Guia sequencial para construção do app. Cada fase entrega funcionalidade testável.
Verificação por fase: `npm run build` limpo + funcionalidade testável no browser.

---

## Fase 0 — Fundação ✅

> Domínio, persistência, ingestão, normalização, layout store.

- [x] Domain models completos (User, CreatorPage, Profile, Font, Category, ConsumerState)
- [x] Repository contracts + IndexedDB implementations (8 stores)
- [x] Ingestion clients (Nostr WebSocket, RSS fetch, Atom fetch)
- [x] Normalizers (Nostr, RSS, Atom → CanonicalPost)
- [x] Ingestion scheduler (polling RSS/Atom + WebSocket Nostr)
- [x] Platform capabilities, SW register, notifications, install prompt
- [x] Tauri bridge, tray, updater, window utils
- [x] ConsumerState com `priority: PriorityLevel | null` e `favorite: boolean`
- [x] PriorityResolver (cadeia Font→Profile→CreatorPage→3)
- [x] FeedSorter (agrupamento por prioridade + ordenação por data)
- [x] Layout store adaptativo (`layout.svelte.ts` — compact/expanded)
- [x] Shell adaptativo no `+layout.svelte` (sidebar desktop + bottom-nav mobile)
- [x] Rotas placeholder: `/`, `/browse`, `/favorites`, `/settings`
- [x] Barrel exports atualizados (`$lib/index.ts`)
- [x] Documentação: requirements, architecture (14 ADRs), glossary, steps

---

## Fase 1 — Componentes UI + Svelte Stores Reativos ✅

> Instalar shadcn-svelte, criar stores reativos, substituir placeholders por ícones.

### Tarefas

- [x] Instalar componentes shadcn-svelte:
  ```bash
  npx shadcn-svelte@latest add button card badge input select dialog separator tabs sheet
  ```
- [x] Substituir emojis no layout por ícones Lucide (`Newspaper`, `Search`, `Star`, `Settings`)
- [x] Criar `src/lib/stores/consumer.svelte.ts`
  - `$state` com UserConsumer ativo
  - Wraps `user-consumer.store.ts`
  - Actions: `init()`, `setPriority()`, `setFavorite()`, `toggleEnabled()`
- [x] Criar `src/lib/stores/feed.svelte.ts`
  - `$state` com posts carregados
  - `$derived` com posts priorizados (usa `buildPriorityMap` + `sortByPriority`)
  - Actions: `loadFeed()`, `markRead()`, `refreshFeed()`
- [x] Criar `src/lib/stores/browse.svelte.ts`
  - `$state` com categories e resultados de navegação
  - Actions: `loadCategories()`, `selectCategory()`, `searchEntities()`
- [x] Criar `src/lib/stores/favorites.svelte.ts`
  - `$derived` filtrando ConsumerState onde `favorite === true`
  - Resolve entidades referenciadas (Page/Profile/Font)
- [x] Criar `src/lib/utils/mock-data.ts` — dados fake para desenvolvimento
- [x] Instalar vitest + jsdom
  ```bash
  npm install -D vitest jsdom
  ```
- [x] Configurar `vitest.config.ts`
- [x] Testes unitários: `priority-resolver.test.ts` (13 tests), `feed-sorter.test.ts` (6 tests)
- [x] `npm run build` limpo + `npm run test:run` (19/19 pass)

### Entregáveis

- Componentes shadcn-svelte disponíveis em `$lib/components/ui/`
- Stores reativos funcionais
- Ícones Lucide no shell
- Testes passando

---

## Fase 2 — Tela de Feed (`/`) ✅

> Core loop: mostrar posts priorizados com infinite scroll.

### Tarefas

- [x] Helper `src/lib/utils/date.ts` — `formatRelativeDate` + `formatShortDate` via `Intl.RelativeTimeFormat` (pt-BR)
- [x] Componente `PostCard.svelte`
  - Título, autor, data relativa, excerpt
  - Badge de prioridade (colorido: destructive/secondary/outline)
  - Indicador lido/não-lido (borda accent + CircleDot)
  - Ação: marcar como lido + abrir link externo
- [x] Componente `FeedList.svelte`
  - Infinite scroll via IntersectionObserver (PAGE_SIZE=20)
  - Consome `feed.store` (posts priorizados)
  - Loading state (pulse skeleton cards)
  - Empty state ("Nenhum post ainda")
- [x] Componente `PriorityFilter.svelte`
  - Tabs: Todos, Alta, Média, Baixa (shadcn Tabs)
  - Filtra posts por nível de prioridade
- [x] Iniciar dados mock no `onMount` do layout
  - `consumer.init()` → `seedMockData()` → `feed.loadFeed()`
  - Decisão: ingestion real adiada para fase futura (mock only)
- [x] Testes: `date.test.ts` (10 tests) + testes existentes (19)
- [x] Instalado `@testing-library/svelte`
- [x] `npm run build` limpo + `npm run test:run` (29/29 pass)

### Entregáveis

- Feed funcional mostrando posts ordenados por prioridade
- Infinite scroll
- Filtro por prioridade
- Posts marcados como lidos

---

## Fase 3 — Tela de Browse (`/browse`) ✅

> Navegação por categories oficiais (subject + content_type) para descobrir conteúdo.

### Tarefas

- [x] Seed automático de categories oficiais (`category-seed.ts` + `category-seed.service.ts`)
- [x] Migração versionada via `CATEGORY_SEED_VERSION` + localStorage
- [x] Filtro de feed por subject e content_type (`CategoryFilter.svelte`)
- [x] Instalado componente shadcn `collapsible`
- [x] Componente `CategoryTree.svelte`
  - Árvore colapsável (root → sublevels) por tree via `Collapsible`
  - Estado open/close preservado no componente
- [x] Componente `TreeSelector.svelte`
  - Tabs (shadcn) para alternar entre "Assunto" e "Formato"
  - Chama `browse.setActiveTree()` ao mudar tab
- [x] Componente `EntityCard.svelte`
  - Card para Page/Profile/Font com ícones por tipo (Globe/User/Rss)
  - Badge de tipo, tags, ações inline:
    - Prioridade (1/2/3 buttons) via `consumer.setPriority()`
    - Toggle favorito (Star/StarOff) via `consumer.setFavorite()`
    - Toggle ativo/inativo via `consumer.toggleEnabled()`
  - Link para sub-rotas (CreatorPage/Profile) ou card estático (Font)
- [x] Componente `EntityList.svelte`
  - Lista agrupada por tipo (Pages → Profiles → Fonts)
  - Separadores, skeleton loader, empty state
- [x] Componente `SearchBar.svelte`
  - Input com debounce (300ms), ícone Search, botão limpar
  - Integra `browse.searchEntities()` e `browse.clearSearch()`
- [x] Componente `FontDetail.svelte`
  - Collapsible com metadados técnicos (URL/relays/pubkey)
  - Posts carregados via `getPosts({ fontId })` — lazy on expand
  - Ações inline: prioridade, favorito
- [x] Componente `ProfilePage.svelte`
  - Reutilizável entre rotas standalone e under-creator
  - Header com título, tags, category badges
  - Lista de Fonts como `FontDetail` collapsibles
  - Posts agregados com `PostCard` e `sortByPriority`
- [x] Reescrita de `/browse/+page.svelte`
  - Layout: SearchBar + TreeSelector (sidebar em desktop) + EntityList
  - Busca oculta tree, mostra resultados direto
- [x] Rotas aninhadas (refletem DDD lifecycle modes do Profile):
  - `/browse/creator/[creatorId]` — detalhes da CreatorPage + lista de Profiles dependentes
  - `/browse/profile/[profileId]` — standalone (redireciona para URL canônica se profile é dependente)
  - `/browse/creator/[creatorId]/profile/[profileId]` — profile dependente (child do agregado CreatorPage)
  - `/browse/profile/[profileId]/font/[fontId]` — font de profile standalone
  - `/browse/creator/[creatorId]/profile/[profileId]/font/[fontId]` — font de profile dependente
- [x] ADR-016: Profile como aggregate root condicional (standalone vs dependente)
- [x] Mock data ajustado: `profileNews` agora é standalone (`creatorPageId: null`)
- [x] Barrel exports atualizados (`$lib/index.ts` + `browse/index.ts`)
- [x] `npm run build` limpo + `npm run test:run` (29/29 pass)

### Entregáveis

- Navegação por categories oficiais com árvore colapsável
- Busca por texto (pages, profiles, fonts)
- Definição de prioridade e favorito inline
- Drill-down funcional com rotas aninhadas (CreatorPage → Profile → Font → Posts)
- Entity count por sublevel adiado para fase futura

---

## Fase 4 — Tela de Favoritos (`/favorites`) ✅

> Favoritos organizados em tabs (many-to-many). Tab de sistema "Todos" + tabs custom com emoji.

### Tarefas

- [x] Domain model redesenhado: `FavoriteFolder` → `FavoriteTab` (many-to-many)
  - `FavoriteTab { id, title, emoji, position, isSystem, createdAt }`
  - `FavoriteTabRepository` contract
  - Tab de sistema `all_favorites` (⭐ Todos) — não pode ser editada/excluída
- [x] `ConsumerState` migrado: `favoriteFolderId: string | null` → `favoriteTabIds: string[]`
- [x] IndexedDB migrado v3→v4: store `favoriteFolders` → `favoriteTabs`, campo `favoriteFolderId` → `favoriteTabIds` nos consumerStates
- [x] `favorite-tab.store.ts` — implementação do repo com `ensureSystemTab()` auto-criação
- [x] `consumer.svelte.ts` — `moveFavoriteToFolder()` → `updateFavoriteTabIds()`, limpa tabIds ao desfavoritar
- [x] Store reativo `favorites.svelte.ts` reescrito para N→N:
  - State: `tabs`, `items`, `activeTabId`, `selectedItemIds`, `loading`
  - Derived: `filteredItems`, `itemsByTab`, `customTabs`, `isSelecting`
  - Actions: `loadFavorites()`, `createTab()`, `updateTab()`, `deleteTab()`, `addItemsToTabs()`, `removeItemsFromTab()`, `removeFavorites()`, `reorderTab()`, seleção em lote
- [x] Componente `TabSidebar.svelte`
  - Tabs verticais (expanded: emoji + título) / horizontais (compact: emoji only)
  - Tab ⭐ "Todos" fixa no topo, tabs custom abaixo
  - Botão "+" para criar tab, menu de contexto (editar/excluir)
- [x] Componente `TabDialog.svelte`
  - Dialog modal para criar/editar tab (emoji + título)
  - Validação: emoji obrigatório, título max 20 chars
- [x] Componente `FavoriteItemList.svelte`
  - Lista agrupada por tipo (Pages → Profiles → Fonts) via `EntityCard`
  - Long-press (500ms) ativa modo seleção, checkbox visual por card
  - Adapter `FavoriteItem` → `BrowseEntity` para reutilizar `EntityCard`
- [x] Componente `SelectionBar.svelte`
  - Barra flutuante no bottom com count + "Organizar" / "Desfavoritar" / "Cancelar"
- [x] Componente `TabAssignmentDialog.svelte`
  - Lista de tabs custom com tri-state checkbox (✓ todos / – parcial / ☐ nenhum)
  - Toggle adicionar/remover itens selecionados de cada tab
- [x] Reescrita de `/favorites/+page.svelte`
  - Layout responsivo: sidebar `lg:grid-cols-[200px_1fr]` (expanded) / horizontal (compact)
  - Confirm dialog para desfavoritar em lote
- [x] Barrel exports atualizados (`$lib/index.ts` + `favorites/index.ts`)
- [x] Mock data migrado: `favoriteFolderId: null` → `favoriteTabIds: []`
- [x] Stale data detection para v3→v4 migration em `hasMockData()`
- [x] Test fixtures atualizados: `priority-resolver.test.ts`
- [x] `npm run build` limpo + `npm run test:run` (29/29 pass)

### Entregáveis

- Favoritos organizados em tabs (many-to-many, ⭐ Todos + custom)
- Seleção em lote via long-press + bulk assign/desfavoritar
- Tabs com emoji + título, CRUD via dialog modal
- Prioridade ajustável inline (via EntityCard reutilizado)
- Layout responsivo (sidebar vertical / row horizontal)

---

## Fase 4.5 — Componentização, UX e Navegação de Favoritos ✅

> Extrair componentes shared, centralizar prioridade, unificar navegação Browse ↔ Favorites.

### Bug fixes

- [x] `FontPage.svelte` — type narrowing: `$state<Font | null>(null)` para evitar erro de tipo
- [x] `consumer.svelte.ts` — `$state.snapshot(cs)` antes de writes no IndexedDB para evitar "Proxy object could not be cloned" (ADR-019)

### Shared component layer (`$lib/components/shared/`)

- [x] `ConfirmDialog.svelte` — componente base genérico para diálogos de confirmação
  - Props: `open`, `title`, `description`, `confirmLabel`, `confirmVariant`
  - Snippet slot `icon` para ícone custom
  - Eventos: `onconfirm`, `oncancel`
- [x] `ConfirmUnfavoriteDialog.svelte` — wrapper especializado (ADR-020)
  - Ícone StarOff, prop `count` para singular/plural
  - Texto: "Remover {n} item(ns) dos favoritos?"
- [x] `TabDialog.svelte` — unificado em 3 modes (antes era separado)
  - `create`: ícone FolderPlus, "Criar Tab"
  - `edit`: ícone FolderPen, "Editar Tab"
  - `delete`: ícone Bookmark+Trash2, "Excluir Tab"
  - Validação: emoji obrigatório, título max 20 chars
- [x] `priority.ts` — configuração centralizada de prioridade (ADR-017)
  - `PRIORITY_LEVELS`, `PRIORITY_MAP`, `PRIORITY_INACTIVE_CLASS`
  - Interface `PriorityConfig { value, label, variant, icon }`
- [x] `PriorityButtons.svelte` — toggle group de 3 níveis
  - Tamanhos: `sm` (cards) e `md` (pages)
  - Configurado via `PRIORITY_LEVELS` de `priority.ts`
- [x] `PriorityBadge.svelte` — badge de prioridade com variant/label do `PRIORITY_MAP`
- [x] `FavoriteButton.svelte` — toggle star (Star/StarOff)
  - Tamanhos: `sm` (size-6, cards) e `md` (size-5, pages)
  - Callbacks: `onfavorite`, `onunfavorite`

### Componentes atualizados para usar shared layer

- [x] `FontCard.svelte` — usa PriorityButtons(sm), PriorityBadge, FavoriteButton(sm)
- [x] `ProfileCard.svelte` — usa PriorityButtons(sm), PriorityBadge, FavoriteButton(sm)
- [x] `EntityCard.svelte` — usa PriorityButtons(sm), PriorityBadge, FavoriteButton(sm)
- [x] `PostCard.svelte` — usa PriorityBadge
- [x] `PriorityFilter.svelte` — usa PRIORITY_MAP para labels
- [x] `FontPage.svelte` — usa PriorityButtons(md), FavoriteButton(md)
- [x] `ProfilePage.svelte` — usa FavoriteButton(md)
- [x] `FontDetail.svelte` — usa PriorityButtons(sm), FavoriteButton(sm)

### Navegação unificada Browse ↔ Favorites (ADR-018)

- [x] Extração de `CreatorPage.svelte` como componente reutilizável
  - Antes: lógica inline em `/browse/creator/[creatorId]/+page.svelte` (226 linhas)
  - Depois: componente em `$lib/components/browse/CreatorPage.svelte`
  - Props: `creatorId`, `backHref`, `backLabel`, `baseHref`
- [x] `ProfilePage.svelte` — adicionado prop `baseHref` para links contextuais
  - `fontPageHref` e `creatorPageHref` usam `${baseHref}/...` ao invés de `/browse/...` hardcoded
- [x] `FavoriteItemList.svelte` — adicionado `itemHref()` para gerar URLs `/favorites/...`
  - EntityCards agora recebem `href` para drill-down dentro do contexto Favoritos
- [x] 5 sub-rotas de favoritos (espelham estrutura do Browse):
  - `/favorites/creator/[creatorId]` → CreatorPage (back: Favoritos, baseHref: /favorites)
  - `/favorites/profile/[profileId]` → ProfilePage (com redirect se dependente)
  - `/favorites/creator/[creatorId]/profile/[profileId]` → ProfilePage
  - `/favorites/profile/[profileId]/font/[fontId]` → FontPage
  - `/favorites/creator/[creatorId]/profile/[profileId]/font/[fontId]` → FontPage
- [x] Barrel exports atualizados (`browse/index.ts` exporta CreatorPage)

### Diálogos de confirmação

- [x] `ConfirmUnfavoriteDialog` integrado em `FavoriteItemList.svelte` (desfavoritar em lote)
- [x] `ConfirmUnfavoriteDialog` integrado em todas as surfaces com toggle favorito

### Verificação

- [x] `npm run build` limpo + `npm run test:run` (29/29 pass)

### Entregáveis

- Componentes shared reutilizáveis (6 .svelte + 1 .ts)
- Prioridade e favorito centralizados (single source of truth)
- Navegação drill-down funcional dentro de Favoritos (espelha Browse)
- Diálogos de confirmação para desfavoritar em todas as surfaces
- Bug fixes de proxy/type documentados como ADRs

---

## Fase 5 — Tela de Settings (`/settings`)

> Configurações do consumer + CRUD de Profiles/Fonts próprios.

### Tarefas

- [ ] Seção "Minha Conta" — nome, display name
- [ ] Seção "Meus Profiles"
  - Criar/editar/deletar Profiles (consumer-owned)
  - Upload de avatar com conversão WEBP (Canvas API)
  - Seleção de category sublevel
  - Tags
- [ ] Seção "Minhas Fonts"
  - Criar/editar/deletar Fonts dentro de um Profile
  - Form dinâmico por protocolo:
    - RSS: campo URL
    - Atom: campo URL
    - Nostr: campos relays[] + pubkey + kinds[]
  - Validação de URL e pubkey
- [ ] Seção "Reset" — limpar todas as prioridades e favoritos
- [ ] `npm run build` limpo

### Entregáveis

- CRUD funcional de Profiles e Fonts
- Upload e conversão de imagem WEBP
- Formulário dinâmico por protocolo

---

## Fase 6 — Fluxo Creator: CreatorPages

> Publicação e compartilhamento de páginas editoriais.

### Tarefas

- [ ] Rota `/creator` — dashboard do creator
- [ ] CRUD de CreatorPages
  - Avatar + banner (WEBP, dimensões validadas)
  - Tags, bio, título
- [ ] Vincular Profiles existentes a uma CreatorPage
- [ ] Export `.notfeed.json`
  - Gerar `PageExport` snapshot completo
  - Trigger download do arquivo
- [ ] Import `.notfeed.json`
  - File picker com validação do schema
  - Parsing + criação local com `syncStatus: 'imported'`
- [ ] `npm run build` limpo

### Entregáveis

- CreatorPages CRUD completo
- Export/import offline funcional

---

## Fase 7 — PWA

> Primeiro target de distribuição.

### Tarefas

- [ ] Implementar `static/sw.js` com estratégias:
  - Cache-first para assets estáticos (`_app/immutable/`)
  - Network-first para dados dinâmicos
  - Fallback offline para `index.html`
- [ ] Validar `static/manifest.json`
  - Ícones em múltiplas resoluções (192, 512)
  - `display: standalone`
  - `theme_color` e `background_color`
- [ ] Integrar `install-prompt.ts` na UI
  - Banner de instalação contextual
- [ ] Integrar `notifications.ts`
  - Notificar novos posts quando app está em background
- [ ] Lighthouse audit (aim: PWA score 100)
- [ ] Testar instalação em Android Chrome

### Entregáveis

- PWA instalável e funcional
- Suporte offline básico
- Notificações de novos posts

---

## Fase 8 — Testes & Qualidade

> Estabilizar o app antes de empacotamento.

### Tarefas

- [ ] Testes unitários para todos os stores reativos
- [ ] Testes de integração: ingestion → normalization → persistence
- [ ] Testes de componente para telas críticas (Feed, Browse, Settings forms)
- [ ] Configurar ESLint + Prettier
  ```bash
  npm install -D eslint prettier eslint-plugin-svelte
  ```
- [ ] CI com GitHub Actions
  - Job: `npm run build` + `npm run test` + `npm run check`
- [ ] `npm run test` todos passando

### Entregáveis

- Cobertura de testes nas camadas críticas
- Lint e format configurados
- CI automatizado

---

## Fase 9 — Desktop (Tauri)

> Segundo target de distribuição.

### Tarefas

- [ ] Inicializar Tauri:
  ```bash
  npx @tauri-apps/cli init
  ```
- [ ] Configurar `tauri.conf.json`
  - Windows: `.msi` bundle
  - Linux: `.AppImage` bundle
  - Window size, title, icon
- [ ] Integrar `tauri-bridge.ts` com a UI
- [ ] Integrar `tray.ts` — system tray com Show/Quit
- [ ] Integrar `window.ts` — minimize-to-tray on close
- [ ] Integrar `updater.ts` — check for updates on startup
- [ ] Build e teste MSI (Windows)
- [ ] Build e teste AppImage (Linux)

### Entregáveis

- Instalador MSI funcional
- AppImage funcional
- System tray com menu
- Auto-updater

---

## Fase 10 — Polish & UX

> Funcionalidades pós-MVP e refinamentos.

### Tarefas

- [ ] Dark mode toggle (respeitar `prefers-color-scheme`)
- [ ] Onboarding flow (primeira execução: criar consumer, explicar conceitos)
- [ ] Performance: virtualização de listas longas (>100 posts)
- [ ] Acessibilidade: keyboard navigation, ARIA labels, focus management
- [ ] Animações de transição entre compact/expanded
- [ ] Drag-and-drop para reordenar favoritos entre tabs

### Entregáveis

- Polish de UX
- Acessibilidade completa
