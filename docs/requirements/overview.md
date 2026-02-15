# Notfeed — Visão Geral

## O que é

Notfeed é um cliente de agregação de informação focado em feeds e notificações. Consome dados de múltiplos protocolos (Nostr, RSS, Atom) e os apresenta em uma timeline unificada.

## Princípios

- **Client-side first** — toda lógica roda no dispositivo do usuário; sem backend obrigatório.
- **Dois papéis de usuário** — UserConsumer (consome feeds) e UserCreator (publica CreatorPages).
- **CreatorPage como artefato** — Profiles e Fonts são organizados via CreatorPages publicáveis.
- **Protocol-agnostic display** — posts de qualquer fonte são normalizados para um formato canônico antes de exibição.
- **Resiliente e offline-capable** — persistência local, funciona sem conexão. Export/import JSON para compartilhamento offline.
- **Mobile-first UI** — desenhado para telas pequenas, adaptado para desktop.

## Plataformas-alvo (MVP)

| Plataforma | Tecnologia | Artefato |
|---|---|---|
| Web / PWA | SvelteKit (adapter-static) | Estáticos + Service Worker |
| Android | TWA (Trusted Web Activity) | APK/AAB |
| Windows Desktop | Tauri v2 | `.msi` |
| Linux Desktop | Tauri v2 | `.AppImage` |

## Stack técnico

- **Framework**: SvelteKit (SPA mode, adapter-static)
- **UI**: Tailwind CSS + shadcn-svelte
- **Desktop**: Tauri v2
- **Persistência**: IndexedDB (web) / SQLite (Tauri)
- **Linguagem**: TypeScript

## Entidades do domínio

- **UserConsumer** — conta local de consumo (follows, ativação, categorias custom)
- **UserCreator** — conta de criação (gerencia CreatorPages, sync via Nostr/Blossom)
- **CreatorPage** — artefato publicável com Profiles e Fonts (export JSON offline)
- **Profile** — identidade temática que agrupa Fonts (criável por consumer ou creator)
- **Font** — canal técnico de distribuição (Nostr, RSS, Atom)
- **Category** — taxonomia hierárquica (standard do app + custom do consumer)

## Escopo do MVP

1. Criação de UserConsumer e UserCreator
2. CRUD de CreatorPages (com export/import JSON)
3. CRUD de Profiles (por consumer e creator)
4. CRUD de Fonts vinculadas a Profiles
5. Sistema de Categories (standard + custom)
6. Follows de CreatorPages/Creators (pubkey, QR code, import)
7. Ativação/desativação granular (Page, Profile, Font)
8. Ingestão de posts via Nostr, RSS e Atom
9. Normalização para Post Canônico
10. Timeline unificada com scroll infinito
11. Marcar posts como lidos
12. PWA instalável com suporte offline básico
