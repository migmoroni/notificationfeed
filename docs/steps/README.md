# Notfeed — Passos de Desenvolvimento

Guia sequencial para construção do app. Cada fase entrega funcionalidade testável.
Verificação por fase: `npm run build` limpo + funcionalidade testável no browser.

---

## Fase 0 — Fundação ✅

> Domínio, persistência, layout store, tipos base.

- [x] Domain models (User, Category, ContentTree, TreeNode, ImageAsset, PriorityLevel)
- [x] Repository contracts + IndexedDB implementation (`db.ts` — 8 stores)
- [x] Platform capabilities, SW register
- [x] Layout store adaptativo (`layout.svelte.ts` — compact/expanded)
- [x] Shell adaptativo no `+layout.svelte` (sidebar desktop + bottom-nav mobile)
- [x] PriorityResolver (cadeia font→profile→root→3)
- [x] FeedSorter (agrupamento por prioridade + ordenação por data)
- [x] Documentação inicial: requirements, architecture, glossary, steps

---

## Fase 1 — Componentes UI + Svelte Stores Reativos ✅

> Instalar shadcn-svelte, criar stores reativos, testes iniciais.

- [x] Componentes shadcn-svelte: button, card, badge, input, select, dialog, separator, tabs, sheet, collapsible
- [x] Ícones Lucide no shell (Newspaper, Search, Star, CircleUser, FileStack, Eye)
- [x] Stores reativos: `consumer.svelte.ts`, `feed.svelte.ts`, `browse.svelte.ts`
- [x] vitest + jsdom + @testing-library/svelte
- [x] Testes unitários iniciais

---

## Fase 2 — Tela de Feed (`/`) ✅

> Core loop: mostrar posts priorizados.

- [x] PostCard, FeedList (infinite scroll via IntersectionObserver)
- [x] PriorityFilter (tabs: Todos, Alta, Média, Baixa)
- [x] Helpers de data (`formatRelativeDate`, `formatShortDate`)

---

## Fase 3 — Tela de Browse (`/browse`) ✅

> Navegação por categories oficiais para descobrir conteúdo.

- [x] Seed automático de categories
- [x] CategoryTree colapsável, TreeSelector (tabs por árvore)
- [x] EntityCard, EntityList (agrupados por tipo)
- [x] SearchBar com debounce
- [x] Rotas aninhadas: `/browse/creator/[id]`, `/browse/profile/[id]`, `/browse/font/[id]`, `/browse/node/[id]`

---

## Fase 4 — Tela de Library (`/library`) ✅

> Library com LibraryTabs (organização de nós ativados, many-to-many).

- [x] LibraryTab model (2 tabs sistema: 📚 "All Library" + ⭐ "Only Favorites" + tabs custom com emoji)
- [x] NodeActivation com `libraryTabIds[]` (many-to-many)
- [x] Store reativo `library.svelte.ts`
- [x] TabSidebar, TabDialog (create/edit/delete), LibraryItemList
- [x] Seleção em lote (long-press), bulk assign/desfavoritar
- [x] TabAssignmentDialog (tri-state checkboxes)

---

## Fase 4.5 — Componentização, UX e Navegação ✅

> Shared components, centralização de prioridade, navegação unificada.

- [x] Shared component layer: ConfirmDialog, ConfirmUnfavoriteDialog, TabDialog, PriorityButtons, PriorityBadge, FavoriteButton, priority.ts
- [x] Navegação unificada Browse ↔ Library via `baseHref` (ADR-018)
- [x] Sub-rotas de library espelhando Browse
- [x] `$state.snapshot()` para IndexedDB (ADR-019)
- [x] Confirmação obrigatória para desfavoritar (ADR-020)

---

## Fase 5 — Experiência Consumer: Subscribe/Follow, Multi-User, Import ✅

> Sistema Subscribe/Follow, multi-user, import de conteúdo.

- [x] activeUser store (multi-user com soft-delete/restore)
- [x] Subscribe/Follow components (SubscribeButton, FollowButton, ConfirmUnsubscribeDialog, ConfirmUnfollowDialog)
- [x] Nav condicional (consumer: 4 items / creator: 3 items)
- [x] Rota `/user` (CRUD de usuários, troca de identidade)
- [x] Import service (`importTreeExport()` + `importSimpleUrls()`)
- [x] Rota `/browse/import` (tabs Arquivo/URLs)

---

## Fase 6 — Experiência Creator: ContentTree CRUD + Publish ✅

> CRUD de ContentTrees com nós embarcados, publicação, preview.

- [x] ContentTree como aggregate root (TreeNode com NodeRole)
- [x] Creator store (`creator.svelte.ts`) — CRUD de trees e nodes
- [x] Rota `/pages` — lista e CRUD de ContentTrees
- [x] Rota `/pages/[id]` — edição com gerenciamento de nós e seções
- [x] Rota `/pages/new` — criação de nova ContentTree
- [x] Rota `/profiles` — gerenciamento de Profiles (TreeNode role='profile')
- [x] Rota `/profiles/[id]` — edição de Profile
- [x] Rota `/profiles/[id]/fonts` — lista de Fonts do Profile
- [x] Rota `/profiles/[id]/fonts/new` — criação de Font
- [x] Publish como snapshot versionado (TreePublication + TreeExport)
- [x] Preview para creators (`/preview` com sub-rotas)
- [x] Separação editorTrees / contentTrees no IndexedDB
- [x] Remoção de `/library` (creator placeholder), adição de `/preview`, `/library` agora é consumer (ADR-027)
- [x] ADRs 024–028

