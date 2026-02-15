# Notfeed — Glossário

| Termo | Definição |
|---|---|
| **Profile** | Identidade do usuário dentro do Notfeed. Agrega múltiplas Fonts. Um usuário pode ter vários Profiles (ex: "Pessoal", "Trabalho"). |
| **Font** | Fonte de dados vinculada a um Profile. Encapsula a configuração de um protocolo específico (Nostr, RSS ou Atom). O nome "Font" vem de "fonte de informação", não de tipografia. |
| **Post Canônico** | Representação normalizada e protocol-agnostic de um item de feed. Todo dado ingerido é convertido para este formato antes de persistência e exibição. |
| **Ingestão** | Processo de buscar dados brutos de uma Font (via WebSocket para Nostr, HTTP para RSS/Atom). |
| **Normalização** | Transformação de dados brutos (Nostr event, RSS item, Atom entry) para o formato de Post Canônico. |
| **Persistência** | Armazenamento local de dados (Profiles, Fonts, Posts) em IndexedDB ou SQLite. |
| **Capability** | Feature flag booleana que indica se uma funcionalidade está disponível na plataforma atual (ex: `hasTray`, `hasPush`). |
| **PWA** | Progressive Web App — site instalável com suporte offline via Service Worker. |
| **TWA** | Trusted Web Activity — wrapper Android que exibe uma PWA em tela cheia sem barra de endereço. |
| **Tauri** | Framework para criar aplicações desktop nativas usando web technologies + Rust. |
| **Relay** | Servidor Nostr que armazena e retransmite eventos. Fonts Nostr se conectam a relays via WebSocket. |
