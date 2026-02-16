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

## ADR-004: IndexedDB como persistência padrão (MVP)

**Contexto**: Precisamos de storage local que funcione em todas as plataformas web.  
**Decisão**: IndexedDB no MVP. SQLite via Tauri plugin como melhoria futura para desktop.  
**Consequência**: Funciona em PWA, TWA e Tauri (via webview). Migration path para SQLite é isolada em `db.ts`.

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
**Decisão**: `UserConsumer` e `UserCreator` como entidades separadas, ambas estendendo `UserBase`. Consumer não exige keypair; Creator carrega `NostrKeypair` e status de sincronização.  
**Consequência**: Regras de negócio podem ser aplicadas por papel. Custom categories pertencem exclusivamente ao Consumer. Publicação Nostr restrita ao Creator.

## ADR-008: CreatorPage como artefato publicável

**Contexto**: Um Creator precisa de uma unidade editorial que agrupe Profiles e possa ser publicada (Nostr/Blossom) ou compartilhada offline.  
**Decisão**: `CreatorPage` com avatar/banner (WEBP), tags, referência Nostr+Blossom, e `syncStatus` ('local' | 'synced' | 'exported' | 'imported').  
**Consequência**: CreatorPages são a unidade de follow para Consumers. Export/import offline via `.notfeed.json`.

## ADR-009: Taxonomia hierárquica com dois ramos (Standard / Custom)

**Contexto**: Precisamos organizar conteúdo por tema, mas sem impor rigidez.  
**Decisão**: `Category` com dois ramos: `standard` (fixo) e `custom` (livre, propriedade do Consumer). Apenas sublevels (depth ≥ 1) vinculam-se a Profiles.  
**Consequência**: Creators usam categories standard. Consumers adicionam organização pessoal via custom categories. Categories raiz são somente agrupadores.

## ADR-010: Política de imagem WEBP

**Contexto**: Múltiplos formatos de imagem complicam armazenamento e exibição.  
**Decisão**: Toda imagem armazenada é WEBP. Upload aceita SVG/PNG/JPEG/GIF/WEBP; conversão automática para WEBP no cliente. Avatar ≤ 512×512, Banner ≤ 1600×600.  
**Consequência**: `ImageAsset` como value object único. Pipeline de conversão no frontend via Canvas API.

## ADR-011: Export/Import offline de CreatorPages

**Contexto**: Creators podem querer compartilhar suas páginas sem conexão Nostr.  
**Decisão**: `PageExport` — JSON completo (CreatorPage + Profiles + Fonts como snapshots) salvo como `.notfeed.json`. Consumer pode importar diretamente.  
**Consequência**: Portabilidade total. `syncStatus` = 'exported' na origem, 'imported' no destino. QR code e file sharing como canais de distribuição.

## ADR-012: ConsumerState para overrides locais

**Contexto**: Consumers precisam ativar/desativar entidades individuais e organizar em custom categories sem alterar os dados do Creator.  
**Decisão**: `ConsumerState` — value object que registra overrides locais (`enabled`, `customCategoryId`) por entidade (CreatorPage, Profile, Font).  
**Consequência**: Dados do Creator ficam imutáveis. Toda personalização é armazenada como estado local do Consumer.

## ADR-013: Layout adaptativo via store reativo (não CSS-only)

**Contexto**: O app roda em mobile (PWA/TWA), desktop (Tauri/browser), e tablets. Precisamos de UI diferente mas sem builds separados ou UA parsing.  
**Decisão**: Store reativo `layout.svelte.ts` com `$state` (Svelte 5). Detecção baseada em `window.innerWidth` (< 900px = compact, ≥ 900px = expanded). `pointer: coarse` e `hover: none` refinam mas nunca substituem a largura. Atualiza via `resize`, `orientationchange`, e `matchMedia.change`.  
**Consequência**: Uma única fonte de verdade. Componentes consomem `layout.mode` — nunca recalculam. Tailwind breakpoints complementam para detalhes visuais, mas o store governa a estrutura (sidebar vs bottom-nav, grid vs stack).

## ADR-014: Feed prioritizado com herança de prioridade (Consumer-scoped)

**Contexto**: Consumers precisam controlar a relevância de fontes no feed sem alterar dados do Creator.  
**Decisão**: `ConsumerState` ganha `priority: PriorityLevel | null` (1=alta, 2=média, 3=baixa) e `favorite: boolean`. Cadeia de herança: Font → Profile → CreatorPage → 3 (default). `null` = herdar. O feed agrupa por prioridade e ordena por data dentro de cada grupo.  
**Consequência**: Posts de prioridade 1 sempre aparecem antes de prioridade 2, independente da data. Toda personalização é per-consumer, armazenada em `ConsumerState`.