---

## Fase 6.5 — Taxonomia Expandida + i18n ✅

> 5 árvores de categories, sistema i18n completo, feed macros, entity filter.

### Taxonomia (5 árvores)
- [x] Expansão de 2 → 5 árvores: subject, content_type, media_type, region, language
- [x] Seed: `seed-media-type.ts`, `seed-region.ts`, `seed-language.ts`
- [x] Dados language com BCP 47: English (12 variantes), Spanish (22), French (15), Portuguese (10)
- [x] Campo `bcp47` em `Category` e `CategoryDataLeaf`
- [x] Esquema de IDs compacto (letras a-z, 2-5 chars)
- [x] Árvores de 3 níveis (region, language) com resolvers `threeLevel: true`

### i18n
- [x] Language type (`'en-US' | 'pt-BR'`), DEFAULT_LANGUAGE
- [x] Store reativo `i18n/store.svelte.ts` (module-level `$state`)
- [x] `t(key)` com interpolação `{varName}`
- [x] `tCat(categoryId)` com JSONs por árvore/idioma
- [x] Arquivos de tradução: `i18n/languages/category/{lang}/{tree}.json` (10 arquivos: 5 trees × 2 langs)
- [x] Traduções gerais: `en-US.json`, `pt-BR.json`

### Category Filter
- [x] Tri-state toggle (unselected → any → all)
- [x] `CategoryFilterMode = 'any' | 'all'`
- [x] `TreeModes = Record<CategoryTreeId, Map<string, CategoryFilterMode>>`
- [x] Factory `createCategoryFilter()` com instâncias isoladas (feed, browse)
- [x] ActiveCategoryBadges com indicadores visuais de modo
- [x] CategoryTreePicker com 5 árvores

### Feed Macros
- [x] FeedMacro type (`id`, `name`, `filters: FeedMacroFilters`)
- [x] `categoryModesByTree` para persistir modos any/all por tree
- [x] CRUD integrado em UserConsumer (embarcado em `feedMacros[]`)
- [x] UI de criação/edição/aplicação de macros no feed

### Entity Filter
- [x] Factory `createEntityFilter(source, options?)`
- [x] Dois níveis: page → font
- [x] Suporte a tree-links
- [x] Integrado no feed e browse

### Stores atualizados
- [x] `category-filter.svelte.ts` — TREE_IDS com 5 árvores + emptyTreeModes
- [x] `feed-macros.svelte.ts` — TREE_IDS com 5 árvores
- [x] `feed.svelte.ts` — `filteredByCategories()` com 5 trees + modos any/all
- [x] `browse.svelte.ts` — filtros com 5 trees

### UI Components atualizados
- [x] TreeSelector, CategoryFilter, CategoryTreePicker — 5 árvores
- [x] ActiveCategoryBadges — 5 árvores
- [x] FeedMacros — hasAnyFilter com 5 trees
- [x] FeedList — emptyTreeIds com 5 trees
- [x] Feed page (+page.svelte) — derived stores para todas as 5 trees
- [x] Detail pages ([id]/+page.svelte) — TREE_LABELS com 5 trees

---

## Fase 7 — PWA

> Primeiro target de distribuição.

- [ ] Service Worker com cache strategies (cache-first para assets, network-first para dados)
- [ ] Web App Manifest (ícones, display: standalone, theme_color)
- [ ] Install prompt na UI
- [ ] Notificações de novos posts (background)
- [ ] Lighthouse audit (alvo: PWA score 100)

---

## Fase 8 — Testes & Qualidade

> Estabilizar o app antes de empacotamento.

- [ ] Testes unitários para todos os stores reativos
- [ ] Testes de integração (ingestion → normalization → persistence)
- [ ] Testes de componente para telas críticas
- [ ] ESLint + Prettier configurados
- [ ] CI com GitHub Actions (build + test + check)

---

## Fase 9 — Desktop (Tauri)

> Segundo target de distribuição.

- [ ] Tauri init + configuração
- [ ] Bundles: MSI (Windows), AppImage + deb + Flatpak (Linux)
- [ ] System tray com menu de contexto
- [ ] Minimize-to-tray on close
- [ ] Auto-updater
- [ ] SQLite como alternativa a IndexedDB

---

## Fase 9.5 — Mobile (Tauri + TWA)

> Terceiro target de distribuição.

- [ ] TWA via Bubblewrap (wrapping da PWA hospedada)
- [ ] Tauri mobile build para Android (APK/AAB)
- [ ] Publicação na Google Play (TWA ou Tauri)
- [ ] Digital Asset Links para validação de domínio
- [ ] Deep links (`notfeed://`)

---

## Fase 10 — Ingestão + Feed Real

> Conectar a fontes reais.

- [ ] Ingestion clients (Nostr WebSocket, RSS fetch, Atom fetch)
- [ ] Normalizers (Nostr, RSS, Atom → CanonicalPost)
- [ ] Ingestion scheduler (polling + WebSocket)
- [ ] Timeline com scroll infinito usando posts reais
- [ ] Marcar posts como lidos
- [ ] Deduplicação de posts

---

## Fase 11 — Polish & UX

> Refinamentos pós-MVP.

- [ ] Dark mode toggle
- [ ] Onboarding flow (primeira execução)
- [ ] Virtualização de listas longas
- [ ] Acessibilidade (keyboard navigation, ARIA, focus management)
- [ ] Animações de transição
- [ ] Drag-and-drop para reordenar itens da library
