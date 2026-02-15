# Notfeed — Visão Geral

## O que é

Notfeed é um cliente de agregação de informação focado em feeds e notificações. Consome dados de múltiplos protocolos (Nostr, RSS, Atom) e os apresenta em uma timeline unificada.

## Princípios

- **Client-side first** — toda lógica roda no dispositivo do usuário; sem backend obrigatório.
- **Profile-centric** — Profiles são a entidade central; tudo gira em torno deles.
- **Protocol-agnostic display** — posts de qualquer fonte são normalizados para um formato canônico antes de exibição.
- **Resiliente e offline-capable** — persistência local, funciona sem conexão.
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

## Escopo do MVP

1. CRUD de Profiles
2. CRUD de Fonts (fontes de dados) vinculadas a Profiles
3. Ingestão de posts via Nostr, RSS e Atom
4. Normalização para Post Canônico
5. Timeline unificada com scroll infinito
6. Marcar posts como lidos
7. PWA instalável com suporte offline básico
