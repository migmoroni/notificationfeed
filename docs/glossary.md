# Notfeed — Glossário

| Termo | Definição |
|---|---|
| **UserBase** | Interface base de usuário. Campos: `id`, `role`, `displayName`, `profileImage`, `profileEmoji`, `removedAt`, `language`, `createdAt`, `updatedAt`. |
| **UserConsumer** | Conta local de consumo. Estende `UserBase` com `activateTrees` (inscrições em árvores), `activateNodes` (overrides por nó), `libraryTabs`, `feedMacros`, `profileImage`, `profileEmoji`, `language`. Nunca publica conteúdo. |
| **UserCreator** | Conta de criação. Estende `UserBase` com `ownedTreeIds[]` e `ownedMediaIds[]`. Gerencia ContentTrees e ContentMedias. |
| **ContentTree** | Aggregate root central do domínio. Estrutura com nós embarcados (`nodes: Record<string, TreeNode>`), mapeamento de posição (`paths: TreePaths`), divisões visuais (`sections: TreeSection[]`), e metadados (`metadata: ContentTreeMetadata`). Substitui o antigo conceito de CreatorPage. |
| **TreeNode** | Nó embarcado dentro de uma ContentTree. Contém `role` (NodeRole), `data.header` (NodeHeader) e `data.body` (NodeBody discriminado por role). Metadados em `metadata: TreeNodeMetadata`. |
| **NodeRole** | Papel de um TreeNode: `'profile'` (identidade editorial), `'font'` (fonte de dados), `'collection'` (coleção genérica/agregadora), `'tree'` (cross-link para outra árvore). |
| **NodeHeader** | Cabeçalho compartilhado por todos os nós. Campos: `title`, `subtitle?`, `summary?`, `coverMediaId?`, `coverEmoji?`, `bannerMediaId?`, `categoryAssignments[]`. |
| **NodeBody** | Union discriminada pelo `role`. Variantes: `ProfileBody` (links), `FontBody` (protocol, config, defaultEnabled), `CollectionBody` (links), `TreeLinkBody` (instanceTreeId). |
| **TreePaths** | Mapeamento de posição dos nós na árvore. `'/'` = root nodeId, `'*'` = nodeIds sem seção, `[sectionId]` = nodeIds na seção. |
| **TreeSection** | Divisão visual de uma ContentTree. Campos: `id`, `order`, `symbol?`, `title`, `hideTitle`, `color`. |
| **ContentTreeMetadata** | Metadados da árvore: `id`, `versionSchema`, `createdAt`, `updatedAt`, `author?`, `authorTreeId?`, `removedAt?`. |
| **NodeActivation** | Objeto embarcado em `UserConsumer.activateNodes[]` que registra o estado local do consumer por nó. Campos: `nodeId` (composite), `priority`, `favorite`, `enabled`, `libraryTabIds[]`. Substitui o antigo ConsumerState. |
| **TreeActivation** | Objeto em `UserConsumer.activateTrees[]` que registra inscrição em uma árvore inteira. Campos: `treeId`, `activatedAt`. |
| **Category** | Sistema taxonômico hierárquico oficial. Cinco árvores: `subject` (tema), `content_type` (formato), `media_type` (mídia), `region` (geografia), `language` (idioma). Campos: `id`, `label`, `treeId`, `parentId`, `depth`, `order`, `bcp47?`. Distribuída com o app via seed. Apenas sublevels (depth ≥ 1) são associáveis a nós. |
| **CategoryTreeId** | Identificador de árvore taxonômica: `'subject' \| 'content_type' \| 'region' \| 'media_type' \| 'language'`. |
| **CategoryAssignment** | Value object `{ treeId, categoryIds[] }` que vincula um nó a até 3 sublevels dentro de uma tree. Armazenado em `NodeHeader.categoryAssignments`. |
| **CategoryFilterMode** | Modo de filtro por category: `'any'` (OR — match qualquer selecionada) ou `'all'` (AND — match todas selecionadas). |
| **TreeModes** | `Record<CategoryTreeId, Map<string, CategoryFilterMode>>` — estado de filtro de categories por árvore, mapeando cada categoryId ao seu modo. |
| **BCP 47** | Padrão de tags de idioma (ex: `en-US`, `pt-BR`). Usado no campo `bcp47` das categories da árvore `language`. |
| **LibraryTab** | Tab custom criada pelo usuário para organizar entidades na biblioteca. Campos: `id`, `title`, `emoji`, `position`, `createdAt`. Embarcada em `UserConsumer.libraryTabs[]`. Tabs de sistema (📚 "All Library", ⭐ "Only Favorites") são constantes do app (`SYSTEM_LIBRARY_TABS`), não persistidas no usuário. Relação many-to-many com nós via `libraryTabIds[]` no NodeActivation. |
| **FeedMacro** | Preset salvo de filtros do feed. Campos: `id`, `name`, `filters: FeedMacroFilters`. Embarcado em `UserConsumer.feedMacros[]`. |
| **FeedMacroFilters** | Configuração de filtros de um macro. Campos: `nodeIds[]`, `categoryIdsByTree` (Record por tree), `categoryModesByTree?` (Record de categoryId → mode). |
| **Font** | TreeNode com `role='font'`. Canal técnico de distribuição que encapsula a configuração de um protocolo (Nostr, RSS ou Atom). Body: `FontBody { protocol, config, defaultEnabled }`. |
| **FontProtocol** | Protocolo de uma font: `'nostr' \| 'rss' \| 'atom'`. |
| **FontConfig** | Union de configuração por protocolo: `FontNostrConfig { relays[], pubkey, kinds? }`, `FontRssConfig { url }`, `FontAtomConfig { url }`. |
| **Profile** | TreeNode com `role='profile'`. Identidade temática/editorial que agrupa Fonts. Body: `ProfileBody { links: ExternalLink[] }`. Categories via `NodeHeader.categoryAssignments`. |
| **ExternalLink** | Value object `{ title, url }` usado em ProfileBody e CollectionBody. |
| **TreeExport** | Snapshot JSON autocontido de uma ContentTree. Campos: `exportId`, `version`, `exportedAt`, `creatorDisplayName`, `tree: ContentTree`, `medias: ContentMedia[]`. Formato do `.notfeed.json`. |
| **TreePublication** | Metadado de publicação persistido. Campos: `treeId`, `version`, `snapshot: TreeExport`, `publishedAt`. Store dedicado `treePublications`. |
| **ContentMedia** | Objeto de mídia externo associado a uma árvore. Persistido em `contentMedias` / `editorMedias`. |
| **ImageAsset** | Value object para imagens armazenadas. Campos: `data`, `width`, `height`, `originalFormat`, `slot` (`'avatar' \| 'banner'`). Todo upload é convertido para WEBP. Avatar: ≤512×512. Banner: ≤1600×600. |
| **PriorityLevel** | Nível de prioridade definido pelo consumer: `1` (alta), `2` (média), `3` (baixa). `null` = herdar do nível pai. Cadeia: font node → profile node → root node → 3 (default). |
| **Post Canônico** | Representação normalizada e protocol-agnostic de um item de feed. Todo dado ingerido é convertido para este formato antes de persistência e exibição. |
| **Ingestão** | Processo de buscar dados brutos de uma Font (via WebSocket para Nostr, HTTP para RSS/Atom). |
| **Normalização** | Transformação de dados brutos (Nostr event, RSS item, Atom entry) para o formato de Post Canônico. |
| **Persistência** | Armazenamento local de dados em IndexedDB (`notfeed-v2`, version 5). 8 stores: `contentTrees`, `contentMedias`, `editorTrees`, `editorMedias`, `treePublications`, `users`, `posts`, `categories`. |
| **Capability** | Feature flag booleana que indica se uma funcionalidade está disponível na plataforma atual (ex: `hasTray`, `hasPush`). |
| **Language** | Tipo i18n: `'en-US' \| 'pt-BR'`. Define o idioma da interface. Store reativo `i18n/store.svelte.ts` com `$state` module-level. `DEFAULT_LANGUAGE = 'en-US'`. |
| **t()** | Função de tradução. Busca chave no dicionário do idioma ativo com suporte a interpolação `{varName}`. Reativa automaticamente via runes do Svelte 5. |
| **tCat()** | Função de tradução para labels de categories. Usa arquivos JSON separados por árvore e idioma (ex: `i18n/languages/category/en-US/subject.json`). |
| **EntityFilter** | Filtro centralizado de entidades. Factory `createEntityFilter(source, options?)`. Seleção em dois níveis: page (root) → font (refinamento). `EntityFilterPageType = 'font' \| 'profile' \| 'collection'`. |
| **PWA** | Progressive Web App — site instalável com suporte offline via Service Worker. |
| **TWA** | Trusted Web Activity — wrapper Android que exibe uma PWA em tela cheia sem barra de endereço. |
| **Tauri** | Framework para criar aplicações desktop nativas usando web technologies + Rust. |
| **Relay** | Servidor Nostr que armazena e retransmite eventos. Fonts Nostr se conectam a relays via WebSocket. |
| **Blossom** | Protocolo para armazenamento de arquivos vinculado a identidades Nostr. Usado para sincronizar ContentTrees online. |
| **LayoutMode** | Modo de layout adaptativo (`compact` para mobile/janela pequena, `expanded` para desktop/janela grande). Determinado pelo store `layout.svelte.ts` a partir de `window.innerWidth` (breakpoint: 900px). |
| **InputCapability** | Tipo de input detectado (`touch`, `pointer`, `hybrid`). Refinamento para interações — não altera o layout mode. |
| **FeedSorter** | Algoritmo de ordenação do feed: agrupa por prioridade (1→2→3), ordena por data dentro de cada grupo. Posts de prioridade alta sempre aparecem antes, mesmo que mais antigos. |
| **SharedComponents** | Camada `$lib/components/shared/` com componentes reutilizáveis: `ConfirmDialog`, `ConfirmUnfavoriteDialog`, `ConfirmUnsubscribeDialog`, `ConfirmUnfollowDialog`, `TabDialog`, `PriorityButtons`, `PriorityBadge`, `FavoriteButton`, `SubscribeButton`, `FollowButton`, `priority.ts`. |
| **PriorityButtons** | Componente shared com toggle group de 3 níveis. Tamanhos: `sm` (cards) e `md` (pages). Configurado via `priority.ts`. |
| **PriorityBadge** | Componente shared que exibe badge de prioridade com variant e label do `PRIORITY_MAP`. |
| **FavoriteButton** | Componente shared com toggle star. Tamanhos: `sm` (size-6, cards) e `md` (size-5, pages). |
| **ConfirmDialog** | Componente base genérico para confirmações. Aceita `icon` snippet, `title`, `description`, `confirmVariant`. Wrappers especializados herdam dele. |
| **TabDialog** | Componente unificado para CRUD de tabs. 3 modes: `create` (FolderPlus), `edit` (FolderPen), `delete` (Bookmark+Trash2). Cada modo com ícone, título e comportamento únicos. |
| **baseHref** | Prop de componentes de página que define o prefixo de URL para links internos. Permite reutilizar o mesmo componente em `/browse` e `/library`. |
| **SubscribeButton** | Componente shared para toggle de inscrição em nós creator. UI: "Inscrito" (verde, UserCheck) / "Inscrever-se" (muted, UserPlus). Mapeia para `NodeActivation.enabled`. |
| **FollowButton** | Componente shared para toggle de seguir nós profile/font. UI: "Segue" (azul, Eye) / "Seguir" (muted, EyeOff). Mapeia para `NodeActivation.enabled`. |
| **ConfirmUnsubscribeDialog** | Dialog de confirmação para cancelar inscrição. Usa UserMinus + variante destrutiva. |
| **ConfirmUnfollowDialog** | Dialog de confirmação para deixar de seguir. Usa EyeOff + variante destrutiva. |
| **activeUser** | Store reativo (`active-user.svelte.ts`) que gerencia identidade ativa (consumer ou creator). Controla nav condicional. API: `init()`, `switchTo()`, `createConsumer()`, `createCreator()`. Suporta soft-delete/restore. |
| **ImportService** | Serviço (`import.service.ts`) para importar conteúdo. Dois modos: `importTreeExport()` (arquivo .notfeed.json completo) e `importSimpleUrls()` (URLs avulsas → ContentTree com profile + font nodes). |
| **Composite Node ID** | Formato `treeId:localUuid` que garante unicidade global de nós. Parseado via `parseTreeId()`. |
| **uuidv7** | Gerador de UUID v7 ordenado por timestamp. Usado para IDs de entidades e nós. || **StorageBackend** | Interface da camada de persistência em `$lib/persistence/backends/storage-backend.ts`. Define o conjunto fixo de stores (`contentTrees`, `contentMedias`, `editorTrees`, `editorMedias`, `treePublications`, `users`, `posts`, `categories`, `activityData`) e a API de cada store via `StoreOps`. Implementada por `IndexedDBBackend` (ativa) e `SqliteBackend` (stub para Plano C). |
| **IndexedDBBackend** | Implementação ativa de `StorageBackend` em `indexeddb.backend.ts`. Usa o DB `notfeed-v2`. Cobre web, PWA, Android TWA e Tauri AppImage Linux. |
| **SqliteBackend** | Stub de `StorageBackend` em `sqlite.backend.ts`. Será preenchido no Plano C usando `tauri-plugin-sql` para os bundles Tauri nativos (deb/rpm/msi/dmg/android). Lança erro útil até lá. |
| **Capability.platform** | Runtime ativo: `'web' \| 'android' \| 'desktop'`. Detectado via `__TAURI_INTERNALS__` (desktop) ou display-mode standalone + UA Android (TWA). |
| **Capability.storageBackend** | Backend de armazenamento ativo: `'indexeddb' \| 'sqlite'`. Lido de `import.meta.env.VITE_STORAGE_BACKEND` (default `'indexeddb'`). |
| **Capability.hasBackgroundSync** | Indica se o navegador suporta a Background Sync API (`'sync' in ServiceWorkerRegistration.prototype`). Usada pelo Plano B para reagendar ingestão ao reconectar. |
| **Capability.hasPeriodicSync** | Indica se o navegador suporta Periodic Background Sync (`'periodicSync' in ServiceWorkerRegistration.prototype`). Usada pelo Plano B para tick de ingestão recorrente em PWA instalada. |
