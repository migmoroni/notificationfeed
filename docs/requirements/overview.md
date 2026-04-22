# Notfeed — Visão Geral

## O que é

Notfeed é um cliente de agregação de informação focado em feeds e notificações. Consome dados de múltiplos protocolos (Nostr, RSS, Atom) e os apresenta em uma timeline unificada.

## Princípios

- **Client-side first** — toda lógica roda no dispositivo do usuário; sem backend obrigatório.
- **Dois papéis de usuário** — UserConsumer (consome feeds) e UserCreator (publica ContentTrees).
- **ContentTree como artefato** — Profiles, Fonts e outros nós são embarcados em ContentTrees publicáveis.
- **Protocol-agnostic display** — posts de qualquer fonte são normalizados para um formato canônico antes de exibição.
- **Resiliente e offline-capable** — persistência local, funciona sem conexão. Export/import JSON para compartilhamento offline.
- **Mobile-first UI** — desenhado para telas pequenas, adaptado para desktop.
- **Multilíngue** — interface traduzida (en-US, pt-BR) com sistema i18n reativo.

## Plataformas-alvo

| Plataforma | Tecnologia | Artefato |
|---|---|---|
| Web / PWA | SvelteKit (adapter-static) | Estáticos + Service Worker |
| Android | TWA (Trusted Web Activity) | APK/AAB |
| Windows Desktop | Tauri v2 | `.msi` |
| Linux Desktop | Tauri v2 | `.AppImage` |

## Stack técnico

- **Framework**: SvelteKit (SPA mode, adapter-static)
- **Svelte**: Svelte 5 com runes ($state, $derived, $props, $effect)
- **UI**: Tailwind CSS 4 + shadcn-svelte (bits-ui)
- **Desktop**: Tauri v2
- **Persistência**: IndexedDB (`notfeed-v2`, v5)
- **Linguagem**: TypeScript
- **i18n**: Sistema próprio reativo com `$state` module-level
- **Ícones**: Lucide (via @lucide/svelte)

## Entidades do domínio

- **UserConsumer** — conta local de consumo (ativações de árvores/nós, favoritos, macros)
- **UserCreator** — conta de criação (gerencia ContentTrees e ContentMedias)
- **ContentTree** — aggregate root: árvore com nós embarcados (TreeNode) de múltiplos papéis
- **TreeNode** — nó embarcado: Profile, Font, Creator, Collection, ou Tree (link)
- **Category** — taxonomia hierárquica oficial, 5 árvores (subject, content_type, media_type, region, language)
- **FeedMacro** — preset salvo de filtros do feed (nós + categories por tree + modos any/all)
- **TreeExport** — snapshot JSON para export/import offline (.notfeed.json)
- **TreePublication** — metadado de publicação com snapshot versionado
- **ContentMedia** — objeto de mídia associado a uma árvore

## Rotas

### Consumer
| Rota | Descrição |
|---|---|
| `/` | Feed — timeline unificada com filtros, macros, entity filter, category filter |
| `/browse` | Browse — navegação por árvores com filtros de category e busca |
| `/browse/import` | Import — upload de .notfeed.json ou URLs simples |
| `/browse/creator/[id]` | Detalhe de nó creator |
| `/browse/profile/[id]` | Detalhe de nó profile |
| `/browse/font/[id]` | Detalhe de nó font |
| `/browse/node/[id]` | Detalhe genérico de nó |
| `/favorites` | Favoritos — tabs com nós favoritados |
| `/favorites/creator/[id]` | _(espelha /browse)_ |
| `/favorites/profile/[id]` | _(espelha /browse)_ |
| `/favorites/font/[id]` | _(espelha /browse)_ |
| `/user` | Configurações, CRUD de usuários, troca de identidade |

### Creator
| Rota | Descrição |
|---|---|
| `/pages` | Lista de ContentTrees do creator |
| `/pages/new` | Criar nova ContentTree |
| `/pages/[id]` | Editar ContentTree (CRUD de nós, seções) |
| `/profiles` | Lista de Profiles |
| `/profiles/[id]` | Editar Profile |
| `/profiles/[id]/fonts` | Lista de Fonts do Profile |
| `/profiles/[id]/fonts/new` | Criar nova Font |
| `/preview` | Preview de trees publicadas (visão geral + feed) |
| `/preview/creator/[id]` | _(espelha /browse)_ |

### Layout
- **Desktop** (≥900px): sidebar 295px + main scrollável
- **Mobile** (<900px): bottom nav 56px
- **Consumer nav**: Feed, Browse, Favorites, User
- **Creator nav**: Pages, Preview, User

## Escopo implementado

1. ✅ Criação de UserConsumer e UserCreator (multi-user, soft-delete/restore)
2. ✅ CRUD de ContentTrees com nós embarcados (creator)
3. ✅ CRUD de Profiles e Fonts como TreeNodes
4. ✅ Sistema de Categories (5 árvores oficiais, seed automático, i18n)
5. ✅ Filtro de categories com modos any/all (tri-state toggle)
6. ✅ Import dual-mode (.notfeed.json + URLs simples)
7. ✅ Ativação/desativação granular por nó (NodeActivation)
8. ✅ Feed prioritizado (3 níveis com herança por árvore de nós)
9. ✅ FavoriteTabs (many-to-many, tab sistema ⭐ + custom)
10. ✅ Feed Macros (presets salvos com categories + modos)
11. ✅ Publish como snapshot versionado (TreePublication)
12. ✅ Preview para creators (visão geral + feed)
13. ✅ Layout adaptativo (compact/expanded via store reativo)
14. ✅ i18n (en-US + pt-BR) com tradução de categories
15. ✅ Entity filter centralizado (two-level selection)
16. ✅ Navegação unificada Browse ↔ Favorites via baseHref

## Escopo futuro

- [ ] Ingestão de posts via Nostr, RSS e Atom
- [ ] Normalização para Post Canônico
- [ ] Timeline com scroll infinito
- [ ] Marcar posts como lidos
- [ ] PWA instalável com suporte offline
- [ ] Sincronização via Nostr/Blossom
- [ ] SQLite para Tauri (desktop)
