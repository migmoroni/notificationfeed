# Notfeed — Glossário

| Termo | Definição |
|---|---|
| **UserConsumer** | Conta local de consumo. Segue CreatorPages/Creators, organiza feeds, ativa/desativa entidades. Nunca publica conteúdo. |
| **UserCreator** | Conta de criação. Gerencia CreatorPages, Profiles e Fonts. Pode sincronizar via Nostr/Blossom. |
| **CreatorPage** | Artefato publicável que descreve uma coleção editorial de Profiles e Fonts. Vinculada a um UserCreator. Pode ser exportada como JSON para compartilhamento offline. |
| **Profile** | Identidade temática que agrupa Fonts. Criável por consumer (standalone) ou creator (standalone ou em Page). Pertence a exatamente uma Category sublevel. |
| **Font** | Canal técnico de distribuição vinculado a um Profile. Encapsula a configuração de um protocolo (Nostr, RSS ou Atom). Herda Category do Profile. O nome "Font" vem de "fonte de informação". |
| **Category** | Sistema taxonômico hierárquico. Dois ramos: standard (fixo do app) e custom (livre, criado por consumer). Apenas sublevels são associáveis a entidades. |
| **ConsumerState** | Value object que sobrepõe o `defaultEnabled` do criador para o contexto local do consumer. Permite também organização em categorias custom. |
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
