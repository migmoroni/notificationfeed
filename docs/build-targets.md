# Notfeed — Build Targets

Este documento descreve os alvos de build do Notfeed, suas características e como produzir cada um. As linhas marcadas como **planejado** são preenchidas pelos planos AB (PWA) e AC (Tauri AppImage); as demais são apenas referência futura (Plano C).

## Matriz de alvos

| Alvo | Comando | Bundle / Output | Storage | Service Worker | Status |
|---|---|---|---|---|---|
| **web (dev)** | `npm run dev` | servidor Vite local (`http://localhost:5173`) | IndexedDB | não emitido em dev | ativo |
| **web (build)** | `npm run build` | `build/` (estáticos `adapter-static`) com `service-worker.js` | IndexedDB | sim — SW nativo do SvelteKit + Workbox precaching | ativo |
| **PWA instalável** | `npm run build` + `npm run preview` | `build/` servido sobre HTTPS, com `manifest.webmanifest` + SW | IndexedDB | sim — SW nativo do SvelteKit (`src/service-worker.ts`) + Workbox precaching | ativo |
| **Tauri Linux AppImage** | `npm run tauri:appimage` | `src-tauri/target/release/bundle/appimage/Notfeed_<version>_amd64.AppImage` | IndexedDB | **não** (gating por `capabilities.platform === 'desktop'` em `+layout.svelte`) | _planejado (Plano AC)_ |

## Future targets (Plano C)

| Alvo | Bundle | Storage | Notas |
|---|---|---|---|
| Tauri Linux (deb / rpm) | `npm run tauri:build -- --bundles deb,rpm` | SQLite (`tauri-plugin-sql`) | Empacotamento nativo com integração ao FS do host. |
| Tauri Windows (msi) | `npm run tauri:build` (em Windows) | SQLite | Requer assinatura para distribuição. |
| Tauri macOS (dmg) | `npm run tauri:build` (em macOS) | SQLite | Requer notarização. |
| Tauri Android (apk/aab) | `npm run tauri:android` | SQLite | Plugin `tauri-plugin-sql` + WebView Android. |

A escolha entre IndexedDB e SQLite é feita em build-time pela env `VITE_STORAGE_BACKEND` e exposta como `Capability.storageBackend`. Ver ADR-033 para o racional.

## Pré-requisitos por alvo

### Web/PWA

- Node.js 20+
- npm 11+

### Tauri AppImage (Linux x86_64)

A serem detalhados pelo Plano AC. Em geral:

- Rust toolchain estável (`rustup default stable`)
- `webkit2gtk-4.1`, `libgtk-3-dev`, `librsvg2-dev`, `libayatana-appindicator3-dev`, `libssl-dev`
- `libfuse2` (para executar a AppImage produzida)

### Future native bundles (Plano C)

Pré-requisitos específicos por plataforma serão adicionados quando o Plano C for executado.
