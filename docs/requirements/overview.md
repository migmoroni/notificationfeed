# Notfeed — Visão Geral

## O que é

Notfeed é um cliente de agregação de informação focado em feeds e notificações. Consome dados de múltiplos protocolos (Nostr, RSS, Atom, JSON Feed) e os apresenta em uma timeline unificada.

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
- **Persistência**: IndexedDB (`notfeed-v2`, v17) atrás da abstração `StorageBackend`
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
| `/browse/node/[id]` | Detalhe genérico de nó |
| `/library` | Library — nós ativados organizados em tabs |
| `/library/node/[id]` | Detalhe genérico de nó |
| `/user` | Configurações, CRUD de usuários, troca de identidade |

### Creator
| Rota | Descrição |
|---|---|
| `/pages` | Lista de ContentTrees do creator |
| `/pages/new` | Criar nova ContentTree |
| `/pages/[id]` | Editar ContentTree (CRUD de nós, seções) |
| `/preview` | Preview de trees publicadas (visão geral + feed) |
| `/preview/node/[id]` | Detalhe genérico de nó |

### Layout
- **Desktop** (≥900px): sidebar 295px + main scrollável
- **Mobile** (<900px): bottom nav 56px
- **Consumer nav**: Feed, Browse, Library, User
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
9. ✅ LibraryTabs (2 tabs sistema: 📚 All Library + ⭐ Only Favorites + custom)
10. ✅ Feed Macros (presets salvos com categories + modos)
11. ✅ Publish como snapshot versionado (TreePublication)
12. ✅ Preview para creators (visão geral + feed)
13. ✅ Layout adaptativo (compact/expanded via store reativo)
14. ✅ i18n (en-US + pt-BR) com tradução de categories
15. ✅ Entity filter centralizado (two-level selection)
16. ✅ Navegação unificada Browse ↔ Library via baseHref
17. ✅ Ingestão RSS / Atom / JSON Feed / Nostr com PostManager isomórfico (Plano B)
18. ✅ Per-user post boxes com backfill ao ativar fonte
19. ✅ Tiers de ociosidade e backoff configuráveis per-usuário
20. ✅ Conditional GET (ETag / Last-Modified) e FetcherState per-source
21. ✅ Pipeline de notificações com **dois canais independentes** consumidos pelo mesmo engine:
    - Canal 1 (posts): funil fixo de três etapas referenciando feed-macros (per_post / batch_macro / batch_global), com inbox in-app, OS notifications best-effort e click-routing (post URL ou `/?macro=<id>`).
    - Canal 2 (eventos de pipeline): consumo durável da fila `pipelineEvents` com `mode` (`realtime`/`batched`), `severityThreshold` e dedup por `(fontId, eventType)`; emite kinds `font_unstable`/`font_offline`/`font_recovered`/`font_degraded`/`font_source_switched`. Ver `docs/notification-system.md`.
22. ✅ Máquina de estados de ingestão em dois níveis (font: HEALTHY/RECOVERING/UNSTABLE/DEGRADED/OFFLINE; source: CLOSED/OPEN/HALF_OPEN) com três modos em camadas (Adaptive Fallback / Backoff Exponencial / Circuit Breaker) e `confidence` derivado. Ver `docs/ingestion-pipeline.md`.
23. ✅ Multi-protocolo por font: `FontBody.protocols: FontProtocolEntry[]` com primary + fallbacks; cada entry mantém circuit-breaker, backoff, EWMA e score independentes; promoção automática de fallback emite `SOURCE_SWITCHED`.

## Escopo futuro

- [ ] Periodic Background Sync / Background Sync handlers completos no SW
- [ ] PWA install prompt e Lighthouse audit
- [ ] Sincronização via Nostr/Blossom
- [ ] SqliteBackend completo (Plano C — Tauri bundles nativos)
