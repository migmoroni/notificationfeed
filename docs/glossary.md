# Notfeed — Glossário

| Termo | Definição |
|---|---|
| **UserConsumer** | Conta local de consumo. Segue CreatorPages/Creators, organiza feeds, ativa/desativa entidades. Nunca publica conteúdo. |
| **UserCreator** | Conta de criação. Gerencia CreatorPages, Profiles e Fonts. Pode sincronizar via Nostr/Blossom. |
| **CreatorPage** | Artefato publicável que descreve uma coleção editorial de Profiles e Fonts. Vinculada a um UserCreator. Profiles vinculados são entidades dependentes (filhos do agregado). Pode ser exportada como JSON para compartilhamento offline. |
| **Profile** | Identidade temática que agrupa Fonts. Dois modos de ciclo de vida: **standalone** (`creatorPageId=null`) — aggregate root independente, navegado em `/browse/profile/{id}`; **dependente** (`creatorPageId` definido) — entidade filha do agregado CreatorPage, navegado em `/browse/creator/{pageId}/profile/{id}`. Associado a até 3 sublevels por tree via `CategoryAssignment`. |
| **Font** | Canal técnico de distribuição vinculado a um Profile. Encapsula a configuração de um protocolo (Nostr, RSS ou Atom). Herda Category do Profile. O nome "Font" vem de "fonte de informação". |
| **Category** | Sistema taxonômico hierárquico oficial. Duas árvores: `subject` (tema) e `content_type` (formato). Distribuído com o app via seed versionado. Apenas sublevels (depth ≥ 1) são associáveis a entidades. |
| **CategoryAssignment** | Value object `{ treeId, categoryIds[] }` que vincula um Profile a até 3 sublevels dentro de uma tree. Substitui o antigo `categoryId` singular. |
| **CategoryTreeId** | Identificador de árvore taxonômica: `'subject'` ou `'content_type'`. |
| **ConsumerState** | Value object que sobrepõe o `defaultEnabled` do criador para o contexto local do consumer. Inclui `priority`, `favorite`, e `favoriteTabIds` (array de IDs de tabs às quais o item pertence, many-to-many). |
| **FavoriteTab** | Tab para organizar entidades favoritadas. Tab de sistema ⭐ "Todos" (não deletável). Usuário pode criar tabs custom com emoji + título. Relação many-to-many com entidades via `favoriteTabIds` no ConsumerState. Deletar uma tab remove a associação (não desfavorita). |
| **FollowRef** | Value object que registra a intenção do consumer de seguir uma CreatorPage ou UserCreator. Fluxo unidirecional. |
| **ImageAsset** | Value object para imagens armazenadas. Todo upload é convertido para WEBP. Avatar: ≤512×512. Banner: ≤1600×600. |
| **PageExport** | Snapshot JSON autocontido de uma CreatorPage (Page + Profiles + Fonts + imagens). Para compartilhamento offline via `.notfeed.json`. |
| **Post Canônico** | Representação normalizada e protocol-agnostic de um item de feed. Todo dado ingerido é convertido para este formato antes de persistência e exibição. |
| **Ingestão** | Processo de buscar dados brutos de uma Font (via WebSocket para Nostr, HTTP para RSS/Atom). |
| **Normalização** | Transformação de dados brutos (Nostr event, RSS item, Atom entry) para o formato de Post Canônico. |
| **Persistência** | Armazenamento local de dados em IndexedDB ou SQLite. |
| **Capability** | Feature flag booleana que indica se uma funcionalidade está disponível na plataforma atual (ex: `hasTray`, `hasPush`). |
| **PWA** | Progressive Web App — site instalável com suporte offline via Service Worker. |
| **TWA** | Trusted Web Activity — wrapper Android que exibe uma PWA em tela cheia sem barra de endereço. |
| **Tauri** | Framework para criar aplicações desktop nativas usando web technologies + Rust. |
| **Relay** | Servidor Nostr que armazena e retransmite eventos. Fonts Nostr se conectam a relays via WebSocket. |
| **Blossom** | Protocolo para armazenamento de arquivos vinculado a identidades Nostr. Usado para sincronizar CreatorPages online. |
| **PriorityLevel** | Nível de prioridade definido pelo consumer (1=alta, 2=média, 3=baixa). `null` = herdar do nível pai. Cadeia: Font→Profile→CreatorPage→3. |
| **LayoutMode** | Modo de layout adaptativo (`compact` para mobile/janela pequena, `expanded` para desktop/janela grande). Determinado pelo store `layout.svelte.ts` a partir de `window.innerWidth` (breakpoint: 900px). |
| **InputCapability** | Tipo de input detectado (`touch`, `pointer`, `hybrid`). Refinamento para interações — não altera o layout mode. |
| **Favorito** | Flag booleana em `ConsumerState` que marca uma entidade (Page/Profile/Font) para acesso rápido. Favoritos podem ser organizados em `FavoriteTab`s (⭐ Todos por padrão). Desfavoritar requer confirmação via `ConfirmUnfavoriteDialog`. |
| **FeedSorter** | Algoritmo de ordenação do feed: agrupa por prioridade (1→2→3), ordena por data dentro de cada grupo. Posts de prioridade alta sempre aparecem antes, mesmo que mais antigos. |
| **SharedComponents** | Camada `$lib/components/shared/` com componentes reutilizáveis: `ConfirmDialog` (base genérica), `ConfirmUnfavoriteDialog`, `ConfirmUnsubscribeDialog`, `ConfirmUnfollowDialog`, `TabDialog` (3 modes: create/edit/delete), `PriorityButtons`, `PriorityBadge`, `FavoriteButton`, `SubscribeButton`, `FollowButton`, `priority.ts` (config centralizada). |
| **PriorityButtons** | Componente shared com toggle group de 3 níveis. Tamanhos: `sm` (cards) e `md` (pages). Configurado via `priority.ts`. |
| **PriorityBadge** | Componente shared que exibe badge de prioridade com variant e label do `PRIORITY_MAP`. |
| **FavoriteButton** | Componente shared com toggle star. Tamanhos: `sm` (size-6, cards) e `md` (size-5, pages). |
| **ConfirmDialog** | Componente base genérico para confirmações. Aceita `icon` snippet, `title`, `description`, `confirmVariant`. Wrappers especializados herdam dele. |
| **TabDialog** | Componente unificado para CRUD de tabs. 3 modes: `create` (FolderPlus), `edit` (FolderPen), `delete` (Bookmark+Trash2). Cada modo com ícone, título e comportamento únicos. |
| **baseHref** | Prop de componentes de página (`CreatorPage`, `ProfilePage`) que define o prefixo de URL para links internos. Permite reutilizar o mesmo componente em `/browse` e `/favorites`. |
| **SubscribeButton** | Componente shared para toggle de inscrição em CreatorPages. UI: "Inscrito" (verde, UserCheck) / "Inscrever-se" (muted, UserPlus). Mapeia para `ConsumerState.enabled`. Tamanhos: `sm` e `md`. |
| **FollowButton** | Componente shared para toggle de seguir Profiles/Fonts. UI: "Segue" (azul, Eye) / "Seguir" (muted, EyeOff). Mapeia para `ConsumerState.enabled`. Tamanhos: `sm` e `md`. |
| **ConfirmUnsubscribeDialog** | Dialog de confirmação para cancelar inscrição em CreatorPage. Usa UserMinus + variante destrutiva. |
| **ConfirmUnfollowDialog** | Dialog de confirmação para deixar de seguir Profile/Font. Usa EyeOff + variante destrutiva. |
| **activeUser** | Store reativo (`active-user.svelte.ts`) que gerencia identidade ativa (consumer ou creator). Controla nav condicional. API: `init()`, `switchTo()`, `createConsumer()`, `createCreator()`. |
| **ImportService** | Serviço (`import.service.ts`) para importar conteúdo. Dois modos: `importNotfeedJson()` (página completa) e `importSimpleUrls()` (URLs avulsas → Profile standalone). |