# Notfeed

Leitor de feeds pessoal e offline-first. Agrega conteúdo de múltiplos protocolos (RSS, Atom, Nostr) em uma timeline unificada com priorização, favoritos e taxonomia editável.

**Stack**: SvelteKit · Svelte 5 · TypeScript · Tailwind 4 · IndexedDB · Tauri (futuro)

## Executando

```sh
npm install
npm run dev
```

## Scripts

| Comando | Descrição |
|---------|-----------|
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Build de produção (emite `service-worker.js` e `manifest.webmanifest`) |
| `npm run preview` | Preview do build |
| `npm run check` | Checagem de tipos (svelte-check) |
| `npm run test:run` | Testes unitários (vitest) |
| `npm run icons:gen` | Regenera ícones PWA a partir de `static/icons/source.svg` |

## Run targets

### Web / PWA

```sh
npm run build
npm run preview   # serve com SW ativo em http://localhost:4173
```

Em produção, o app é instalável como PWA: o navegador detecta `manifest.webmanifest` + service worker e oferece "Instalar app" (ou via menu do Chrome/Edge). Após instalado, navega offline (assets pré-cacheados; SPA fallback servido pelo SW).

### Tauri (Linux AppImage)

Pré-requisitos: Rust stable + pacotes `-dev` do sistema (veja [`docs/build-targets.md`](docs/build-targets.md)).

```sh
npm run tauri:dev          # janela nativa em modo dev (HMR)
npm run tauri:appimage     # produz src-tauri/target/release/bundle/appimage/Notfeed_<version>_amd64.AppImage
```

Em runtime Tauri, o service worker **não** é registrado (gating por `capabilities.platform === 'desktop'` em `+layout.svelte`); IndexedDB é usado para persistência. SQLite via `tauri-plugin-sql` está reservado para Plano C.

## Documentação

Detalhes de arquitetura, domínio e regras de negócio em [`docs/`](docs/).
