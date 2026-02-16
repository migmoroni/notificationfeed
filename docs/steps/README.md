# Notfeed — Passos de Desenvolvimento

Guia sequencial para construção do app. Cada fase entrega funcionalidade testável.
Verificação por fase: `npm run build` limpo + funcionalidade testável no browser.

---

## Fase 0 — Fundação ✅

> Domínio, persistência, ingestão, normalização, layout store.

- [x] Domain models completos (User, CreatorPage, Profile, Font, Category, ConsumerState)
- [x] Repository contracts + IndexedDB implementations (7 stores)
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

## Fase 1 — Componentes UI + Svelte Stores Reativos

> Instalar shadcn-svelte, criar stores reativos, substituir placeholders por ícones.

### Tarefas

- [ ] Instalar componentes shadcn-svelte:
  ```bash
  npx shadcn-svelte@latest add button card badge input select dialog separator tabs sheet
  ```
- [ ] Substituir emojis no layout por ícones Lucide (`House`, `Search`, `Star`, `Settings`)
- [ ] Criar `src/lib/stores/consumer.svelte.ts`
  - `$state` com UserConsumer ativo
  - Wraps `user-consumer.store.ts`
  - Actions: `init()`, `setPriority()`, `setFavorite()`, `toggleEnabled()`
- [ ] Criar `src/lib/stores/feed.svelte.ts`
  - `$state` com posts carregados
  - `$derived` com posts priorizados (usa `buildPriorityMap` + `sortByPriority`)
  - Actions: `loadFeed()`, `markRead()`, `refreshFeed()`
- [ ] Criar `src/lib/stores/browse.svelte.ts`
  - `$state` com categories e resultados de navegação
  - Actions: `loadCategories()`, `selectCategory()`, `searchEntities()`
- [ ] Criar `src/lib/stores/favorites.svelte.ts`
  - `$derived` filtrando ConsumerState onde `favorite === true`
  - Resolve entidades referenciadas (Page/Profile/Font)
- [ ] Criar `src/lib/utils/mock-data.ts` — dados fake para desenvolvimento
- [ ] Instalar vitest + @testing-library/svelte
  ```bash
  npm install -D vitest @testing-library/svelte jsdom
  ```
- [ ] Configurar `vitest.config.ts`
- [ ] Testes unitários: `priority-resolver.test.ts`, `feed-sorter.test.ts`
- [ ] `npm run build` limpo

### Entregáveis

- Componentes shadcn-svelte disponíveis em `$lib/components/ui/`
- Stores reativos funcionais
- Ícones Lucide no shell
- Testes passando

---

## Fase 2 — Tela de Feed (`/`)

> Core loop: mostrar posts priorizados com infinite scroll.

### Tarefas

- [ ] Componente `PostCard.svelte`
  - Título, autor, data relativa, excerpt
  - Badge de prioridade (colorido: vermelho/amarelo/cinza)
  - Indicador lido/não-lido
  - Ação: marcar como lido
- [ ] Componente `FeedList.svelte`
  - Infinite scroll via IntersectionObserver
  - Consome `feed.store` (posts priorizados)
  - Loading state (skeleton cards)
  - Empty state ("Nenhum post ainda")
- [ ] Componente `PriorityFilter.svelte`
  - Chips/tabs: Todos, Alta, Média, Baixa
  - Filtra posts por nível de prioridade
- [ ] Iniciar ingestion no `onMount` do layout
  - Buscar fonts ativas → `startIngestion()` para cada
  - Posts ingeridos → `savePosts()` → atualiza feed store
- [ ] Testes de componente (`PostCard`, `FeedList`)
- [ ] `npm run build` limpo

### Entregáveis

- Feed funcional mostrando posts ordenados por prioridade
- Infinite scroll
- Filtro por prioridade
- Posts marcados como lidos

---

## Fase 3 — Tela de Browse (`/browse`)

> Navegação por categories standard para descobrir conteúdo.

### Tarefas

- [ ] Criar `seedStandardCategories()` em `src/lib/persistence/seed.ts`
  - Árvore fixa de categories padrão (Tech, News, Science, etc.)
  - Executar no primeiro uso (verificar se já existe)
- [ ] Componente `CategoryTree.svelte`
  - Árvore colapsável (root → sublevels)
  - Indicador de contagem de entidades por sublevel
- [ ] Componente `EntityCard.svelte`
  - Card para Page/Profile/Font
  - Avatar, título, tags, tipo (badge)
  - Ações inline:
    - Definir prioridade (select 1/2/3)
    - Toggle favorito (ícone estrela)
- [ ] Componente `EntityList.svelte`
  - Lista de entidades filtradas por category sublevel
  - Drill-down: category → pages → profiles → fonts
- [ ] Preview de posts de um Font selecionado
- [ ] Testes de componente
- [ ] `npm run build` limpo

### Entregáveis

- Navegação por categories standard
- Definição de prioridade e favorito inline
- Drill-down funcional

---

## Fase 4 — Tela de Favoritos (`/favorites`)

> Lista agrupada de entidades favoritadas pelo consumer.

### Tarefas

- [ ] Componente `FavoritesList.svelte`
  - Agrupado por tipo: CreatorPages, Profiles, Fonts
  - Reutiliza `EntityCard.svelte`
- [ ] Ajuste de prioridade inline (mesmo select do browse)
- [ ] Toggle favorito (remover da lista)
- [ ] Ação: ver posts de um Font favorito (navega ao feed filtrado)
- [ ] Empty state ("Nenhum favorito ainda")
- [ ] `npm run build` limpo

### Entregáveis

- Lista de favoritos funcional
- Prioridade ajustável inline
- Navegação rápida para feed de um font

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

## Fase 10 — Categories Custom + Polish

> Funcionalidades pós-MVP.

### Tarefas

- [ ] CRUD de categories custom (consumer-only)
- [ ] Organização por custom categories no browse
- [ ] Dark mode toggle (respeitar `prefers-color-scheme`)
- [ ] Onboarding flow (primeira execução: criar consumer, explicar conceitos)
- [ ] Performance: virtualização de listas longas (>100 posts)
- [ ] Acessibilidade: keyboard navigation, ARIA labels, focus management
- [ ] Animações de transição entre compact/expanded

### Entregáveis

- Categories custom funcionais
- Polish de UX
- Acessibilidade completa
